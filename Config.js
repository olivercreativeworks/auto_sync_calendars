const calendarManager = getCalendarIdManager()
const scriptUrlManager = getScriptUrlManager()

/** 
 * Update the config object below. The following tips might be helpful:
 * - The source calendar is the calendar you want to copy events from. The target is the calendar you will copy events to. 
 *    - You can find your calendar ids via the Calendar.CalendarList.list method. See:https://developers.google.com/calendar/api/v3/reference/calendarList/list
 * - You will need to deploy this script as a webapp and enter the url into the config object's scriptUrl property. 
 *    - Here are instructions on how to deploy the script so you can get the url: https://developers.google.com/apps-script/guides/web#deploy_a_script_as_a_web_app. 
 *    - The url should look similar to this, where YOUR-UNIQUE-ID is a random collection of characters: 'https://script.google.com/macros/s/YOUR-UNIQUE-ID/exec'
*/
const CONFIG = {
  sourceCalendarId: calendarManager.getSourceCalendarId(),
  targetCalendarId: calendarManager.getTargetCalendarId(),
  scriptUrl: scriptUrlManager.getScriptUrl() 
}

function getScriptUrlManager(){
  const urlSymbol = 'url'
  const props = PropertiesService.getScriptProperties()
  return {
    getScriptUrl:() => props.getProperty(urlSymbol),
    setScriptUrl:(url) => props.setProperty(urlSymbol, url)
  }
}

function getCalendarIdManager(){
  const sourceIdSymbol = 'sourceCalendarId'
  const targetIdSymbol = 'targetCalendarId'
  const props = PropertiesService.getScriptProperties()
  return {
    getSourceCalendarId: () => props.getProperty(sourceIdSymbol),
    getTargetCalendarId: () => props.getProperty(targetIdSymbol),
    setSourceCalendarId: (id) => props.setProperty(sourceIdSymbol, id), 
    setTargetCalendarId: (id) => props.setProperty(targetIdSymbol, id)
  }
}