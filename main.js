/**
 * Run this to activate autosync. Update the config file to change the calendars you want to sync.
 */
function startAutoSync(){
  autoSyncManager().activate(CONFIG.sourceCalendarId, CONFIG.targetCalendarId, CONFIG.scriptUrlOptional)
}

/**
 * Run this to stop autosync.
 */
function endAutoSync(){
  autoSyncManager().disable()
}