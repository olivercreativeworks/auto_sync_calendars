/**
 * @typedef Watcher
 * @prop {ScriptApp.Trigger} trigger
 * @prop {Calendar_v3.Calendar.V3.Schema.Channel} [channel]
 */

/**
 * Manages automatic calendar sync via a watcher. A watcher is either a channel + a script trigger to refresh the channel, or a script trigger.
 * Start by updating the settings to store the ids of the calendars you want to monitor (use AutoSync.settings.update)
 */
const AutoSync = (() => {
  const channelSymbol = 'channel'
  const triggerIdSymbol = 'trigger'
  const props = PropertiesService.getScriptProperties()
  const settings = getSettings()
  return {
    settings,
    activate,
    stop,
  }

  function getSettings(){
    const urlSymbol = 'url'
    const sourceIdSymbol = 'sourceCalendarId'
    const targetIdSymbol = 'targetCalendarId'
    return {
      getChannelEndpoint:() => props.getProperty(urlSymbol),
      getSourceCalendarId:() => props.getProperty(sourceIdSymbol),
      getTargetCalendarId:() => props.getProperty(targetIdSymbol),
      hasChannelEndpoint:() => !!(props.getProperty(urlSymbol)),
      /** 
       * @param {string} sourceCalendarId
       * @param {string} targetCalendarId
       * @param {string} [scriptUrl]
       */
      update:(sourceCalendarId, targetCalendarId, scriptUrl) => {
        if(!sourceCalendarId || !targetCalendarId){
          throw new Error('Source and target calendar ids are required')
        }
        props.setProperties({
          [sourceIdSymbol]: sourceCalendarId,
          [targetIdSymbol]: targetCalendarId,
          [urlSymbol]: scriptUrl
        })
        if(!scriptUrl) props.deleteProperty(urlSymbol)
        console.log('Settings are updated')
      }
    }
    updateSyncSettings(sourceCalendarId, targetCalendarId, scriptUrl)
    createAutoSyncTrigger()
    console.log('Auto sync is active.')
  }

  /** 
   * @param {string} sourceCalendarId
   * @param {string} targetCalendarId
   * @param {string} [scriptUrl]
   */
  function updateSyncSettings(sourceCalendarId, targetCalendarId, scriptUrl){
    CalendarIdManager.setSource(sourceCalendarId)
    CalendarIdManager.setTarget(targetCalendarId)
    ScriptUrlManager.updateUrl(scriptUrl)
  }

  function autoSyncIsActive(){
    const triggerId = props.getProperty(triggerSymbol)
    return ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() == triggerId) !== undefined
  }

  function createAutoSyncTrigger(){
    removeExistingTrigger()
    const trigger = createTrigger()
    saveTriggerId(trigger.getUniqueId())
  }

  function removeExistingTrigger(){
    const triggerId = getAutoSyncTriggerId()
    ScriptApp.getProjectTriggers()
      .filter(trigger => trigger.getUniqueId() === triggerId)
      .forEach(trigger => ScriptApp.deleteTrigger(trigger))
    deleteTriggerId()
  }

  function getAutoSyncTriggerId(){
    return props.getProperty(triggerSymbol)
  }

  function deleteTriggerId(){
    props.deleteProperty(triggerSymbol)
  }
  
  function createTrigger(){
    return ScriptUrlManager.hasUrl() ? createWatcherTrigger() : createDirectTrigger()
  }
  
  /**
   * Sets up the auto sync using a watcher and script url.
   */
  function createWatcherTrigger(){
    // Activate the watcher right away, then set up a trigger to automatically reactivate the watcher.
    // The watcher's default lifespan is 7 days. We will reset it on day 6 so there's no gaps.
    activateWatcher()
    return ScriptApp.newTrigger(activateWatcher.name)
      .timeBased()
      .atHour(0)
      .everyDays(6) 
      .create()
  }

  /**
   * Sets up the auto sync directly, without using a watcher or script url.
   */
  function createDirectTrigger(){
    return ScriptApp.newTrigger(performCalendarSync.name)
      .forUserCalendar(CalendarIdManager.getSourceCalendarId())
      .onEventUpdated()
      .create()
  }
  
  /** @prop {string} triggerId */
  function saveTriggerId(triggerId){
    props.setProperty(triggerSymbol, triggerId)
  }

  function disableAutoSync(){
    if(!autoSyncIsActive()){
      console.warn('Auto sync is already disabled')
      return
    }
    disableAutoSync()
    removeExistingTrigger()
    console.log('Auto sync is disabled.')
  }

  /**
   * @return {Partial<Watcher>}
   */
  function getWatcher(){
    /** @type {Calendar_v3.Calendar.V3.Schema.Channel} */
    const channel = JSON.parse(props.getProperty(channelSymbol))
    const triggerId = props.getProperty(triggerIdSymbol)
    const trigger = ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() === triggerId)
    return  {
      channel:channel,
      trigger:trigger
    }
  }

  /** 
   * @param {string} calendarId 
   * @param {string} url 
   */
  function resetWatcher(calendarId, url){
    stopWatchingCalendar()
    startWatchingCalendar(calendarId, url)
  }

  function stopWatchingCalendar(){
    const watcher = getWatcher()
    if(!watcher) return
    console.log(`Stopping watcher:\n${JSON.stringify(watcher)}`)
    Calendar.Channels.stop(watcher)
    props.deleteProperty(watcherSymbol)
  }

  /** @return {Calendar_v3.Calendar.V3.Schema.Channel} */
  function getWatcher(){
    return JSON.parse(props.getProperty(watcherSymbol))
  }

  /** 
   * @param {string} calendarId 
   * @param {string} url 
   */
  function startWatchingCalendar(calendarId, url){
    // see: https://developers.google.com/calendar/api/v3/reference/events/watch#request-body
    const resource={
      address: url,
      id: Utilities.getUuid(),
      type: 'web_hook',
      params:{
        ttl: 604800 // time to live in seconds. 604800 seconds is 7 days.
      }
    }
    saveWatcher(Calendar.Events.watch(resource, calendarId))
    console.log(`Watching calendar with id ${calendarId}.`)
  }


  /**
   * @param {Watcher} watcher
   */
  function saveWatcher(watcher){
    watcher.channel && props.setProperty(channelSymbol, JSON.stringify(watcher.channel))
    props.setProperty(triggerIdSymbol, watcher.trigger.getUniqueId())
  }

  /**
   * Creates a watcher that uses a trigger
   * @param {string} sourceCalendarId
   */
  function watchViaTrigger(sourceCalendarId){
    const trigger = ScriptApp.newTrigger(performCalendarSync.name)
      .forUserCalendar(sourceCalendarId)
      .onEventUpdated()
      .create()
    saveWatcher({trigger})
  }
})()

const ScriptUrlManager = (() => {
  const urlSymbol = 'url'
  const props = PropertiesService.getScriptProperties()
  return {
    getScriptUrl:() => props.getProperty(urlSymbol),
    updateUrl:(url) => url ? props.setProperty(urlSymbol, url) :  props.deleteProperty(urlSymbol),
    hasUrl: () => !!(props.getProperty(urlSymbol))
  }
})()

/**
 * Syncs the calendars based on the ids in the CalendarIdManager. You can populate the CalendarIdManager by running the startAutoSync function in main.
 * 
 * This is used in a trigger function, so it's placed in the global scope.
 */
function performCalendarSync(){
  syncCalendars(CalendarIdManager.getSourceCalendarId(), CalendarIdManager.getTargetCalendarId())
}

/**
 * The url that the watcher sends the POST request to. Upon receiving the POST request, this calls the function that actually performs the calendar sync.
 */
function doPost(e){
  performCalendarSync()
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}

