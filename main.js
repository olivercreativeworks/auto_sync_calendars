/**
 * Run this to enable autosync. Update the config file to change the calendars you want to sync. 
 */
function startAutoSync(){
  autoSyncManager().enable()
}

/**
 * Run this to stop autosync.
 */
function endAutoSync(){
  autoSyncManager().disable()
}