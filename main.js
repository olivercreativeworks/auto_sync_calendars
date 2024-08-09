/**
 * Start by updating the config in the function below. 
 * 
 * Then run the function to start automatically syncing your calendars.
 */
function startAutoSync(){
  const CONFIG = {
    sourceCalendarName:'buzz',
    targetCalendarName:'woody',
    scriptUrlOptional:'https://script.google.com/macros/s/AKfycbz2wKNGf1h31oDvgG_g8raNKVhD5BOD7yTeMalq9cYDoKgAlC7LPygBdbVuIGS3LJZJsw/exec' 
  }
  
  const sourceCalendarId = getCalendarId(CONFIG.sourceCalendarName)
  const targetCalendarId = getCalendarId(CONFIG.targetCalendarName)
  AutoSync.start(sourceCalendarId, targetCalendarId, CONFIG.scriptUrlOptional)

  function getCalendarId(calendarName){
    const cal = CalendarApp.getCalendarsByName(calendarName)[0]
    return cal.getId()
  }
}

/**
 * Turns off auto sync and stops syncing your calendars.
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
