/**
 * @typedef Watcher
 * @prop {ScriptApp.Trigger} trigger
 * @prop {Calendar_v3.Calendar.V3.Schema.Channel} [channel]
 */

/**
 * Manages automatic calendar sync via a watcher. A watcher is either a channel + a script trigger to refresh the channel, or a script trigger.
 * How to use: 
    1) Use AutoSync.settings.update and input your calendar ids and optional script url.
    2) Run AutoSync.activate to start automatically syncing the calendars. Whenever a change happens on the source calendar, it will show up on the target calendar.
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
   * Stops the watcher.
   */
  function stop(){
    const {channel, trigger} = getWatcher()
    if(!channel && !trigger){
      console.warn('There is no active watcher')
      return
    }
    if(channel){
      console.log(`Stopping channel:\n${JSON.stringify(channel)}`)
      Calendar.Channels.stop(channel)
      props.deleteProperty(channelSymbol)
      console.log(`Stopped channel`)
    }
    if(trigger){
      console.log(`Removing trigger with id:${trigger.getUniqueId()}`)
      ScriptApp.deleteTrigger(trigger)
      props.deleteProperty(triggerIdSymbol)
      console.log(`Removed trigger`)
    }
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
  syncCalendars(sourceCalendarId, targetCalendarId)
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}

