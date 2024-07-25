/**
 * @return {Calendar_v3.Calendar.V3.Schema.Channel}
 */
function getChannel(){
  return JSON.parse(PropertiesService.getScriptProperties().getProperty('channel'))
}

/**
 * @param {Calendar_v3.Calendar.V3.Schema.Channel} channel
 */
function saveChannel(channel){
  console.log(`Saving channel:\n\n${channel}`)
  PropertiesService.getScriptProperties().setProperty('channel', JSON.stringify(channel))
}

function stopChannel(){
  console.log('Stopping channel')
  Calendar.Channels.stop(getChannel())
}

function startChannel(sourceCalendarId) {
  const resource= {
    address: ScriptApp.getService().getUrl(),
    id: Utilities.getUuid(),
    type: 'web_hook'
  }
  saveChannel(Calendar.Events.watch(resource, sourceCalendarId))
  console.log(`Watching calendar with id ${sourceCalendarId}.`)
}