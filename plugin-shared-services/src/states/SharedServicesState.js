import { combineReducers } from 'redux';

export const namespace = 'shared';

const ACTION_SET_SYNC_INSTANCE = 'SET_SYNC_INSTANCE';
const ACTION_SET_WORKER_SERVICES = 'SET_WORKER_SERVICES';
const ACTION_SET_TASK_SERVICES = 'SET_TASK_SERVICES';

const initialSyncState = {
  client: {},
};

const initialWorkerServicesState = {
  service: {},
};

const initialTaskServicesState = {
  service: {},
};

export class SyncActions {
  static setSyncClient = (client) => (
    { type: ACTION_SET_SYNC_INSTANCE, client }
  );
};

export class WorkerActions {
  static setWorkerServices = (service) => (
    { type: ACTION_SET_WORKER_SERVICES, service }
  );
};

export class TaskActions {
  static setTaskServices = (service) => (
    { type: ACTION_SET_TASK_SERVICES, service }
  );
};

export function reduceSync(state = initialSyncState, action) {
  switch (action.type) {
    case ACTION_SET_SYNC_INSTANCE: {
      return {
        ...state,
        client: action.client
      };
    }

    default:
      return state;
  }
};

export function reduceWorker(state = initialWorkerServicesState, action) {
  switch (action.type) {
    case ACTION_SET_WORKER_SERVICES: {
      return {
        ...state,
        service: action.service
      };
    }

    default:
      return state;
  }
};

export function reduceTask(state = initialTaskServicesState, action) {
  switch (action.type) {
    case ACTION_SET_TASK_SERVICES: {
      return {
        ...state,
        service: action.service
      };
    }

    default:
      return state;
  }
};

export default combineReducers({
  sync: reduceSync,
  task: reduceTask,
  worker: reduceWorker
});
