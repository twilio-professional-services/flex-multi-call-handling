import { Manager } from '@twilio/flex-ui';
import { Mutex } from 'async-mutex';

import SharedState from './SharedState';
import AcdCallsState from './AcdCallsState';

class WorkerState {
  _manager = Manager.getInstance();

  _defaultVoiceChannelCapacity = 1;
  get defaultVoiceChannelCapacity() { return this._defaultVoiceChannelCapacity; }

  _multiCallVoiceChannelCapacity = 2;
  get multiCallVoiceChannelCapacity() { return this._multiCallVoiceChannelCapacity; }

  // TODO: Remove when acdCallCount is no longer needed
  _acdCallCountUpdateLock = new Mutex();

  // This setting controls how long a lock can be in place before it will be
  // automatically cleared to ensure ACD count updates aren't blocked indefinitely
  // TODO: Remove when acdCallCount is no longer needed
  _maxAcdCountUpdateLockTime = 15000

  // TODO: Remove when acdCallCount is no longer needed
  _timerAcdCallCountUpdateLock;

  // TODO: Remove when acdCallCount is no longer needed
  _releaseAcdCallCountUpdateLock;

  updateWorkerAttributes;

  get workerClient() { return this._manager.workerClient; }

  get workerSid() { return this.workerClient.sid; }

  get workerAttributes() { return this.workerClient.attributes; }

  // TODO: Remove when acdCallCount is no longer needed
  get workerAcdCallCount() { return this.workerAttributes.acdCallCount; }

  get workerActivity() { return this.workerClient?.activity; }

  get isInAvailableActivity() { return this.workerActivity?.available }

  get workerChannels() { return this.workerClient.channels || new Map(); }

  get workerVoiceChannel() {
    return [...this.workerChannels.values()].find(c => c.taskChannelUniqueName === 'voice');
  }

  get voiceChannelCapacity() { return this.workerVoiceChannel?.capacity; }

  initialize() {
    console.debug('WorkerState initialize started');

    if (!SharedState.workerService) {
      console.error('Failed to initialize WorkerState. SharedState.workerService is undefined. '
        + 'Check if the shared services plugin failed to load.');
      return;
    }

    this.updateWorkerAttributes = SharedState.workerService.updateWorkerAttributes;

    console.debug('WorkerState initialize finished');
  }

  // TODO: Remove when acdCallCount is no longer needed
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

  // TODO: Remove when acdCallCount is no longer needed
  releaseAcdCallCountUpdate = () => {
    console.debug('WorkerState, releaseAcdCallCountUpdate, releasing lock');
    if (this._timerAcdCallCountUpdateLock) {
      clearTimeout(this._timerAcdCallCountUpdateLock);
      this._timerAcdCallCountUpdateLock = undefined;
    }
    this._releaseAcdCallCountUpdateLock();
  }

  // TODO: Remove when acdCallCount is no longer needed
  updateWorkerAcdCallCount = async () => {
    console.debug('WorkerState, updateWorkerAcdCallCount, awaiting lock');
    const mutexRelease = await this._acdCallCountUpdateLock.acquire();
    console.debug('WorkerState, updateWorkerAcdCallCount, lock acquired');
    const { acdCallCount } = AcdCallsState;
    if (this.workerAcdCallCount === acdCallCount) {
      console.debug(`Worker acdCallCount already ${acdCallCount}. No update needed`);
    }
    else {
      const attributes = { acdCallCount };
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
