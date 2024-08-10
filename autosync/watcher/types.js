/** 
 * @typedef WatcherProps
 * @prop {WatcherSettings} settings
 * @prop {WatcherDetails} watcherDetails
 */

/** 
 * @typedef WatcherSettings
 * @prop {string} channelEndpoint
 * @prop {string} targetCalendarId
 * @prop {string} sourceCalendarId
 */

/**
 * @typedef WatcherDetails
 * @prop {string} triggerId
 * @prop {Calendar_v3.Calendar.V3.Schema.Channel} channel
 */

/**
 * @typedef Watcher
 * @prop {ScriptApp.Trigger} trigger
 * @prop {Calendar_v3.Calendar.V3.Schema.Channel} [channel]
 */