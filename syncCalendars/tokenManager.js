function getTokenManager_(){
  const syncTokenSymbol = 'syncToken'
  const pageTokenSymbol = 'pageToken'
  const props = PropertiesService.getScriptProperties() 
  return {
    getSavedSyncToken: () => props.getProperty(syncTokenSymbol),
    getSavedPageToken: () => props.getProperty(pageTokenSymbol),
    hasPageToken: () => !!(props.getProperty(pageTokenSymbol)),
    /** @param {string} [pageToken] @param {string} [syncToken] */
    updateTokens: (pageToken, syncToken) => {
      pageToken ? props.setProperty(pageTokenSymbol, pageToken) : props.deleteProperty(pageTokenSymbol)
      syncToken && props.setProperty(syncTokenSymbol, syncToken)
    },
    clearTokens: () => {
      log('Clearing sync token and page token.')
      props.deleteProperty(syncTokenSymbol)
      props.deleteProperty(pageTokenSymbol)
    }
  }
}