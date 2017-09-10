const createDuck = require('./createDuck')

module.exports = createDuck({

  SET_BASE_DECK: (state, action) => {
    const { name, baseDeck } = state
    assert(!baseDeck, `PlayerStore (${name}) - baseDeck already set`)
    return { ...state, baseDeck: action.value }
  },

  SET_PLAY_DECK: (state, action) => {
    const { name, playDeck } = state
    assert(!playDeck, `PlayerStore (${name}) - playDeck already set`)
    return return { ...state, playDeck: action.value }
  },

  DRAW_CARD: (state, action) => {
    const { name, playDeck, hand } = state
    assert(playDeck, `PlayerStore (${name}) - playDeck not set`)
    const { card, shieldedCard } = action.value
    const playDeckCopy = playDeck.slice()
    const handCopy = hand.slice()
    try {
      removeFromArray(playDeckCopy, shieldedCard)
      handCopy.push(card)
    } catch (err) {
      assert.fail(`PlayerStore (${name}) - card not in playDeck`)
    }
    return { ...state, playDeck: playDeckCopy, hand: handCopy }
  },

  PLAY_CARD: (state, action) => {
    const { name, rival, playDeck, hand, playfield } = state
    assert(playDeck, `PlayerStore (${name}) - playDeck not set`)
    const { card, shieldedCard } = action.value
    const handCopy = hand.slice()
    const playfieldCopy = playfield.slice()
    try {
      // if rival: hand contains shielded cards
      // not rival: hand contains plaintext cards
      const cardToRemove = rival ? shieldedCard : card
      removeFromArray(handCopy, cardToRemove)
      playfieldCopy.push(card)
    } catch (err) {
      assert.fail(`PlayerStore (${name}) - card not in hand`)
    }
    return { ...state, hand: handCopy, playfield: playfieldCopy }
  },

})
