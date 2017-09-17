module.exports = mountDuck

function mountDuck(namespace, duck) {
  const pathPrefix = namespace + '/'
  const newDuck = {}
  Object.keys(duck).forEach((key) => {
    const value = duck[key]
    if (key === 'default') {
      // reducer
      newDuck[key] = mountReducer(pathPrefix, value)
    } else {
      // action creator
      newDuck[key] = mountActionCreator(pathPrefix, value)
    }
  })
  return newDuck
}

// appends namespace to created action
function mountActionCreator(pathPrefix, actionCreator) {
  return (...args) => {
    const action = actionCreator(...args)
    const namespacedType = pathPrefix + action.type
    return { ...action, type: namespacedType }
  }
}

// filters for namespace and if match, strips namespace before giving to reducer
function mountReducer(pathPrefix, reducer) {
  const initState = reducer(undefined, {})
  return (state = initState, action) => {
    const namespaceMatches = pathPrefix === action.type.slice(0, pathPrefix.length)
    if (!namespaceMatches) return state
    const strippedType = action.type.slice(pathPrefix.length)
    const namespacedAction = { ...action, type: strippedType }
    return reducer(state, namespacedAction)
  }
}