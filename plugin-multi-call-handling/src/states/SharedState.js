import { Manager } from '@twilio/flex-ui';

class SharedState {
  _manager = Manager.getInstance();

  get sharedState() { return this._manager.store.getState().shared; }

  get syncClient() { return this.sharedState?.sync?.client; }

  get workerService() { return this.sharedState?.worker?.service; }

  get updateVoiceChannelCapacity() { return this.workerService?.updateVoiceChannelCapacity; }
}

const SharedStateSingleton = new SharedState();

export default SharedStateSingleton;
