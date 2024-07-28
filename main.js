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