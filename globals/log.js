/** @type {(message:string|Error) => void} A global logging function */
var log = log || defaultLogger_

/**
 * Updates the global variable, ```log```
 * @template A
 * @param {A} updatedLog
 * @return A
 */
function updateGlobalLog(updatedLog){
  log = updatedLog
  return log
}

/** @param {string | Error} message */
function defaultLogger_(message){
  if(message instanceof Error){
    console.warn(message)
    console.log(message.name)
    console.log(message.message)
    console.log(message.stack)
    message.details && console.log(message.details)
  }else{
    console.log(message)
  }
}