const assert = require('assert')
const crypto = require('crypto')
const xor = require('buffer-xor')
const hash = require('ethereumjs-util').sha3

const archetypes = require('./archetypes')

setTimeout(start)

//
// - create a plaintext "base deck"
// - A+ B both shuffle and encrypt it
// - pull a doubly encrypted card off the top and doubly decrypt it (B first so only A sees plaintext)
//

function start() {
  const remotePlayer = new RemotePlayer()
  // create baseDeck with one card from each archetype
  const baseDeck = createDeckTakeOneofAll(archetypes)
  console.log('announce baseDeck:')
  displayDeck(baseDeck)

  // create playDeck with help from remote player
  const proofs = {}
  const playDeck = preparePlayDeck({ proofs, baseDeck, remotePlayer })
  console.log('received play deck')
  // draw a card and decrypt via remote player
  const newCard = drawCard({ proofs, playDeck, remotePlayer })
  console.log('drew card:')
  displayCard(newCard)
}

function drawCard({ proofs, playDeck, remotePlayer }){
  // draw a card
  const drawnCard = playDeck.pop()
  // decrypt via remote player
  const remoteRevealProof = remotePlayer.requestDrawnCard(drawnCard)
  assert.equal(drawnCard, remoteRevealProof.shieldedCard, 'proof and original match')
  verifyRevealProof(remoteRevealProof)
  const locallyShieldedCard = remoteRevealProof.card
  // decrypt locally
  const localRevealProof = revealCardViaProofLibrary(proofs, locallyShieldedCard)
  const newCard = localRevealProof.card
  return newCard
}

function preparePlayDeck({ proofs, remotePlayer, baseDeck }){
  // prepare for play deck
  const shuffledBaseDeck = shuffleDeck(baseDeck)
  const shieldedBaseProofs = shieldDeck(shuffledBaseDeck)
  const shieldedBaseDeckOnly = extractShieldedOnly(shieldedBaseProofs)
  importToProofLibrary(proofs, shieldedBaseProofs)
  console.log('sending half-ready deck to remote player')
  const playDeck = remotePlayer.requestShieldAndShuffle(shieldedBaseDeckOnly)
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