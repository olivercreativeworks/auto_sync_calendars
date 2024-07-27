// /** Update the config object below. The following tips might be helpful:
//  * - Calendar ids (required): 
//      - Source calendar: the calendar you want to copy events from. 
//      - Target calendar: the calendar you will copy events to.
//      - You can find calendar ids via the Calendar.CalendarList.list method. See:https://developers.google.com/calendar/api/v3/reference/calendarList/list
//  * 
//  * - Script url (optional).
//      - Without url: this script creates a trigger that directly monitors changes to the source calendar. The trigger will fire every time a change occurs in the source calendar to sync the source with the target. This approach may have a higher impact on your trigger quota (see: https://developers.google.com/apps-script/guides/services/quotas)

//      - With url: this script creates a trigger that makes a watcher. The watcher monitors the source calendar and sends a POST request to the provided url whenever a change occurs. The trigger will fire once every 6 days to keep the watcher active. To use this, you should deploy this script as a web app and enter the web app url as the scriptUrl property of the config object.
//         - How to deploy this script as a web app so you can get the url: https://developers.google.com/apps-script/guides/web#deploy_a_script_as_a_web_app. 
//         - The url should look similar to this:'https://script.google.com/macros/s/YOUR-UNIQUE-ID/exec', where 'YOUR-UNIQUE-ID' is a random collection of characters
//         - NOTE: ScriptApp.getService().getUrl() does not return the correct '/exec' url when called from a time based trigger (the 'YOUR-UNIQUE-ID' part is different). So we need to enter the url ourselves.
// */
// const CONFIG = {
//   sourceCalendarId: '',
//   targetCalendarId: '',
//   scriptUrl:'' 
// }