function PropStore() {
  const props = PropertiesService.getScriptProperties()
  return{
    setProp: (key, prop) => {
      props.setProperty(key, JSON.stringify(prop || null))
    },
    getProp: (key) => {
      return JSON.parse(props.getProperty(key))
    },
    deleteProp:(key) => {
      props.deleteProperty(key)
    },
    /**
     * Updates the prop in the property store and returns the updated prop
     * @template {string | number | Record<unkown, unknown> | Array<unknown>} A
     * @param {string} key
     * @param {A} update
     * @return {A} The updated prop
     */
    updateProp:(key, update) => {
      const currentProp = JSON.parse(props.getProperty(key))
      let updatedProp;
      if(!(currentProp) || typeof update !== "object" || typeof currentProp !== "object"){
        updatedProp = update
      }else if (Array.isArray(update) && Array.isArray(currentProp)) {
        updatedProp = [...currentProp, ...update]
      }else {
        updatedProp = {...currentProp, ...update}
      } 
      props.setProperty(key, JSON.stringify(updatedProp))
      return updatedProp
    }
  }
}

function abcerere(){
  const store = PropStore()
  store.deleteProp('hello')
  store.deleteProp('helloy')
  console.log(store.getProp('helloy'))
  store.updateProp('helloy', [['shabaloo', 'dingdongtoyou']])
  console.log(store.getProp('hello'))
  store.updateProp('helloy', [['shabaloo2', 'dingdongtoyoutoo']])
  console.log(store.getProp('helloy'))
}