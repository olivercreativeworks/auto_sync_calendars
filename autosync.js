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
    logToSpreadsheet(createChannelRefreshTrigger.name).write('Creating a new watcher (with channel and trigger)')
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
  try{
    const sourceCalendarId = AutoSync.settings.getSourceCalendarId()
    const targetCalendarId = AutoSync.settings.getTargetCalendarId()
    syncCalendars(sourceCalendarId, targetCalendarId, logToSpreadsheet().write)
  }catch(err){
    logToSpreadsheet().write(err)
    throw err
  }
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}

/**
 * Returns a logger that writes log messages to a spreadsheet. The messages are written on a delay.
 * 
 * This is used in a trigger function, so it's placed in the global scope. 
 */
function logToSpreadsheet(){
  const props = PropertiesService.getScriptProperties()
  const ssIdSymbol = 'spreadsheet'
  const sheetIdSymbol = 'sheet'
  const messagesSymbol = 'messages'
  const messageTriggerIdSymbol = 'messageTrigger'

  // It is important to remove the trigger then log the messages and clear the queue (not the other way around)
  // This is to guard against the possibility of a message being written after the trigger is removed. This would result in the message never being cleared.
  removeLogTrigger()
  logMessagesFromQueue()
  clearMessageQueue()

  /** @param {string | Error} message */
  return {
    write:(message) => {
      addMessageToQueue(message)
      // Lock off the check for a trigger and creating a trigger to prevent race conditions
      // For example, without the lock, it's possible that concurrent invokations of this script create log triggers at the same time which wind up overwriting one another.
      // This can happen when multiple checks hit the if check at the same time, see that a trigger hasn't been found, and then both attempt to create a log trigger at the same time. When that happens, we'll lose a reference to all but one of the triggers and be unable remove those extra triggers later.
      const lock = LockService.getScriptLock()
      const success = lock.tryLock(1000)
      if(success && logTriggerNotFound()){
        console.log('No trigger exists. Creating new trigger')
        createLogTrigger()
      }
      lock.releaseLock()
    },
    getSpreadsheetUrl: () => getSpreadsheet().getUrl()
  }

  function logTriggerNotFound(){
    return !(getLogTrigger())
  }

  function logMessagesFromQueue(){
    const messages = getMessages()
    if(!messages) return 
    logToSheet(messages)
    return
  }
  /**
   * Returns null if there are no messages. 
   * @return {[string, string][]} - A date as a string and a message
   */
  function getMessages(){
    return JSON.parse(props.getProperty(messagesSymbol))
  }

  /** @param {[string, string][]} messages */
  function logToSheet(messages){
    const lock = LockService.getScriptLock()
    const success = lock.tryLock(1000)
    if(!success){throw new Error('Took too long.')}
    const sheet = getLoggingSheet()
    sheet.getRange(sheet.getLastRow() + 1, 1, messages.length, 2)
      .setValues(messages)
    SpreadsheetApp.flush()
    lock.releaseLock()
  }

  function getLoggingSheet(){
    const spreadsheet = getSpreadsheet()
    const sheetId = JSON.parse(props.getProperty(sheetIdSymbol))
    return spreadsheet.getSheets().find(sheet => sheet.getSheetId() === sheetId) || createLoggingSheet(spreadsheet)
  }
  function getSpreadsheet(){
    const id = props.getProperty(ssIdSymbol)
    const sheet = id ? SpreadsheetApp.openById(id) : createNewSpreadsheet()
    console.log(sheet.getUrl())
    return sheet
  }
  function createNewSpreadsheet(){
    const ss = SpreadsheetApp.create('Auto sync calendars - logs')
    props.setProperty(ssIdSymbol, ss.getId())
    createLoggingSheet(ss)
    return ss
  }
  /** @param {SpreadsheetApp.Spreadsheet} spreadsheet */
  function createLoggingSheet(spreadsheet){
    const sheet = spreadsheet.insertSheet('Logs', 0)
    props.setProperty(sheetIdSymbol, JSON.stringify(sheet.getSheetId()))
    return sheet
  }
  function clearMessageQueue(){
    props.deleteProperty(messagesSymbol)
  }

  /**
   * Creates a trigger that runs this logger function after a delay so the saved log messages can bewritten to the spreadsheet.
   */
  function createLogTrigger(){
    const trigger = ScriptApp.newTrigger(logToSpreadsheet.name)
      .timeBased()
      .after(minutesToMilliseconds(7))
      .create()
    console.log(`Created log trigger with id ${trigger.getUniqueId()}`)
    props.setProperty(messageTriggerIdSymbol, trigger.getUniqueId())
    console.log(`Stored log trigger with id ${props.getProperty(messageTriggerIdSymbol)}`)
  }
  /**
   * @param {number} minutes
   */
  function minutesToMilliseconds(minutes){
    return 1000 * 60 * minutes
  }

  /** Returns null if no log trigger is currently active */
  function getLogTrigger(){
    const triggerId = props.getProperty(messageTriggerIdSymbol)
    console.log(`Retrieving log trigger with id: ${triggerId}`)
    const trigger = ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() === triggerId)
    console.log(trigger ? `Found a log trigger` : `Did not find a log trigger with that id.`)
    return trigger
  }

  function removeLogTrigger(){
    const trigger = getLogTrigger()
    if(!trigger) return
    console.log(`Removing log trigger with id ${trigger.getUniqueId()}`)
    ScriptApp.deleteTrigger(trigger)
    console.log('Removed log trigger')
    props.deleteProperty(messageTriggerIdSymbol)
    console.log(`Anything log trigger: ${props.getProperty(messageTriggerIdSymbol)}`)
  }
  /**
   * Adds a message to the log queue to be written out to the spreadsheet at a later point. If the queue is full, then this function will write the queued messages and the input message to the spreadsheet and clear the queue.
   * @param {string | Error} message
   */
  function addMessageToQueue(message){
    const messages = getMessages() || []
    const timestampedMessage = addTimestamp(message)
    try{
      props.setProperty(messagesSymbol, JSON.stringify([...messages, timestampedMessage]))
    }catch(err){
      if(argumentTooLargeError(err)){
        logToSheet([...messages, timestampedMessage])
        clearMessageQueue()
      }else{
        logToSheet([...messages, timestampedMessage, addTimestamp('LOGGING ERROR'), addTimestamp(err)])
        clearMessageQueue()
      }
    }
  }
  /**
   * Returns a date string and the input message.
   * @param {string | Error} message
   * @return {[string, string]}
   */
  function addTimestamp(message){
    return [new Date().toString(), message instanceof Error ? formatErrorLogMessage(message) : message]
  }

  /** @param {Error & Partial<{details:Object}>} err The errors thrown by the Calendar service sometimes have a details property with additional information.*/
  function formatErrorLogMessage(err){
    return `Name: ${err.name}\nMessage: ${err.message}\n${err.stack}${err.details ? '\nDetails: ' + JSON.stringify(err.details) : ''}`
  }

  /**
   * @param {Error} err
   */
  function argumentTooLargeError(err){
    return /Argument too large/ig.test(err.message)
  }
}


