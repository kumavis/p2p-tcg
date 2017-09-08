const assert = require('assert')
const crypto = require('crypto')
const xor = require('buffer-xor')
const hash = require('ethereumjs-util').sha3

const card = Buffer.from([1])
const { shieldedCard, secret } = shieldCard(card)
const revealProof = { shieldedCard, secret }

verifyRevealProof(card, revealProof)


function shieldCard(card) {
  const secret = getNonce()
  const shieldedCard = hash(xor(card, secret)) 
  return { shieldedCard, secret }
}

function verifyRevealProof(card, revealProof) {
  const { shieldedCard, secret } = revealProof
  const reconstructed = hash(xor(card, secret))
  assert.deepEqual(reconstructed, shieldedCard)
}

function getNonce(){
  return crypto.randomBytes(32)
}