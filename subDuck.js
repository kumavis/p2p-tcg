const mountDuck = require('./mountDuck')
const { combineReducers, bindActionCreators } = require('redux')


module.exports = { createSubDuck, bindDuckActionCreators }

function createSubDuck(subDuckStructure){
  // gather reducers and action creators
  const reducerStructure = {}
  const actionCreators = {}
  // walk tree
  visitDucks(subDuckStructure, (path, duck) => {
    // mount duck
    const mountedDuck = mountDuck(path, duck)
    const reducer = mountedDuck.default
    const mountedActionCreators = { ...mountedDuck }
    delete mountedActionCreators.default
    // copy reducer and action creators
    setPath(reducerStructure, path, reducer)
    setPath(actionCreators, path, mountedActionCreators)
  })
  // namespace state
  const reducer = combineReducers(reducerStructure)
  // return new duck
  const newDuck = { ...actionCreators, default: reducer }
  return newDuck
}

function bindDuckActionCreators(duck, dispatch) {
  const actionCreators = {}
  visitLeaves(duck, (path, value) => {
    if (typeof value !== 'function') return
    const finalPart = path.split('/').shift()
    if (finalPart === 'default') return
    const actionCreator = bindActionCreators(value, dispatch)
    setPath(actionCreators, path, actionCreator)
  })
  return actionCreators
}

function visitLeaves(obj, fn, path = '') {
  Object.keys(obj).map((key) => {
    const value = obj[key]
    const localPath = path + key
    if (typeof value === 'object') {
      visitLeaves(value, fn, `${key}/`)
    } else {
      fn(path + key, value)
    }
  })
}

function visitDucks(obj, fn, path = '') {
  Object.keys(obj).map((key) => {
    const value = obj[key]
    const localPath = path + key
    if (typeof value === 'object') {
      if (isDuck(value)) {
        fn(path + key, value)
      } else {
        visitDucks(value, fn, `${key}/`)
      }
    }
  })
}

function isDuck(obj) {
  return !!obj.default
}

function setPath(obj, path, value){
  let ref = obj
  const pathParts = path.split('/')
  const lastPart = pathParts.pop()
  let part
  while (part = pathParts.shift()) {
    let nextRef = ref[part]
    if (typeof nextRef !== 'object') {
      nextRef = {}
      ref[part] = nextRef
    }
    ref = nextRef
  }
  ref[lastPart] = value
}