function workflowReducer(state, action) {
  switch (action.type) {
    case 'patch':
      return {
        ...state,
        ...action.patch,
      };
    default:
      return state;
  }
}

module.exports = {
  workflowReducer,
};