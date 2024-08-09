/**
 * Returns the config for the script, including saved source calendar id, target calendar id and script url. These settings are used to run the script automatically.
 */
function getWatcherSettings_(){
  const urlSymbol = 'url'
  const sourceIdSymbol = 'sourceCalendarId'
  const targetIdSymbol = 'targetCalendarId'
  const props = PropertiesService.getScriptProperties()
  return {
    getChannelEndpoint:() => props.getProperty(urlSymbol),
    getSourceCalendarId:() => props.getProperty(sourceIdSymbol),
    getTargetCalendarId:() => props.getProperty(targetIdSymbol),
    hasChannelEndpoint:() => !!(props.getProperty(urlSymbol)),
    /** 
     * @param {string} sourceCalendarId
     * @param {string} targetCalendarId
     * @param {string} [scriptUrl]
     */
    update:(sourceCalendarId, targetCalendarId, scriptUrl) => {
      if(!sourceCalendarId || !targetCalendarId){
        throw new Error('Source and target calendar ids are required')
      }
      props.setProperties({
        [sourceIdSymbol]: sourceCalendarId,
        [targetIdSymbol]: targetCalendarId,
        [urlSymbol]: scriptUrl
      })
      if(!scriptUrl) props.deleteProperty(urlSymbol)
      console.log('Settings are updated')
    },
    clearSettings: () => {
      props.deleteProperty(urlSymbol)
      props.deleteProperty(sourceIdSymbol)
      props.deleteProperty(targetIdSymbol)
    }
  }
}