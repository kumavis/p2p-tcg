const { createStore, combineReducers, bindActionCreators } = require('redux')
const deckDuck = require('./deckDuck')
const numberDuck = require('./numberDuck')
const mountDuck = require('./mountDuck')

const deck = mountDuck('deck', deckDuck)

// here we're also namespacing the state
const reducer = combineReducers({
  deck: deck.default,
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
