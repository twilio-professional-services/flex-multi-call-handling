import { Actions } from '@twilio/flex-ui';
import WorkerState from '../states/WorkerState';
import { FlexActions } from '../utils/enums';

Actions.registerAction(FlexActions.updateWorkerAcdCallCount, async (payload) => {
  WorkerState.updateWorkerAcdCallCount();
});
