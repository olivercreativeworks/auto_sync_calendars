/**
 * Creates a watcher that uses a trigger
 * @param {string} sourceCalendarId
 * @param {string} triggerFnName The name of the function to run on a trigger
 * @return {Watcher}
 */
function watchViaTrigger_(sourceCalendarId, triggerFnName){
  console.log('Creating a new watcher (with trigger)')
  const trigger = ScriptApp.newTrigger(triggerFnName)
    .forUserCalendar(sourceCalendarId)
    .onEventUpdated()
    .create()
  console.log(`Watching calendar with id ${sourceCalendarId}.`)
  return {trigger}
}

