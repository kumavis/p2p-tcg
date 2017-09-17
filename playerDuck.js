const { createStore, combineReducers, bindActionCreators } = require('redux')
const { createSubDuck, bindDuckActionCreators } = require('./subDuck')
const deckDuck = require('./deckDuck')
const numberDuck = require('./numberDuck')
const mountDuck = require('./mountDuck')


// here we're also namespacing the state
const playerDuck = createSubDuck({
  deck: deckDuck,
  life: numberDuck,
})

// create the store normally
const initState = { life: 20 }
const store = createStore(playerDuck.default, initState)

// bind the duck actions to the store as normal
const playerActions = bindDuckActionCreators(playerDuck, store.dispatch)

// use state and actions as normal
console.log('state pre', store.getState())
playerActions.life.set(13)

// playerActions.deck.drawCard()
console.log('state post', store.getState())
