/**
 * @typedef Watcher
 * @prop {ScriptApp.Trigger} trigger
 * @prop {Calendar_v3.Calendar.V3.Schema.Channel} [channel]
 */

class WatcherManager_{
  /** @private */
  static get channelSymbol (){ 
    return 'channel'
  }
  /** @private */
  static get triggerIdSymbol (){ 
    return 'trigger'
  }
  /** @private */
  static get props (){ 
    return PropertiesService.getScriptProperties()
  }

  static get settings(){
    return getWatcherSettings_()
  }

  static watcherIsActive(){
    const {channel, trigger} = WatcherManager_.getWatcher()
    return !!(channel || trigger)
  }

  /**
   * @private
   * @return {Partial<Watcher>}
   */
  static getWatcher(){
    /** @type {Calendar_v3.Calendar.V3.Schema.Channel} */
    const channel = JSON.parse(WatcherManager_.props.getProperty(WatcherManager_.channelSymbol))
    const triggerId = WatcherManager_.props.getProperty(WatcherManager_.triggerIdSymbol)
    const trigger = ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() === triggerId)
    return  {
      channel:channel,
      trigger:trigger
    }
  }

  /** 
   * @param {string} sourceCalendarId
   * @param {string} targetCalendarId
   * @param {string} [scriptUrl]
   */
  static updateSettings(sourceCalendarId, targetCalendarId, scriptUrl){
    WatcherManager_.settings.update(sourceCalendarId, targetCalendarId, scriptUrl)
  }

  static clearSettings(){
    WatcherManager_.settings.clearSettings()
  }

  static createWatcher(){
    const settings = WatcherManager_.settings
    let watcher;
    if(settings.hasChannelEndpoint()){
      watcher = watchViaChannel_(settings.getSourceCalendarId(), settings.getChannelEndpoint())
    }else{
      watcher = watchViaTrigger_(settings.getSourceCalendarId())
    } 
    WatcherManager_.saveWatcher(watcher)
  }
  
  /**
   * @private
   * @param {Watcher} watcher
   */
  static saveWatcher(watcher){
    watcher.channel && WatcherManager_.props.setProperty(WatcherManager_.channelSymbol, JSON.stringify(watcher.channel))
    WatcherManager_.props.setProperty(WatcherManager_.triggerIdSymbol, watcher.trigger.getUniqueId())
  }

  static removeWatcher(){
    const {channel, trigger} = WatcherManager_.getWatcher()
    if(channel){
      try{
        console.log(`Stopping channel:\n${JSON.stringify(channel)}`)
        Calendar.Channels.stop(channel)
      }catch(err){
        console.warn(err)
      }finally{
        console.log(`Removing reference to saved channel:\n${JSON.stringify(channel)}`)
        WatcherManager_.props.deleteProperty(WatcherManager_.channelSymbol)
      }
    }
    if(trigger){
      try{
        console.log(`Removing trigger with id:${trigger.getUniqueId()}`)
        ScriptApp.deleteTrigger(trigger)
      }catch(err){
        console.warn(err)
      }finally{
        console.log(`Removing reference to saved trigger with id:${trigger.getUniqueId()}`)
        WatcherManager_.props.deleteProperty(WatcherManager_.triggerIdSymbol)
      }
    }
  }
}