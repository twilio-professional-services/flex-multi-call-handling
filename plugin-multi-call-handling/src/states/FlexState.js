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

  get workerCallTasks() { return [...this.workerTasks.values()]
    .filter(task => TaskHelper.isCallTask(task)); }

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

  get selectedTaskSid() { return this.flexState.view?.selectedTaskSid; }

  get pendingActivity() {
    const item = localStorage.getItem(this.pendingActivityChangeItemKey);

    return item && JSON.parse(item);
  }

  get hasCallTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => TaskHelper.isCallTask(task));
  }

  get hasLiveCallTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => TaskHelper.isLiveCall(task));
  }

  /**
   * Returns true if there is a pending or live call task
   */
  get hasActiveCallTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => {
        return TaskHelper.isCallTask(task)
          && (TaskHelper.isPending(task) || TaskHelper.isLiveCall(task))
      });
  }

  /**
   * Returns true if there is a pending or live outbound call task
   */
  get hasActiveOutboundCallTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => {
        return utils.isOutboundCallTask(task)
          && (TaskHelper.isPending(task) || TaskHelper.isLiveCall(task))
          && !utils.isIncomingTransfer(task)
      });
  }
  get hasRingingOutboundCallTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => TaskHelper.isInitialOutboundAttemptTask(task)
        && !utils.isIncomingTransfer(task));
  }

  get hasOutboundCallTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => utils.isOutboundCallTask(task)
        && !utils.isIncomingTransfer(task));
  }

  get hasInboundAcdCall() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => utils.isInboundAcdCall(task))
  }

  get hasWrappingTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => TaskHelper.isInWrapupMode(task))
  }

  get hasPendingTask() {
    if (!this.workerTasks) return false;

    return [...this.workerTasks.values()]
      .some(task => TaskHelper.isPending(task))
  }

  setComponentState = (name, state) => {
    Actions.invokeAction(FlexActions.setComponentState, { name, state });
  }
}

const FlexStateSingleton = new FlexState();

export default FlexStateSingleton;
