const sourceCalendarId=PropertiesService.getScriptProperties().getProperty('sourceCalendarId');
const targetCalendarId=PropertiesService.getScriptProperties().getProperty('targetCalendarId');

function doPost(){
  syncCalendars()
  return ContentService.createTextOutput('Finished').setMimeType(ContentService.MimeType.TEXT)
}

function syncCalendars(){
  usingSyncToken(
    (sourceEvent) => syncTargetCalendarToSourceEvent(targetCalendarId, sourceEvent),
    sourceCalendarId
  )
}

/**
 * @param {(event: Calendar_v3.Calendar.V3.Schema.Event) => void} fn
 * @param {string} sourceCalendarId
 */
function usingSyncToken(fn, sourceCalendarId){
  let pageToken = undefined
  let syncToken = getSyncToken()
  do{
    const sourceEvents = Calendar.Events.list(sourceCalendarId, {syncToken, pageToken})
    sourceEvents.items.forEach(sourceEvent => fn(sourceEvent))
    pageToken = sourceEvents.nextPageToken
    syncToken = sourceEvents.nextSyncToken || syncToken 
  }while(pageToken !== undefined && pageToken !== null)
  saveSyncToken(syncToken)
}

/**
 * @return {string}
 */
function getSyncToken(){
  return PropertiesService.getScriptProperties().getProperty('syncToken')
}

/**
 * @param {string} syncToken
 */
function saveSyncToken(syncToken){
  PropertiesService.getScriptProperties().setProperty('syncToken', syncToken)
}

/**
 * @param {string} targetCalendarId
 * @param {Calendar_v3.Calendar.V3.Schema.Event} sourceEvent
 */
function syncTargetCalendarToSourceEvent(targetCalendarId, sourceEvent){
  const targetEvent = getEvent(targetCalendarId, sourceEvent.id)
  if(!targetEvent) {
    return createEvent(sourceEvent, targetCalendarId)
  }
  else if(noUpdatesRequired(sourceEvent, targetEvent)){
    return
  }
  else if(isCancelled(sourceEvent)){
    return removeEvent(targetEvent.id, targetCalendarId)
  }
  else{
    return updateEvent(targetEvent.id, targetCalendarId, {...sourceEvent, sequence:targetEvent.sequence})
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
