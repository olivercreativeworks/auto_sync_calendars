function getWatcherProps(){
  const store = PropStore()
  const watcherKey = 'watcherProps'
  return{
    settings: {
      setSettings:setSettings,
      deleteSettings:deleteSettings,
      getSettings:getSettings,
    },
    watcher:{
      getWatcher:getWatcher,
      deleteWatcher:deleteWatcher,
      setWatcher:setWatcher
    }
  }

  /** @param {Partial<WatcherProps>} props */
  function updateProps(props){
    return store.updateProp(watcherKey, props)
  }
  /** @return {WatcherProps} */
  function getProps(){
    return store.getProp(watcherKey)
  }

  /** 
   * @param {WatcherSettings} settings 
   */
  function setSettings(settings){
    if(!settings.sourceCalendarId || !settings.targetCalendarId){
      throw new Error(`Source and target calendar ids are required.\nYour input:\n${JSON.stringify(settings)}`)
    }
    return updateProps({settings}).settings
  }

  /** Clears settings for targetCalendarId, sourceCalendarId and channelEndpoint */
  function deleteSettings(){
    updateProps({settings:undefined})
  }

  /** 
   * Returns null if there are no settings
   * @return {WatcherSettings} 
   */
  function getSettings(){
    return getProps()?.settings
  }

  /** Stops the active channel (if any) and removes any active triggers for the watcher */
  function deleteWatcher(){
    const watcher = getWatcher() || {}
    if(watcher.channel){ removeChannel(watcher.channel) }
    if(watcher.trigger){ removeTrigger(watcher.trigger) }
    updateProps({watcherDetails: undefined})
  }

  /** 
   * Saves a watcher's details to the property store
   * @param {Watcher} watcher
   */
  function setWatcher(watcher){
    /** @type {WatcherDetails} */
    const watcherDetails = {
      channel:watcher.channel, 
      triggerId:watcher.trigger.getUniqueId()
    }
    return updateProps({watcherDetails}).watcherDetails
  }

  /** 
   * Retrieves a saved watcher. Returns null if no watcher is found.
   * @return {Watcher} 
   */
  function getWatcher(){
    const watcherDetails = getProps()?.watcherDetails
    if(!watcherDetails) return
    return {
      channel:watcherDetails.channel,
      trigger:ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() === watcherDetails.triggerId)
    }
  }

  /** @param {Calendar_v3.Calendar.V3.Schema.Channel} channel */
  function removeChannel(channel){
    try{
      console.log(`Stopping channel:\n${JSON.stringify(channel)}`)
      Calendar.Channels.stop(channel)
    }catch(err){
      console.warn(err)
    }
  }
  /** @param {ScriptApp.Trigger} trigger */
  function removeTrigger(trigger){
    try{
      console.log(`Removing trigger with id:${trigger.getUniqueId()}`)
      ScriptApp.deleteTrigger(trigger)
    }catch(err){
      console.warn(err)
    }
  }
}