const createDuck = require('./createDuck')

module.exports = createDuck({

  DECREMENT: (state, { payload }) => {
    return state - payload
  },

  INCREMENT: (state, { payload }) => {
    return state + payload
  },

  SET: (state, { payload }) => {
    return payload
  },

})
