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
  
  const sourceCalendarId = CalendarApp.getCalendarsByName(CONFIG.sourceCalendarName)[0].getId() 
  const targetCalendarId = CalendarApp.getCalendarsByName(CONFIG.targetCalendarName)[0].getId() 
  const channelEndpoint = CONFIG.scriptUrlOptional

  AutoSync.start(sourceCalendarId, targetCalendarId, channelEndpoint)
}

/**
 * Turns off auto sync and stops syncing your calendars.
 */
function stopAutoSync(){
  AutoSync.stop()
}
