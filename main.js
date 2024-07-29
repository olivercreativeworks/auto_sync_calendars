/**
 * Update the config object then run startAutoSync to start automatically syncing calendars. To turn off autosync run stopAutoSync.
 * 
 * Source calendar id: the id of the calendar you want to copy events from. 
 * Target calendar id: the id of the calendar you will copy events to. 
 * Script url: the url of this web app. This is optional. See readme for more info.
 */
const CONFIG = {
  sourceCalendarId:'',
  targetCalendarId:'',
  scriptUrlOptional:'' 
}

/**
 * Update the config file to change the calendars you want to sync.
 */
function startAutoSync(){
  AutoSync.settings.update(CONFIG.sourceCalendarId, CONFIG.targetCalendarId, CONFIG.scriptUrlOptional)
  AutoSync.activate()
}

function stopAutoSync(){
  AutoSync.stop()
}

/**
 * This function attempts to forcefully stop auto sync. Use this if you run into an error using stopAutoSync.
 */
function forcefullyStopAutoSync(){
  AutoSync.forceStop()
}
