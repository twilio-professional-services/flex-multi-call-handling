import { Manager } from '@twilio/flex-ui';

class FlexState {
  _manager = Manager.getInstance();

  get flexState() { return this._manager.store.getState().flex; }

  get accountSid() { return this.flexState.worker.source.accountSid; }

  get serviceBaseUrl() { return this.flexState.config.serviceBaseUrl; }

  get userToken() { return this.flexState.session.ssoTokenPayload.token; }
  
  get loginHandler() { return this.flexState.session.loginHandler; }

  get workerCallSid() {
    const { connection } = this.flexState.phone;
    return connection && connection.source.parameters.CallSid;
  }

  get workerTasks() { return this.flexState.worker.tasks; }

  dispatchStoreAction = (payload) => {
    this._manager.store.dispatch(payload);
  }
}

const FlexStateSingleton = new FlexState();

export default FlexStateSingleton;
