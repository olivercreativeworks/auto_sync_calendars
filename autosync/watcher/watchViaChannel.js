/** 
 * Creates a watcher that uses a channel and trigger
 * @param {string} sourceCalendarId
 * @param {string} triggerFnName The name of the function to run on a trigger
 * @param {string} url
 * @param {number} [timeToLive] How long the channel will live in seconds. Default is 604800 seconds, or 7 days
 * @return {Watcher}
 */
function watchViaChannel_(sourceCalendarId, triggerFnName, url, timeToLive){
  const channel = createChannel(sourceCalendarId, url, timeToLive)
  const trigger = createChannelRefreshTrigger(channel, triggerFnName)
  console.log(`Watching calendar with id ${sourceCalendarId}.`)
  return {trigger, channel}

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

  /** 
   * @param {Calendar_v3.Calendar.V3.Schema.Channel} channel
   * @param {string} triggerFnName The name of the function to run on a trigger
   */
  function createChannelRefreshTrigger(channel, triggerFnName){
    console.log('Creating a new watcher (with channel and trigger)')
    return ScriptApp.newTrigger(triggerFnName)
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
}