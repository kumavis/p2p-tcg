const { createActions } = require('redux-actions')
const createReducer = require('./createReducer')

module.exports = createDuck

function createDuck(actionReducers, defaultState = {}){
  // Reducer
  const reducer = createReducer(actionReducers, defaultState)
  // Action Creators
  const actionTypes = Object.keys(actionReducers)
  const actionCreators = createActions(...actionTypes)
  // duck compliant result
  return { ...actionCreators, default: reducer }
}
