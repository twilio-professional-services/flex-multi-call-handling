import { Manager } from '@twilio/flex-ui';
import { Mutex } from 'async-mutex';

import FlexState from '../states/FlexState';
import { WorkerActions } from '../states/SharedServicesState';
import {
  baseServerlessUrl,
  fetchPostUrlEncoded,
  isDeepEqual
} from '../helpers';

class WorkerService {
  _manager = Manager.getInstance();

  _mutexWorkerAttributes = new Mutex();

  get workerClient() { return this._manager.workerClient; }

  get workerSid() { return this.workerClient.sid; }

  get workerAttributes() { return this.workerClient.attributes; }

  get voiceWorkerChannelSid() {
    const { channels } = this.workerClient;
		const voiceChannel = [...channels.values()]
      .find(c => c.taskChannelUniqueName === 'voice');
      
    return voiceChannel?.sid;
  }

  initialize = () => {
    FlexState.dispatchStoreAction(WorkerActions.setWorkerServices(WorkerServiceSingleton));
  }

  waitForLocalAttributesMatch = (attributes) => new Promise(resolve => {
    if (isDeepEqual(attributes, this.workerAttributes)) {
      return resolve();
    }

    console.debug('Waiting for local worker attributes to match updated attributes');
    let count = 0;
    const retryIntervalMilliseconds = 50;
    const maxWaitTimeMilliseconds = 2000;
    let interval = setInterval(() => {
      count += 1
      if (isDeepEqual(attributes, this.workerAttributes)) {
        console.debug('Local worker attributes matched updated attributes after '
          + `${retryIntervalMilliseconds * count} milliseconds`);
        clearInterval(interval);
        interval = undefined;
        clearTimeout(timeout);

        resolve();
      }
    }, retryIntervalMilliseconds);

    const timeout = setTimeout(() => {
      if (interval) {
        console.warn('Local worker attributes failed to match updated attributes '
          + `after ${maxWaitTimeMilliseconds} milliseconds`);
        clearInterval(interval);

        resolve();
      }
    }, maxWaitTimeMilliseconds);
  })

  updateWorkerAttributes = async (attributes) => {
    // Leveraging mutex to ensure worker attribute updates within this plugin
    // are handled synchronously, avoiding accidentally overwriting attributes.
    // This requires all worker attribute updates going through this class method.
    console.debug('SharedServices, updateWorkerAttributes, acquiring lock for update:', attributes);
    const mutexRelease = await this._mutexWorkerAttributes.acquire();

    const newAttributes = {
      ...this.workerAttributes,
      ...attributes
    };

    console.debug('SharedServices, updateWorkerAttributes, lock acquired for update:', newAttributes);

    if (isDeepEqual(newAttributes, this.workerAttributes)) {
      console.debug('SharedServices, updateWorkerAttributes, Worker attributes already equal to update:', newAttributes);
      mutexRelease();
      return;
    }

    try {
      await this.workerClient.setAttributes(newAttributes);
      console.debug('SharedServices, updateWorkerAttributes, Worker attributes updated', newAttributes);

      await this.waitForLocalAttributesMatch(newAttributes);
    } catch (error) {
      console.error('SharedServices, updateWorkerAttributes, Error updating worker attributes', error, newAttributes);
    } finally {
      mutexRelease();
    }
  }

  updateWorkerChannelCapacity = async (workerChannelSid, capacity) => {
    try {
      console.debug(`Updating worker channel ${workerChannelSid} capacity to ${capacity}`);

      const fetchUrl = `${baseServerlessUrl}/worker-capacity`;

      const fetchBody = {
        Token: FlexState.userToken,
        capacity,
        workerSid: this.workerSid,
        workerChannelSid,
      };
  
      const fetchOptions = fetchPostUrlEncoded(fetchBody);
      const fetchResponse = await fetch(fetchUrl, fetchOptions);
      const capacityUpdateResult = await fetchResponse.json();
      console.debug('Worker channel capacity update result:', capacityUpdateResult);
    } catch (error) {
      console.error('Error updating worker channel capacity.', error);
    }
  }

  updateVoiceChannelCapacity = (capacity) => {
    return this.updateWorkerChannelCapacity(this.voiceWorkerChannelSid, capacity);
  }
}

const WorkerServiceSingleton = new WorkerService();

export default WorkerServiceSingleton;
