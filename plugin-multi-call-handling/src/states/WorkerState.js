import { Manager } from '@twilio/flex-ui';
import { Mutex } from 'async-mutex';

import AcdCallsState from './AcdCallsState';

class WorkerState {
  _manager = Manager.getInstance();

  _acdCallCountUpdateLock = new Mutex();

  // This setting controls how long a lock can be in place before it will be
  // automatically cleared to ensure ACD count updates aren't blocked indefinitely
  _maxAcdCountUpdateLockTime = 15000

  _timerAcdCallCountUpdateLock;

  _releaseAcdCallCountUpdateLock;

  get workerClient() { return this._manager.workerClient; }

  get workerSid() { return this.workerClient.sid; }

  get workerAttributes() { return this.workerClient.attributes; }

  get workerAcdCallCount() { return this.workerAttributes.acdCallCount || 0; }

  updateWorkerAttributes = async (attributes) => {
    // Leveraging mutex to ensure worker attribute updates within this plugin
    // are handled synchronously, avoiding accidentally overwriting attributes.
    // This requires all worker attribute updates going through this class method.
    const mutexWorkerAttributes = new Mutex();
    const mutexRelease = await mutexWorkerAttributes.acquire();

    const newAttributes = {
      ...this.workerAttributes,
      ...attributes
    };

    try {
      await this.workerClient.setAttributes(newAttributes);
      console.debug('Worker attributes updated', newAttributes);
    } catch (error) {
      console.error('Error updating worker attributes', error, newAttributes);
    } finally {
      mutexRelease();
    }
  }

  lockAcdCallCountUpdate = async () => {
    console.debug('WorkerState, lockAcdCallCountUpdate, awaiting lock');
    this._releaseAcdCallCountUpdateLock = await this._acdCallCountUpdateLock.acquire();
    console.debug('WorkerState, lockAcdCallCountUpdate, lock acquired');
    this._timerAcdCallCountUpdateLock = setTimeout(() => {
      if (this._acdCallCountUpdateLock.isLocked()) {
        this.releaseAcdCallCountUpdate();
      }
      this._timerAcdCallCountUpdateLock = undefined;
    }, this._maxAcdCountUpdateLockTime);
  }

  releaseAcdCallCountUpdate = () => {
    console.debug('WorkerState, releaseAcdCallCountUpdate, releasing lock');
    if (this._timerAcdCallCountUpdateLock) {
      clearTimeout(this._timerAcdCallCountUpdateLock);
      this._timerAcdCallCountUpdateLock = undefined;
    }
    this._releaseAcdCallCountUpdateLock();
  }

  updateWorkerAcdCallCount = async () => {
    console.debug('WorkerState, updateWorkerAcdCallCount, awaiting lock');
    const mutexRelease = await this._acdCallCountUpdateLock.acquire();
    console.debug('WorkerState, updateWorkerAcdCallCount, lock acquired');
    const { acdCallCount } = AcdCallsState;
    if (this.workerAcdCallCount === acdCallCount) {
      console.debug(`Worker acdCallCount already ${acdCallCount}. No update needed`);
    }
    else {
      const attributes = {
        ...this.workerAttributes,
        acdCallCount
      };
      try {
        await this.updateWorkerAttributes(attributes);
        console.debug('Worker acdCallCount set to:', acdCallCount);
      } catch (error) {
        console.error('Error updating worker attributes.', error);
      }
    }
    console.debug('WorkerState, updateWorkerAcdCallCount, releasing lock');
    mutexRelease();
  }
}

const WorkerStateSingleton = new WorkerState();

export default WorkerStateSingleton;
