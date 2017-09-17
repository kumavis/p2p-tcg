const { createStore, combineReducers, bindActionCreators } = require('redux')
const createDuck = require('./createDuck')
const mountDuck = require('./mountDuck')

// "createDuck" creates a duck:
// { setValue, default: reducer }
const atom = createDuck({
  SET_VALUE: (state = null, action) => {
    console.log('atom.setValue', state, action)
    return action.payload
  },
})

// "mountDuck" creates a new duck under the "action.type" namespace
// reducer: namespace is stripped from the action before passed to the original reducer
// action creators: namespace is prepended to the action after being created by the original action creator
const xyz = mountDuck('xyz', atom)
const www = mountDuck('www', atom)

// here we're also namespacing the state
// "duck.default" is the duck's reducer
const reducer = combineReducers({
  xyz: xyz.default,
  www: www.default,
})

// create the store normally
const initState = { xyz: 1, www: 2 }
const store = createStore(reducer, initState)

// bind the duck actions to the store as normal
const xyzActions = bindActionCreators(xyz, store.dispatch)
const wwwActions = bindActionCreators(www, store.dispatch)

// use state and actions as normal
console.log(store.getState())
xyzActions.setValue(100)
wwwActions.setValue(99)
console.log(store.getState())
