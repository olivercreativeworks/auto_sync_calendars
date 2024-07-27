/**
 * Run this to activate autosync. Update the config file to change the calendars you want to sync. 
 */
function startAutoSync(){
  autoSyncManager(CONFIG.scriptUrl).activate(CONFIG.sourceCalendarId)
}

/**
 * Run this to stop autosync.
 */
function endAutoSync(){
  autoSyncManager(CONFIG.scriptUrl).disable()
}