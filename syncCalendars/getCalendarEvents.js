/**
 * @param {string} calendarId
 * @param {string} [pageToken]
 * @param {CalendarSyncOptions} [options]
 * @param {string} [syncToken]
 */
function getCalendarEvents_(calendarId, options){
  return options.syncToken ? 
    fetchEventsUsingSyncToken(calendarId, options) :
    fetchEvents(calendarId, options)

  function fetchEventsUsingSyncToken(calendarId, {syncToken, pageToken}){
    return Calendar.Events.list(calendarId, {pageToken, syncToken})
  }

  /**
   * @param {string} calendarId
   * @param {Partial<{pageToken:string, startDate:Date, endDate:Date}>}
   */
  function fetchEvents(calendarId, {pageToken, startDate, endDate}){
    const timeMin = startDate && toTimestamp(startDate)
    const timeMax = endDate && toTimestamp(endDate)
    return Calendar.Events.list(calendarId, {pageToken, timeMin, timeMax})
  }

  /**
   * Formats date for use in Calendar.Events.list method's optionalArgs parameter. See required date format: https://developers.google.com/calendar/api/v3/reference/events/list?#parameters
   * @param {Date} date
   */
  function toTimestamp(date){
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssZ")
  }
}

/**
 * @typedef CalendarSyncOptions
 * @prop {string} pageToken
 * @prop {string} syncToken
 * @prop {Date} startDate
 * @prop {Date} endDate
 */