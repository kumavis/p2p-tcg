module.exports = createReducer

function createReducer(actionReducers, defaultState = {}) {
  return (state = defaultState, action) => {
    // console.log('created reducer:', state, action, actionReducers)
    // skip reducers
    if (!actionReducers.hasOwnProperty(action.type)) {
      return state
    }
    // run reducers
    return actionReducers[action.type](state, action)
  }
}