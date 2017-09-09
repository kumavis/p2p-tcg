const assert = require('assert')
const crypto = require('crypto')
const xor = require('buffer-xor')
const hash = require('ethereumjs-util').sha3

const createPlayerStore = require('./playerState')
const archetypes = require('./archetypes')

setTimeout(start)

//
// - create a plaintext "base deck"
// - A+ B both shuffle and encrypt it
// - pull a doubly encrypted card off the top and doubly decrypt it (B first so only A sees plaintext)
//

function start() {
  const proofs = {}
  const remotePlayer = new RemotePlayer()

  // initialize player
  // Create a Redux store holding the state of your app.
  // Its API is { subscribe, dispatch, getState }.
  const localPlayer = createPlayerStore()
  // localPlayer.subscribe(() =>
  //   console.log(localPlayer.getState())
  // )

  // create baseDeck with one card from each archetype
  const baseDeck = createDeckTakeOneofAll(archetypes)
  localPlayer.setBaseDeck(baseDeck)
  console.log('announce baseDeck:')
  displayDeck(baseDeck)

  // create playDeck with help from remote player
  preparePlayDeck({ proofs, localPlayer, remotePlayer })
  console.log('received play deck')

  // draw a card and decrypt via remote player
  const newCard = drawCard({ proofs, localPlayer, remotePlayer })
  // localPlayer.drawCard(newCard)
  console.log('drew card:')
  displayCard(newCard)

}

function drawCard({ proofs, localPlayer, remotePlayer }){
  // draw a card
  const { playDeck } = localPlayer.getState()
  const drawnCard = playDeck[0]
  assert(drawnCard, 'card was drawn')
  // decrypt via remote player
  const remoteRevealProof = remotePlayer.requestDrawnCard(drawnCard)
  assert.equal(drawnCard, remoteRevealProof.shieldedCard, 'proof and original match')
  verifyRevealProof(remoteRevealProof)
  const locallyShieldedCard = remoteRevealProof.card
  // decrypt locally
  const localRevealProof = revealCardViaProofLibrary(proofs, locallyShieldedCard)
  const newCard = localRevealProof.card
  localPlayer.drawCard({ shieldedCard: drawCard, card: newCard })
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
  return deck.map(shieldCard)
}

function shieldCard(card) {
  const secret = getNonce()
  const shieldedCard = hash(xor(card, secret))
  return { card, shieldedCard, secret }
}

function verifyRevealProof(revealProof) {
  const { card, shieldedCard, secret } = revealProof
  const reconstructed = hash(xor(card, secret))
  assert.deepEqual(reconstructed, shieldedCard)
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

function displayDeck(deck) {
  deck.forEach(displayCard)
}

function displayCard(card) {
  const archetypeId = bufferToInt(card)
  console.log(archetypes[archetypeId])
}

class RemotePlayer {
  constructor() {
    this.proofs = {}
    this.playerRemoteDeck = undefined
  }
  requestShieldAndShuffle (baseDeck) {
    // perform shield and shuffle
    const shuffledBaseDeck = shuffleDeck(baseDeck)
    const shieldedBaseProofs = shieldDeck(shuffledBaseDeck)
    const shieldedBaseDeckOnly = extractShieldedOnly(shieldedBaseProofs)
    this.playerRemoteDeck = shieldedBaseDeckOnly
    // record proofs
    importToProofLibrary(this.proofs, shieldedBaseProofs)
    // give obfuscated result
    return shieldedBaseDeckOnly
  }
  requestDrawnCard (shieldedCard) {
    // // first, verify that its the users turn to do this
    // // next, verify card is in deck
    // assert(this.playerRemoteDeck.includes(shieldedCard), 'card is in players deck')
    // this.playerRemoteDeck.remove(shieldedCard)
    // next, lookup proof
    return revealCardViaProofLibrary(this.proofs, shieldedCard)
  }
}