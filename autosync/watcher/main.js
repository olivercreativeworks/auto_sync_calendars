class WatcherManager_{
  static createWatcher(){
    const watcher = WatcherManager_.hasChannelEndpoint() ? 
      WatcherManager_.createChannelWatcher() : 
      WatcherManager_.createTriggerWatcher()      
    WatcherManager_.props.watcher.setWatcher(watcher)
  }
  /** @private */
  static hasChannelEndpoint(){
    return !!(WatcherManager_.settings.channelEndpoint)
  }

  /** @private */
  static get settings(){
    return WatcherManager_.props.settings.getSettings()
  }

  /** @private */
  static get props(){
    return getWatcherProps()
  }

  static createChannelWatcher(){
    const settings = WatcherManager_.settings
    return watchViaChannel_(settings.sourceCalendarId, refreshChannelWatcher_.name, settings.channelEndpoint)
  }

  static createTriggerWatcher(){
    const settings = WatcherManager_.settings
    return watchViaTrigger_(settings.sourceCalendarId, performCalendarSync_.name)
  }

  /** @private */
  static get watcher(){
    return WatcherManager_.props.watcher.getWatcher()
  }

  static removeWatcher(){
    WatcherManager_.props.watcher.deleteWatcher()
  }

  static watcherIsActive(){
    return !!(WatcherManager_.watcher)
  }

  /** 
   * @param {string} sourceCalendarId
   * @param {string} targetCalendarId
   * @param {string} [channelEndpoint] Optional. The endpoint you want a channel to send a post request to when a change occurs in the calendar.
   */
  static updateSettings(sourceCalendarId, targetCalendarId, channelEndpoint){
    WatcherManager_.props.settings.setSettings({sourceCalendarId, targetCalendarId, channelEndpoint})
  }

  static clearSettings(){
    WatcherManager_.props.settings.deleteSettings()
  }
}
/**
 * This is used in a trigger function, so it's in the global scope. 
 */
function refreshChannelWatcher_(){
  WatcherManager_.removeWatcher()
  WatcherManager_.createWatcher()
}

/**
 * This is used in a trigger function, so it's in the global scope. 
 */
function performCalendarSync_(){
  const {sourceCalendarId, targetCalendarId} = getWatcherProps().settings.getSettings() 
  console.log(`Syncing:\nSource: ${sourceCalendarId}\nTarget: ${targetCalendarId}`)
  try{
    syncCalendars(sourceCalendarId, targetCalendarId)
  }catch(err){
    console.error(`Error occured while syncing calendars:\nSource calendar: ${sourceCalendarId}\nTarget calendar: ${targetCalendarId}`)
    throw err
  }
}

function doPost(e){
  const logger = getLogger_()
  try{
    updateGlobalLog(logger.write) // update the log so syncCalendars uses our logging function to log messages
    performCalendarSync_()
  }catch(err){
    logger.write(err)
  }finally{
    logger.commit()
  }
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}
