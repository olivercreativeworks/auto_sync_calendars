/**
 * @param {string} calendarId
 * @param {Calendar_v3.Calendar.V3.Schema.Event} sourceEvent
 */
function syncCalendarWithSourceEvent(calendarId, sourceEvent){
  // The event in the calendar should have the same id as the source event
  const existingEvent = getEvent(calendarId, sourceEvent.id)
  /** @type {Calendar_v3.Calendar.V3.Schema.Event} */
  const eventResource = {
    ...sourceEvent, 
    attendees:undefined, // remove attendees from event so duplicate invites aren't sent.
  }
  if(!existingEvent) {
    if(isCancelled(eventResource)) return
    return createEvent(eventResource, calendarId)
  }
  else if(noUpdatesRequired(eventResource, existingEvent)){
    return
  }
  else if(isCancelled(eventResource)){
    return removeEvent(existingEvent.id, calendarId)
  }
  else{
    // The sequence should match the existing event's sequence to avoid an error on event updates
    return updateEvent(existingEvent.id, calendarId, {...eventResource, sequence:existingEvent.sequence})
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
    try{
      log(`Creating event from: ${JSON.stringify(eventResource)} on calendar with id ${calendarId}`)
      return Calendar.Events.insert(eventResource, calendarId)
    }catch(err){
      if(invalidResourceError(err)){
        log(err)
        return
      }else{
        throw err
      }
    }
  }
  function invalidResourceError(err){
    return  err.details?.message.match('Invalid resource id value') && err.details?.code === 400
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
}