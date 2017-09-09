const assert = require('assert')
const crypto = require('crypto')
const xor = require('buffer-xor')
const hash = require('ethereumjs-util').sha3

const createPlayerStore = require('./playerState')
const archetypes = require('./archetypes')
const interface = require('./interface')

setTimeout(() => {
  start().catch((err) => {
    console.error(err)
    interface.done()
  })
})

//
// - create a plaintext "base deck"
// - A+ B both shuffle and encrypt it
// - pull a doubly encrypted card off the top and doubly decrypt it (B first so only A sees plaintext)
//

async function start() {
  const proofs = {}
  const remotePlayer = new RemotePlayer()

  // initialize player
  // Create a Redux store holding the state of your app.
  // Its API is { subscribe, dispatch, getState }.
  const localPlayer = createPlayerStore({ name: 'localPlayer' })
  // localPlayer.subscribe(() => {
  //   displayCardStats(localPlayer.getState())
  // })

  // create baseDeck with one card from each archetype
  const baseDeck = createDeckTakeOneofAll(archetypes)
  localPlayer.setBaseDeck(baseDeck)
  remotePlayer.sendBaseDeck(baseDeck)
  console.log(`loaded baseDeck: ${baseDeck.length} cards`)

  // create playDeck with help from remote player
  preparePlayDeck({ proofs, localPlayer, remotePlayer })
  console.log('received shuffled play deck')

  // draw a card and decrypt via remote player
  const hand = drawHand({ proofs, localPlayer, remotePlayer })
  console.log('drew hand')

  // loop through game
  while (true) {
    console.log('- - - - - your turn - - - - -')
    const playerState = localPlayer.getState()
    const { hand, playfield } = playerState
    displayCardStats(playerState)
    displayHand(hand)
    displayPlayfield(playfield)

    const { action, params } = await interface.getAction(['play', 'draw'])
    switch (action) {
      case 'play':
        const cardIndex = parseInt(params[0], 10)
        const card = hand[cardIndex]
        console.log('--> you played:')
        displayCard(card)
        assert(card, 'player chose a valid card')
        playCard({ proofs, localPlayer, remotePlayer, card })
        break

      case 'draw':
        const newCard = drawCard({ proofs, localPlayer, remotePlayer })
        console.log('--> you drew:')
        displayCard(newCard)
        break
    }
  }

}

function playCard({ proofs, localPlayer, remotePlayer, card }) {
  // reveal card to remote player
  const revealProof = lookupProofViaProofLibrary(proofs, card)
  remotePlayer.sendPlayedCard(revealProof)
  // play locally
  localPlayer.playCard({ card })
}


function drawHand({ proofs, localPlayer, remotePlayer }) {
  drawCard({ proofs, localPlayer, remotePlayer })
  drawCard({ proofs, localPlayer, remotePlayer })
  drawCard({ proofs, localPlayer, remotePlayer })
  drawCard({ proofs, localPlayer, remotePlayer })
  drawCard({ proofs, localPlayer, remotePlayer })
  const { hand } = localPlayer.getState()
  return hand
}

function drawCard({ proofs, localPlayer, remotePlayer }) {
  // draw a card
  const { playDeck } = localPlayer.getState()
  const drawnCard = playDeck[0]
  assert(drawnCard, 'card was drawn')
  // decrypt via remote player
  const remoteRevealProof = remotePlayer.requestDrawnCard(drawnCard)
  assert.deepEqual(drawnCard, remoteRevealProof.shieldedCard, 'proof and original match')
  verifyRevealProof(remoteRevealProof)
  const locallyShieldedCard = remoteRevealProof.card
  // decrypt locally
  const localRevealProof = revealCardViaProofLibrary(proofs, locallyShieldedCard)
  const newCard = localRevealProof.card
  localPlayer.drawCard({ card: newCard, shieldedCard: drawnCard })
  return newCard
}

function preparePlayDeck({ proofs, localPlayer, remotePlayer }){
  // prepare for play deck
  const { baseDeck } = localPlayer.getState()
  const shuffledBaseDeck = shuffleDeck(baseDeck)
  const shieldedBaseProofs = shieldDeck(shuffledBaseDeck)
  const shieldedBaseDeckOnly = extractShieldedOnly(shieldedBaseProofs)
  importToProofLibrary(proofs, shieldedBaseProofs)
  console.log('sending half-ready deck to remote player')
  const playDeck = remotePlayer.requestShieldAndShuffle(shieldedBaseDeckOnly)
  localPlayer.setPlayDeck(playDeck)
  return playDeck
}

function requestRemotePlayerToShuffleAndShield(deck){
  return extractShieldedOnly(shieldDeck(shuffleDeck(deck)))
}

function createDeckTakeOneofAll(archetypes){
  return archetypes.map((archetype, index) => intToBuffer(index))
}

// // it breaks if we have multiple copies of the same card atm
// // need to add a mapping between card uuid -> archetype
// function createDeckTakeThreeofAll(archetypes){
//   const deck = []
//   archetypes.forEach((archetype, index) => {
//     const card = intToBuffer(index)
//     deck.push(card)
//     deck.push(card)
//     deck.push(card)
//   })
//   return deck
// }

function shuffleDeck(deck) {
  const originalDeck = deck.slice()
  const newDeck = []
  while (originalDeck.length > 0) {
    const randomIndex = Math.floor(Math.random() * originalDeck.length)
    const drawnCard = originalDeck.splice(randomIndex, 1)[0]
    newDeck.push(drawnCard)
  }
  return newDeck
}

function extractShieldedOnly(shieldedDeckWithProofs) {
  return shieldedDeckWithProofs.map((revealProof) => revealProof.shieldedCard)
}

function shieldDeck(deck) {
  return deck.map((card) => shieldCard(card))
}

function shieldCard(card, _secret) {
  const secret = _secret || getNonce()
  const shieldedCard = hash(Buffer.concat([card, secret]))
  return { card, shieldedCard, secret }
}

function verifyRevealProof(revealProof) {
  const { card, shieldedCard, secret } = revealProof
  const reconstructedProof = shieldCard(card, secret)
  const reconstructedCard = reconstructedProof.shieldedCard
  assert.deepEqual(reconstructedCard, shieldedCard)
}

function getNonce(){
  return crypto.randomBytes(32)
}

function intToBuffer(int) {
  let hexString = int.toString(16)
  if (hexString.length % 2) hexString = '0' + hexString
  return Buffer.from(hexString, 'hex')
}

function bufferToInt(buffer) {
  return parseInt(buffer.toString('hex'), 16)
}


function proofIdForShieldedCard(shieldedCard){
  return shieldedCard.toString('hex')
}

function importToProofLibrary(proofs, shieldedBaseProofs){
  shieldedBaseProofs.forEach((revealProof) => {
    const proofId = proofIdForShieldedCard(revealProof.shieldedCard)
    proofs[proofId] = revealProof
  })
}

function revealCardViaProofLibrary(proofs, shieldedCard){
  const proofId = proofIdForShieldedCard(shieldedCard)
  const revealProof = proofs[proofId]
  return revealProof
}

function lookupProofViaProofLibrary(proofs, card){
  const revealProof = Object.values(proofs).find((revealProof) => revealProof.card.equals(card))
  return revealProof
}

function displayCardStats(playerState) {
  let { baseDeck, playDeck, hand, playfield } = playerState
  baseDeck = baseDeck || []
  playDeck = playDeck || []
  console.log(`stats:`)
  console.log(`  deck: ${playDeck.length}/${baseDeck.length}`)
  console.log(`  hand: ${hand.length}`)
  console.log(`  play: ${playfield.length}`)
}

function displayHand(deck) {
  console.log('hand:')
  displayDeck(deck)
}

function displayPlayfield(deck) {
  console.log('playfield:')
  displayDeck(deck)
}

function displayDeck(deck) {
  if (deck.length === 0) return console.log('( empty )')
  deck.forEach((card, index) => {
    const archetypeId = bufferToInt(card)
    console.log(' ', index, archetypes[archetypeId])
  })
}

function displayCard(card) {
  const archetypeId = bufferToInt(card)
  console.log(archetypes[archetypeId])
}

class RemotePlayer {

  constructor() {
    this.proofs = {}
    this.rivalPlayer = createPlayerStore({
      name: 'remotePlayer.rival',
      rival: true,
    })
  }

  sendBaseDeck (baseDeck) {
    this.rivalPlayer.setBaseDeck(baseDeck)
  }

  requestShieldAndShuffle (halfReadyDeck) {
    // perform shield and shuffle
    const shuffledHalfReadyDeck = shuffleDeck(halfReadyDeck)
    const playDeckProofs = shieldDeck(shuffledHalfReadyDeck)
    const playDeckOnly = extractShieldedOnly(playDeckProofs)
    // this.rivalPlayer.setHalfReadyDeck(baseDeck)
    this.rivalPlayer.setPlayDeck(playDeckOnly)
    // record proofs
    importToProofLibrary(this.proofs, playDeckProofs)
    // give obfuscated result
    return playDeckOnly
  }

  requestDrawnCard (shieldedCard) {
    // // first, verify that its the users turn to do this
    // next, lookup proof
    const revealProof = revealCardViaProofLibrary(this.proofs, shieldedCard)
    const { card } = revealProof
    // update rivals state
    this.rivalPlayer.drawCard({ card, shieldedCard })
    return revealProof
  }

  sendPlayedCard (revealProof) {
    console.log('sendPlayedCard - revealProof', revealProof)
    console.log('sendPlayedCard - playerState', this.rivalPlayer.getState())
    // verify proof
    verifyRevealProof(revealProof)
    const { card, shieldedCard } = revealProof
    this.rivalPlayer.playCard({ card, shieldedCard })
  }
}