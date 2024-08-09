/**
 * @typedef Watcher
 * @prop {ScriptApp.Trigger} trigger
 * @prop {Calendar_v3.Calendar.V3.Schema.Channel} [channel]
 */

/**
 * Manages automatic calendar sync via a watcher. A watcher is either a channel + a script trigger to refresh the channel, or a script trigger.
 */
const AutoSync = (() => {
  const channelSymbol = 'channel'
  const triggerIdSymbol = 'trigger'
  const props = PropertiesService.getScriptProperties()
  const settings = getSettings()
  return {
    /**
     * @param {string} sourceCalendarId
     * @param {string} targetCalendarId
     * @param {string} [scriptUrlOptional] - If you provide a url, the watcher will be a channel + script trigger to refresh the channel. Otherwise the watcher will be a script trigger.
     */
    start: (sourceCalendarId, targetCalendarId, scriptUrlOptional) => {
      settings.update(sourceCalendarId, targetCalendarId, scriptUrlOptional)
      stop_()
      start_()
    },
    stop: () => {
      settings.clearSettings()
      stop_()
    },
    settings: {
      getChannelEndpoint: () => settings.getChannelEndpoint(),
      getSourceCalendarId: () => settings.getSourceCalendarId(),
      getTargetCalendarId: () => settings.getTargetCalendarId(),
      hasChannelEndpoint: () => settings.hasChannelEndpoint()
    },
  }

  /**
   * Returns the config for the script, including saved source calendar id, target calendar id and script url. These settings are used to run the script automatically.
   */
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
      },
      clearSettings: () => {
        props.deleteProperty(urlSymbol)
        props.deleteProperty(sourceIdSymbol)
        props.deleteProperty(targetIdSymbol)
      }
    }
  }
  /**
   * Starts the watcher.
   */
  function start_(){
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
    console.log('Watcher is active.')
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
   * Creates a watcher that uses a channel and trigger
   */
  function watchViaChannel(calendarId, url, timeToLive){
    const channel = createChannel(calendarId, url, timeToLive)
    const trigger = createChannelRefreshTrigger(channel)
    saveWatcher({trigger, channel})
    console.log(`Watching calendar with id ${calendarId}.`)
  }

  /** 
   * Creates a channel that sends a POST request to the url each time a change is made to the calendar with the input id.
   * 
   * For info on channels: see https://developers.google.com/calendar/api/v3/reference/events/watch and https://developers.google.com/calendar/api/v3/reference/channels
   * 
   * @param {string} calendarId 
   * @param {string} url 
   * @param {number} [timeToLive] How long the channel will live in seconds. Default is 604800 seconds, or 7 days.
   */
  function createChannel(calendarId, url, timeToLive){
    /** 
     * This is a resource to be used in a Calendar.Events.watch request body see: {@link https://developers.google.com/calendar/api/v3/reference/events/watch#request-body} 
     */
    const resource={
      address: url,
      id: Utilities.getUuid(),
      type: 'web_hook',
      params:{
        ttl: timeToLive || 604800
      }
    }
    return Calendar.Events.watch(resource, calendarId)
  }

  /** @param {Calendar_v3.Calendar.V3.Schema.Channel} channel */
  function createChannelRefreshTrigger(channel){
    console.log('Creating a new watcher (with channel and trigger)')
    return ScriptApp.newTrigger(refreshAutoSync.name)
      .timeBased()
      .atHour(0)
      .everyDays(getLifespanInDays(channel) - 1)
      .create()
  }

  /**
   * @param {Calendar_v3.Calendar.V3.Schema.Channel} channel
   */
  function getLifespanInDays(channel){
    const millisecondsInADay = (1000 * 60 * 60 * 24)
    const dateDiffInMilliseconds = new Date(Number(channel.expiration)) - new Date()
    return Math.ceil(dateDiffInMilliseconds/ millisecondsInADay) 
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

  /**
   * Stops the watcher 
   */
  function stop_(){
    const {channel, trigger} = getWatcher()
    if(channel){
      try{
        console.log(`Stopping channel:\n${JSON.stringify(channel)}`)
        Calendar.Channels.stop(channel)
      }catch(err){
        console.warn(err)
      }finally{
        console.log(`Removing reference to saved channel:\n${JSON.stringify(channel)}`)
        props.deleteProperty(channelSymbol)
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
        props.deleteProperty(triggerIdSymbol)
      }
    }
    console.log('Watcher is stopped.')
  }
})()

/**
 * This is used in a trigger function, so it's placed in the global scope. 
 */
function refreshAutoSync(){
  AutoSync.stop()
  AutoSync.activate()
}

/**
 * This is used in a trigger function, so it's placed in the global scope.
 */
function performCalendarSync(){
  const sourceCalendarId = AutoSync.settings.getSourceCalendarId()
  const targetCalendarId = AutoSync.settings.getTargetCalendarId()
  console.log(`Syncing:\nSource: ${sourceCalendarId}\nTarget: ${targetCalendarId}`)
  try{
    syncCalendars(AutoSync.settings.getSourceCalendarId(), AutoSync.settings.getTargetCalendarId())
  }catch(err){
    console.error(`Error occured while syncing calendars:\nSource calendar: ${sourceCalendarId}\nTarget calendar: ${targetCalendarId}`)
    throw err
  }
}

function doPost(e){
  const sourceCalendarId = AutoSync.settings.getSourceCalendarId()
  const targetCalendarId = AutoSync.settings.getTargetCalendarId()
  const log = getLog()
  try{
    syncCalendars(sourceCalendarId, targetCalendarId, {}, log.write)
  }catch(err){
    log.write(err)
  }finally{
    log.commit()
  }
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}



