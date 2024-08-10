/**
 * Manages automatic calendar sync via a watcher. A watcher is either a channel + a script trigger to refresh the channel, or a script trigger.
 */
const AutoSync = (() => {
  return {
    /**
     * @param {string} sourceCalendarId
     * @param {string} targetCalendarId
     * @param {string} [scriptUrlOptional] - If you provide a url, the watcher will be a channel + script trigger to refresh the channel. Otherwise the watcher will be a script trigger.
     */
    start: (sourceCalendarId, targetCalendarId, scriptUrlOptional) => {
      WatcherManager_.updateSettings(sourceCalendarId, targetCalendarId, scriptUrlOptional)
      stop_()
      start_()
    },
    stop: () => {
      WatcherManager_.clearSettings()
      stop_()
    },
  }

  /**
   * Starts the watcher.
   */
  function start_(){
    if(WatcherManager_.watcherIsActive()){
      return console.warn('Watcher is already active')
    }
    WatcherManager_.createWatcher()
  }

  /**
   * Stops the watcher 
   */
  function stop_(){
    WatcherManager_.removeWatcher()
    console.log('Watcher is stopped.')
  }
})()