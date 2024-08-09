/**
 * Creates a watcher that uses a trigger
 * @param {string} sourceCalendarId
 */
function watchViaTrigger_(sourceCalendarId){
  console.log('Creating a new watcher (with trigger)')
  const trigger = ScriptApp.newTrigger(performCalendarSync_.name)
    .forUserCalendar(sourceCalendarId)
    .onEventUpdated()
    .create()
  console.log(`Watching calendar with id ${sourceCalendarId}.`)
  return {trigger}
}

/**
 * This is used in a trigger function, so it's placed in the global scope.
 */
function performCalendarSync_(){
  const sourceCalendarId = WatcherManager_.settings.getSourceCalendarId()
  const targetCalendarId = WatcherManager_.settings.getTargetCalendarId()
  console.log(`Syncing:\nSource: ${sourceCalendarId}\nTarget: ${targetCalendarId}`)
  try{
    syncCalendars(WatcherManager_.settings.getSourceCalendarId(), WatcherManager_.settings.getTargetCalendarId())
  }catch(err){
    console.error(`Error occured while syncing calendars:\nSource calendar: ${sourceCalendarId}\nTarget calendar: ${targetCalendarId}`)
    throw err
  }
}