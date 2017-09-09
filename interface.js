const prompt = require('prompt-promise')

module.exports = { getAction, done }


function done() {
  prompt.done()
}

async function getAction(actions) {
  console.log('actions:', actions.join(', '))
  while (true) {
    let response = await prompt('> ')
    response = response.trim()
    const responseParts = response.split(' ')
    const responseAction = responseParts[0]
    const responseParams = responseParts.slice(1)
    if (actions.includes(responseAction)) {
      return { action: responseAction, params: responseParams }
    } else if (responseAction.length) {
      console.log(`unknown action "${responseAction}"`)
    }
  }
}