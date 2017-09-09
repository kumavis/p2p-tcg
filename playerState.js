const assert = require('assert')
const { createStore } = require('redux')

function playerReducer(state, action) {
  switch (action.type) {

    case 'SET_BASE_DECK':
      assert(!state.baseDeck, 'PlayerStore - baseDeck already set')
      state.baseDeck = action.value
      return state

    case 'SET_PLAY_DECK':
      assert(!state.playDeck, 'PlayerStore - playDeck already set')
      state.playDeck = action.value
      return state

    case 'DRAW_CARD':
      assert(state.playDeck, 'PlayerStore - playDeck not set')
      const { card, shieldedCard } = action.value
      removeFromArray(state.playDeck, shieldedCard)
      state.hand.push(card)
      return state

    default:
      return state
  }
}

function createInitState() {
  return {
    baseDeck: null,
    playDeck: null,
    hand: [],
    playfield: [],
  }
}

function createPlayerStore() {
  const playerStore = createStore(playerReducer, createInitState())
  // action helpers
  playerStore.setBaseDeck = (deck) => playerStore.dispatch({ type: 'SET_BASE_DECK', value: deck })
  playerStore.setPlayDeck = (deck) => playerStore.dispatch({ type: 'SET_PLAY_DECK', value: deck })
  playerStore.drawCard = (cardPair) => playerStore.dispatch({ type: 'DRAW_CARD', value: cardPair })
  return playerStore
}

module.exports = createPlayerStore

function removeFromArray(array, item) {
  const index = array.indexOf(item)
  if (index === -1) return
  array.splice(index, 1)
}