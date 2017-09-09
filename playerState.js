const assert = require('assert')
const clone = require('clone')
const { createStore } = require('redux')

//
// How cards are stored in each deck (encryption status)
// note: only difference for Local/Rival is in "hand".
// This difference is seen in PLAY_CARD when moving "hand" -> "playfield"
//
// +--------------------+-------------+-------------+
// | ( state.rival => ) |    Local    |    Rival    |
// +--------------------+-------------+-------------+
// | baseDeck           |  card       |  card       |
// | playDeck           |  R(L(card)) |  R(L(card)) |
// | hand               |  card       |  L(card)    |
// | playfield          |  card       |  card       |
// |                    |             |             |
// +--------------------+-------------+-------------+
//

function playerReducer(state, action) {
  state = clone(state)
  const handlers = {

    SET_BASE_DECK: () => {
      const { name, baseDeck } = state
      assert(!baseDeck, `PlayerStore (${name}) - baseDeck already set`)
      state.baseDeck = action.value
      return state
    },

    SET_PLAY_DECK: () => {
      const { name, playDeck } = state
      assert(!playDeck, `PlayerStore (${name}) - playDeck already set`)
      state.playDeck = action.value
      return state
    },

    DRAW_CARD: () => {
      const { name, playDeck, hand } = state
      assert(playDeck, `PlayerStore (${name}) - playDeck not set`)
      const { card, shieldedCard } = action.value
      try {
        removeFromArray(playDeck, shieldedCard)
      } catch (err) {
        assert.fail(`PlayerStore (${name}) - card not in playDeck`)
      }
      hand.push(card)
      return state
    },

    PLAY_CARD: () => {
      const { name, rival, playDeck, hand, playfield } = state
      assert(playDeck, `PlayerStore (${name}) - playDeck not set`)
      const { card, shieldedCard } = action.value
      try {
        // if rival: hand contains shielded cards
        // not rival: hand contains plaintext cards
        const cardToRemove = rival ? shieldedCard : card
        removeFromArray(hand, cardToRemove)
      } catch (err) {
        assert.fail(`PlayerStore (${name}) - card not in hand`)
      }
      playfield.push(card)
      return state
    },

  }
  const handler = handlers[action.type] || function () { return state }
  return handler()
}

function createInitState(initState) {
  return Object.assign({
    name: '(unnamed)',
    rival: false,
    baseDeck: null,
    playDeck: null,
    hand: [],
    playfield: [],
  }, initState)
}

function createPlayerStore(initState) {
  const playerStore = createStore(playerReducer, createInitState(initState))
  // action helpers
  playerStore.setBaseDeck = (deck) => playerStore.dispatch({ type: 'SET_BASE_DECK', value: deck })
  playerStore.setPlayDeck = (deck) => playerStore.dispatch({ type: 'SET_PLAY_DECK', value: deck })
  playerStore.drawCard = (cardPair) => playerStore.dispatch({ type: 'DRAW_CARD', value: cardPair })
  playerStore.playCard = (cardPair) => playerStore.dispatch({ type: 'PLAY_CARD', value: cardPair })
  return playerStore
}

module.exports = createPlayerStore

function removeFromArray(array, target) {
  const match = array.find((entry) => Buffer.compare(entry, target) === 0)
  assert(match, 'element not found in array')
  const index = array.indexOf(match)
  array.splice(index, 1)
}