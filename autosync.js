function autoSyncManager(){
  const triggerSymbol = 'trigger'
  const props = PropertiesService.getScriptProperties()
  return {
    activate:activate, 
    disable:disable 
  }

  /** 
   * @param {string} sourceCalendarId
   * @param {string} targetCalendarId
   * @param {string} [scriptUrl] The url for this web app. Optional. If provided, the autoSync will use a watcher that triggers a sync through POST requests that are sent whenever the source calendar is updated.
   */
  function activate(sourceCalendarId, targetCalendarId, scriptUrl){
    if(autoSyncIsActive()){
      console.warn('Auto sync is already active.')
      return
    }
    updateSyncSettings(sourceCalendarId, targetCalendarId, scriptUrl)
    createAutoSyncTrigger()
    console.log('Auto sync is active.')
  }

  function updateSyncSettings(sourceCalendarId, targetCalendarId, scriptUrl){
    getCalendarIdManager().setSource(sourceCalendarId)
    getCalendarIdManager().setTarget(targetCalendarId)
    getScriptUrlManager().updateUrl(scriptUrl)
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
    return getScriptUrlManager().hasUrl() ? createWatcherTrigger() : createDirectTrigger()
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
      .forUserCalendar(getCalendarIdManager().getSourceCalendarId())
      .onEventUpdated()
      .create()
  }
  
  /** @prop {string} triggerId */
  function saveTriggerId(triggerId){
    props.setProperty(triggerSymbol, triggerId)
  }

  function disable(){
    if(!autoSyncIsActive()){
      console.warn('Auto sync is already disabled')
      return
    }
    disableAutoSync()
    removeExistingTrigger()
    console.log('Auto sync is disabled.')
  }

  /**
   * Stops the watcher so this script will no longer be notified when a change is made to the source calendar. 
   */
  function disableAutoSync(){
    getCalendarWatcher().stopWatching()
  }
}

/**
 * Creates a watcher that alerts the scriptUrl whenever a change is made to the source calendar. Update the source calendar id and url saved when you run the activate method of autosync manager.
 * 
 * This is used in a trigger function, so it's placed in the global scope. 
 */
function activateWatcher(){
   getCalendarWatcher()
      .beginWatching(getCalendarIdManager().getSourceCalendarId(), getScriptUrlManager().getScriptUrl())
}

/**
 * Manages starting and stopping watchers (i.e. channels)
 * @link {see: https://developers.google.com/calendar/api/v3/reference/events/watch}
 * @link {see: https://developers.google.com/calendar/api/v3/reference/channels}
 */
function getCalendarWatcher(){
  const watcherSymbol = 'watcher'
  const props = PropertiesService.getScriptProperties()
  return {
    /** 
     * Starts a watcher that will send a POST request the input url when there are changes to the calendar with the specified calendarId.
     * @param {string} calendarId
     * @param {string} url The url where the POST request should be sent.
     */
    beginWatching: (calendarId, url) => resetWatcher(calendarId, url),
    /**
     * Stops the active watcher.
     */
    stopWatching: () => stopWatchingCalendar()
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

  /** @param {Calendar_v3.Calendar.V3.Schema.Channel} watcher */
  function saveWatcher(watcher){
    console.log(`Saving watcher:\n${watcher}`)
    props.setProperty(watcherSymbol, JSON.stringify(watcher))
  }
}

function getCalendarIdManager(){
  const sourceIdSymbol = 'sourceCalendarId'
  const targetIdSymbol = 'targetCalendarId'
  const props = PropertiesService.getScriptProperties()
  return {
    getSourceCalendarId: () => props.getProperty(sourceIdSymbol),
    getTargetCalendarId: () => props.getProperty(targetIdSymbol),
    setSource: (id) => props.setProperty(sourceIdSymbol, id), 
    setTarget: (id) => props.setProperty(targetIdSymbol, id),
  }
}

function getScriptUrlManager(){
  const urlSymbol = 'url'
  const props = PropertiesService.getScriptProperties()
  return {
    getScriptUrl:() => props.getProperty(urlSymbol),
    updateUrl:(url) => url ? props.setProperty(urlSymbol, url) :  props.deleteProperty(urlSymbol),
    hasUrl: () => !!(props.getProperty(urlSymbol))
  }
}

/**
 * The url that the watcher sends the POST request to. doPost calls the function that actually performs the calendar sync based on the calendar ids set in the Config.gs file.
 */
function doPost(e){
  syncCalendarsBasedOnConfig()
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}


