/**
 * Start by updating the config in the function below. Then run the function to save any config updates.
 * Once you saved your config updates, you can run startAutoSync to start syncing your calendars.
 */
const CONFIG = {
  sourceCalendarId:'',
  targetCalendarId:'',
  scriptUrlOptional:'' 
}

/**
 * Start automatically syncing your calendars.
 */
function startAutoSync(){
  AutoSync.settings.update(CONFIG.sourceCalendarId, CONFIG.targetCalendarId, CONFIG.scriptUrlOptional)
  AutoSync.activate()
}

/**
 * Stops automatically syncing your calendars.
 */
function stopAutoSync(){
  AutoSync.stop()
}

/**
 * This function attempts to forcefully stop auto sync. Use this if you run into an error using stopAutoSync.
 */
function forcefullyStopAutoSync(){
  AutoSync.forceStop()
}
