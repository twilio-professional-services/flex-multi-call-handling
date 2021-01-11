import { Manager } from '@twilio/flex-ui';
import { Mutex } from 'async-mutex';

import FlexState from '../states/FlexState';
import { TaskActions } from '../states/SharedServicesState';

class TaskService {
  _manager = Manager.getInstance();

  _taskMutexes = new Map();

  initialize = () => {
    FlexState.dispatchStoreAction(TaskActions.setTaskServices(TaskServiceSingleton));
  }

  startMutexCleanupTimer = (task) => {
    const waitTimeMilliseconds = 5000;
    const { sid } = task;
    setTimeout(() => {
      const mutexTaskAttributes = this._taskMutexes.get(sid);
      if (mutexTaskAttributes && !mutexTaskAttributes.isLocked()) {
        this._taskMutexes.delete(sid);
      }
    }, waitTimeMilliseconds);
  }

  updateTaskAttributes = async (task, attributes) => {
    // Leveraging mutex to ensure task attribute updates within this plugin
    // are handled synchronously, avoiding accidentally overwriting attributes.
    // This requires all task attribute updates going through this class method.
    const { sid, attributes: taskAttributes } = task;
    let mutexTaskAttributes = this._taskMutexes.get(sid);

    if (!mutexTaskAttributes) {
      mutexTaskAttributes = new Mutex();
      this._taskMutexes.set(sid, mutexTaskAttributes);
    }

    const mutexRelease = await mutexTaskAttributes.acquire();

    const newAttributes = {
      ...taskAttributes,
      ...attributes
    };

    try {
      await task.setAttributes(newAttributes);
      console.debug('Task attributes updated', newAttributes);
    } catch (error) {
      console.error('Error updating task attributes', error, newAttributes);
    } finally {
      mutexRelease();
      this.startMutexCleanupTimer(task);
    }
  }
}

const TaskServiceSingleton = new TaskService();

export default TaskServiceSingleton;
