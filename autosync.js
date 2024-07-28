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
  }
  /**
   * Starts the watcher.
   */
  function activate(){
    const {channel, trigger} = getWatcher()
    if(channel || trigger){
      console.warn('Watcher is already active')
      return
    }
    if(settings.hasChannelEndpoint()){
      watchViaChannel(settings.getSourceCalendarId(), settings.getChannelEndpoint())
    }else{
      watchViaTrigger(settings.getSourceCalendarId())
    }
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

