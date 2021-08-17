import { Manager } from '@twilio/flex-ui';

import SharedState from './SharedState';

class WorkerState {
  _manager = Manager.getInstance();

  _defaultVoiceChannelCapacity = 1;
  get defaultVoiceChannelCapacity() { return this._defaultVoiceChannelCapacity; }

  _multiCallVoiceChannelCapacity = 2;
  get multiCallVoiceChannelCapacity() { return this._multiCallVoiceChannelCapacity; }

  updateWorkerAttributes;

  get workerClient() { return this._manager.workerClient; }

  get workerSid() { return this.workerClient.sid; }

  get workerAttributes() { return this.workerClient.attributes; }

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
}

const WorkerStateSingleton = new WorkerState();

export default WorkerStateSingleton;
