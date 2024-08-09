/**
 * Updates the target calendar with events the from the source calendar.
 * @param {string} sourceCalendarId
 * @param {string} targetCalendarId
 * @param {{startDate?:Date, endDate?:Date}} [optionalFilters] - This argument is only used when a sync token is not available (i.e. on an initial sync, or if a sync token is invalidated). This will restrict the calendar events that are synced to events that come after the start and before the end (exclusive). This argument is optional and the start and end date properties are also optional. The start date must come before the end date.
 */
function syncCalendars(sourceCalendarId, targetCalendarId, optionalFilters = {}){
  const tokenManager = getTokenManager_() 
  log(`Starting sync for calendars with id:\nSource:${sourceCalendarId}\nTarget:${targetCalendarId}`)
  do{
    try{
      const sourceEvents = getCalendarEvents_(
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
        syncCalendars(sourceCalendarId, targetCalendarId, optionalFilters)
      }else{
        throw err
      }
    }
  } while(tokenManager.hasPageToken())
  log('Sync is complete.')
  return

  /**
   * Checks error for a 410 status code, which means the sync token is invalid and a full sync is required
   * @link {see: https://developers.google.com/calendar/api/guides/sync#full_sync_required_by_server}
   * @param {Partial<{details:{message:string, code:number}}>} err
   */
  function syncTokenInvalidError(err){
    return err?.details?.code === 410
  }
}
