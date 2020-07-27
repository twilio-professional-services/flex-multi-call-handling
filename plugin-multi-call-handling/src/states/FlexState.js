import { Actions, Manager, TaskHelper } from '@twilio/flex-ui';
import { FlexActions } from '../utils/enums';
import utils from '../utils/utils';

class FlexState {
  _manager = Manager.getInstance();

  get flexState() { return this._manager.store.getState().flex; }

  get userToken() { return this.flexState.session.ssoTokenPayload.token; }

  get loginHandler() { return this.flexState.session.loginHandler; }

  get workerCallSid() {
    const { connection } = this.flexState.phone;
    return connection && connection.source.parameters.CallSid;
  }

  get workerTasks() { return this.flexState.worker.tasks; }

  get acdTasks() {
    const result = [];
    this.workerTasks.forEach(task => {
      if (utils.isInboundAcdCall(task)
      && !TaskHelper.isCompleted(task)
      ) {
        result.push(task);
      }
    });
    return result;
  }

  get conferences() { return this.flexState.conferences.states; }

  setComponentState = (name, state) => {
    Actions.invokeAction(FlexActions.setComponentState, { name, state });
  }
}

const FlexStateSingleton = new FlexState();

export default FlexStateSingleton;
