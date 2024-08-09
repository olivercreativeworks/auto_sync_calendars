function getLogger_() {
  return {
    write: (message) => {
      const logger = SpreadsheetLogger
      if(message instanceof Error){
        logger.write(message.stack)
        message.details && logger.write(message.details)
      }else{
        logger.write(message)
      }
    },
    /** Commits pending messages to the log */
    commit: () => SpreadsheetLogger.commitToLog(getLogSheet_(), getLock_() , processMessage_.name)
  }
}

function processMessage_(e){
  SpreadsheetLogger.commitPendingMessagesToLog(e, getLogSheet_(), getLock_(), processMessage_.name)
}

function getLogSheet_(){
  const props = PropertiesService.getScriptProperties().getProperties()
  return SpreadsheetApp.openById(props.spreadsheetId)
    .getSheets().filter(sheet => sheet.getSheetId() === Number(props.sheetId))[0]
}

function getLock_(){
  return LockService.getScriptLock()
}