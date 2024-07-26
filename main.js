/**
 * Run this to activate autosync. Update the config file to change the calendars you want to sync. 
 */
function startAutoSync(){
  autoSyncManager().activate()
}

/**
 * Run this to stop autosync.
 */
function endAutoSync(){
  autoSyncManager().disable()
}