function autoSyncManager(){
  const triggerSymbol = 'trigger'
  const props = PropertiesService.getScriptProperties()
  return {
    activate:() => {
      if(autoSyncIsActive()){
        console.warn('Auto sync is already active.')
        return
      }
      if(CONFIG.scriptUrl){ 
        activateWatcher() 
      }
      createAutoSyncTrigger()
      console.log('Auto sync is active.')
    },
    disable: () => {
      if(!autoSyncIsActive()){
        console.warn('Auto sync is already disabled')
        return
      }
      disableAutoSync()
      removeAutoSyncTrigger()
      console.log('Auto sync is disabled.')
    },
  }

  function autoSyncIsActive(){
    const triggerId = props.getProperty(triggerSymbol)
    return ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() == triggerId) !== undefined
  }

  function saveTriggerId(triggerId){
    props.setProperty(triggerSymbol, triggerId)
  }

  function removeAutoSyncTrigger(){
    disableAutoSync()
    const triggerId = getAutoSyncTriggerId()
    ScriptApp.getProjectTriggers()
      .filter(trigger => trigger.getUniqueId() === triggerId)
      .forEach(trigger => ScriptApp.deleteTrigger(trigger))
  }

  /**
   * Stops the watcher so this script will no longer be notified when a change is made to the source calendar. 
   */
  function disableAutoSync(){
    getCalendarWatcher().stopWatching()
  }

  function getAutoSyncTriggerId(){
    return props.getProperty(triggerSymbol)
  }

}

/**
 * Creates a watcher that alerts this script's url whenever a change is made to the source calendar. Update the source calendar id in the Config.gs file.
 * 
 * This is used in a trigger function, so it's placed in the global scope.
 */
function activateWatcher(){
  getCalendarWatcher().beginWatching(CONFIG.sourceCalendarId, CONFIG.scriptUrl)
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
    const resource= {
      address: url,
      id: Utilities.getUuid(),
      type: 'web_hook'
    }
    saveWatcher(Calendar.Events.watch(resource, calendarId))
    console.log(`Watching calendar with id ${calendarId}.`)
  }

  /** @param {Calendar_v3.Calendar.V3.Schema.Channel} watcher */
  function saveWatcher(watcher){
    console.log(`Saving watcher:\n${watcher}`)
    props.setProperty(watcherSymbol, JSON.stringify(watcher))
  }

  /**
   * ScriptApp.getService().getUrl() does not return the correct /exec url when called from a time based trigger. So we need to store the url ourselves and retrieve it.
   */
  function getScriptUrl(){
    return CONFIG.scriptUrl
  }
}

/**
 * The url that the watcher sends the POST request to. doPost calls the function that actually performs the calendar sync based on the calendar ids set in the Config.gs file.
 */
function doPost(e){
  syncCalendars(CONFIG.sourceCalendarId, CONFIG.targetCalendarId)
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}


