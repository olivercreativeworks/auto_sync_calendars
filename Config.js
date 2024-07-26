const manager = getCalendarIdManager()
const CONFIG = {
  sourceCalendarId: manager.getSourceCalendarId(), //Enter the id of the calendar you want to copy events from
  targetCalendarId: manager.getTargetCalendarId()  //Enter the id of the calendar you want to copy events to
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