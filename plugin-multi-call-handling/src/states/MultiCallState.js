import { combineReducers } from 'redux';

export const namespace = 'multiCall';

const ACTION_SET_PARKED_CALLS = 'SET_PARKED_CALLS';
const ACTION_SET_IS_UPDATE_PENDING = 'SET_IS_UPDATE_PENDING';

const initialSyncState = {
  parkedCalls: new Map(),
  isUpdatePending: false
};

export class MultiCallActions {
  static setParkedCalls = (parkedCalls) => (
    { type: ACTION_SET_PARKED_CALLS, parkedCalls }
  );
  static setIsUpdatePending = (isUpdatePending) => (
    { type: ACTION_SET_IS_UPDATE_PENDING, isUpdatePending }
  );
};

export function reduce(state = initialSyncState, action) {
  switch (action.type) {
    case ACTION_SET_PARKED_CALLS: {
      return {
        ...state,
        parkedCalls: action.parkedCalls
      };
    }
    case ACTION_SET_IS_UPDATE_PENDING: {
      return {
        ...state,
        isUpdatePending: action.isUpdatePending
      };
    }
    default:
      return state;
  }
};

export default combineReducers({
  park: reduce
});
