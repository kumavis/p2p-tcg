const { createStore, combineReducers, bindActionCreators } = require('redux')
const createDuck = require('./createDuck')
const mountDuck = require('./mountDuck')


const atom = createDuck({
  SET_VALUE: (state = null, action) => {
    console.log('atom.setValue', state, action)
    return action.payload
  },
})

const xyz = mountDuck('xyz', atom)
const www = mountDuck('www', atom)

const initState = { xyz: 1, www: 2 }
const reducer = combineReducers({
  xyz: xyz.default,
  www: www.default,
})
const store = createStore(reducer, initState)


const xyzActions = bindActionCreators(xyz, store.dispatch)
const wwwActions = bindActionCreators(www, store.dispatch)

console.log(store.getState())
xyzActions.setValue(100)
wwwActions.setValue(99)
console.log(store.getState())
