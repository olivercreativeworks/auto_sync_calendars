/**
 * Syncs the calendars based on the settings in the Config.js file.
 * 
 * This function is global because it is used in the Auto Sync trigger function. It is also used in the doPost function.
 */
function syncCalendarsBasedOnConfig(){
  syncCalendars(CONFIG.sourceCalendarId, CONFIG.targetCalendarId)
}

/**
 * Updates the calendar with the targetCalendarId with the events from the sourceCalendarId.
 * @param {string} targetCalendarId
 * @param {string} sourceCalendarId
 */
function syncCalendars(sourceCalendarId = CONFIG.sourceCalendarId, targetCalendarId = CONFIG.targetCalendarId){
  const tokenManager = getTokenManager()
  do{
    try{
      const sourceEvents = getCalendarEvents(
        sourceCalendarId, 
        tokenManager.getSavedPageToken(), 
        tokenManager.getSavedSyncToken()
      )
      sourceEvents.items.forEach(
        sourceEvent => syncCalendarWithSourceEvent(targetCalendarId, sourceEvent)
      )

      tokenManager.updateTokens(sourceEvents.nextPageToken, sourceEvents.nextSyncToken)
    }catch(err){
      console.warn(err)
      console.warn(err.details)
      if(syncTokenInvalidError(err)){
        tokenManager.clearTokens()
        return syncCalendars(sourceCalendarId, targetCalendarId)
      }
      throw err
    }
  } while(tokenManager.hasPageToken())
  
  return

  /**
   * Checks error for a 410 status code, which means the sync token is invalid and a full sync is required
   * @link {see: https://developers.google.com/calendar/api/guides/sync#full_sync_required_by_server}
   */
  function syncTokenInvalidError(err){
    return err?.details.code === 410
  }

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
        props.deleteProperty(syncTokenSymbol)
        props.deleteProperty(pageTokenSymbol)
      }
    }
  }

  /**
   * @param {string} calendarId
   * @param {string} [pageToken]
   * @param {string} [syncToken]
   */
  function getCalendarEvents(calendarId, pageToken, syncToken){
    return Calendar.Events.list(calendarId, {syncToken, pageToken})
  }

  /**
   * @param {string} calendarId
   * @param {Calendar_v3.Calendar.V3.Schema.Event} sourceEvent
   */
  function syncCalendarWithSourceEvent(calendarId, sourceEvent){
    // The event in the calendar should have the same id as the source event
    const existingEvent = getEvent(calendarId, sourceEvent.id)
    if(!existingEvent) {
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
    console.log(`Creating event from: ${JSON.stringify(eventResource)} on calendar with id ${calendarId}`)
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
    console.log(`Deleting event with id: ${eventId} on calendar with id: ${calendarId}`)
    Calendar.Events.remove(calendarId, eventId)
  }

  /**
   * @param {string} eventId
   * @param {string} calendarId
   * @param {Calendar_v3.Calendar.V3.Schema.Event} eventResource
   */
  function updateEvent(eventId, calendarId, eventResource){
    console.log(`Updating event with id ${eventId} on calendar with id ${calendarId}.`)
    return Calendar.Events.update(eventResource, calendarId, eventId)
  }
}


