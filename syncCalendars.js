/**
 * Updates the target calendar with events the from the source calendar.
 * @param {string} sourceCalendarId
 * @param {string} targetCalendarId
 * @param {{startDate?:Date, endDate?:Date}} [optionalFilters] - This argument is only used when a sync token is not available (i.e. on an initial sync, or if a sync token is invalidated). This will restrict the calendar events that are synced to events that come after the start and before the end (exclusive). This argument is optional and the start and end date properties are also optional. The start date must come before the end date.
 * @param {(message: string | Error) => void} [log] - A logging function.
 */
function syncCalendars(sourceCalendarId, targetCalendarId, optionalFilters = {}, log = defaultLogger){
  const tokenManager = getTokenManager()
  log(`Starting sync for calendars with id:\nSource:${sourceCalendarId}\nTarget:${targetCalendarId}`)
  do{
    try{
      const sourceEvents = getCalendarEvents(
        sourceCalendarId, 
        {
          pageToken: tokenManager.getSavedPageToken(),
          syncToken: tokenManager.getSavedSyncToken(),
          startDate: optionalFilters.startDate,
          endDate: optionalFilters.endDate
        }
      )
      sourceEvents.items.forEach(
        sourceEvent => syncCalendarWithSourceEvent(targetCalendarId, sourceEvent)
      )

      tokenManager.updateTokens(sourceEvents.nextPageToken, sourceEvents.nextSyncToken)
    }catch(err){
      log(err)
      if(syncTokenInvalidError(err)){
        log(`The sync token was invalid. Clearing token and attempting a full sync.`)
        tokenManager.clearTokens()
        syncCalendars(sourceCalendarId, targetCalendarId)
      }else{
        throw err
      }
    }
  } while(tokenManager.hasPageToken())
  log('Sync is complete.')
  return

  function getTokenManager(){
    const syncTokenSymbol = 'syncToken'
    const pageTokenSymbol = 'pageToken'
    const props = PropertiesService.getScriptProperties() 
    return {
      getSavedSyncToken: () => props.getProperty(syncTokenSymbol),
      getSavedPageToken: () => props.getProperty(pageTokenSymbol),
      hasPageToken: () => !!(props.getProperty(pageTokenSymbol)),
      /** @param {string} [pageToken] @param {string} [syncToken] */
      updateTokens: (pageToken, syncToken) => {
        pageToken ? props.setProperty(pageTokenSymbol, pageToken) : props.deleteProperty(pageTokenSymbol)
        syncToken && props.setProperty(syncTokenSymbol, syncToken)
      },
      clearTokens: () => {
        log('Clearing sync token and page token.')
        props.deleteProperty(syncTokenSymbol)
        props.deleteProperty(pageTokenSymbol)
      }
    }
  }

  /**
   * @param {string} calendarId
   * @param {string} [pageToken]
   * @param {CalendarSyncOptions} [options]
   * @param {string} [syncToken]
   */
  function getCalendarEvents(calendarId, options){
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

  /**
   * @param {string} calendarId
   * @param {Calendar_v3.Calendar.V3.Schema.Event} sourceEvent
   */
  function syncCalendarWithSourceEvent(calendarId, sourceEvent){
    // The event in the calendar should have the same id as the source event
    const existingEvent = getEvent(calendarId, sourceEvent.id)
    if(!existingEvent) {
      if(isCancelled(sourceEvent)) return
      return createEvent(sourceEvent, calendarId)
    }
    else if(noUpdatesRequired(sourceEvent, existingEvent)){
      return
    }
    else if(isCancelled(sourceEvent)){
      return removeEvent(existingEvent.id, calendarId)
    }
    else{
      // The sequence must match the existing event's sequence to avoid an error
      return updateEvent(existingEvent.id, calendarId, {...sourceEvent, sequence:existingEvent.sequence})
    }    
  }

  /**
   * @param {string} calendarId
   * @param {string} eventId
   */
  function getEvent(calendarId, eventId){
    try{
      return Calendar.Events.get(calendarId, eventId)
    }catch(err){
      if(notFoundError(err)) {
        return undefined
      }else{
        throw err
      }
    }
  }

  /**
   * @param {Partial<{details:{message:string, code:number}}>} err
   */
  function notFoundError(err){
    return err.details?.message.match('Not Found') && err.details?.code === 404
  }

  /**
   * @param {Calendar_v3.Calendar.V3.Schema.Event} eventResource
   * @param {string} calendarId
   */
  function createEvent(eventResource, calendarId){
    log(`Creating event from: ${JSON.stringify(eventResource)} on calendar with id ${calendarId}`)
    return Calendar.Events.insert(eventResource, calendarId)
  }

  /**
   * @param {Calendar_v3.Calendar.V3.Schema.Event} sourceEvent
   * @param {Calendar_v3.Calendar.V3.Schema.Event} targetEvent
   */
  function noUpdatesRequired(sourceEvent, targetEvent){
    return isCancelled(sourceEvent) && isCancelled(targetEvent)
  }

  /**
   * @param {Calendar_v3.Calendar.V3.Schema.Event} event
   */
  function isCancelled(event){
    return event.status === "cancelled"
  }

  /**
   * @param {string} eventId
   * @param {string} calendarId
   */
  function removeEvent(eventId, calendarId){
    log(`Deleting event with id: ${eventId} on calendar with id: ${calendarId}`)
    Calendar.Events.remove(calendarId, eventId)
  }

  /**
   * @param {string} eventId
   * @param {string} calendarId
   * @param {Calendar_v3.Calendar.V3.Schema.Event} eventResource
   */
  function updateEvent(eventId, calendarId, eventResource){
    log(`Updating event with id ${eventId} on calendar with id ${calendarId}.`)
    return Calendar.Events.update(eventResource, calendarId, eventId)
  }

  /**
   * Checks error for a 410 status code, which means the sync token is invalid and a full sync is required
   * @link {see: https://developers.google.com/calendar/api/guides/sync#full_sync_required_by_server}
   * @param {Partial<{details:{message:string, code:number}}>} err
   */
  function syncTokenInvalidError(err){
    return err?.details?.code === 410
  }
}

function defaultLogger(message){
  if(message instanceof Error){
    console.warn(message)
  }else{
    console.log(message)
  }
}
