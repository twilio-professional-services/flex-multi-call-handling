import { Actions } from '@twilio/flex-ui';
import FlexState from './FlexState';
import WorkerState from './WorkerState';
import SyncService from '../services/SyncService';
import { FlexActions } from '../utils/enums';
import utils from '../utils/utils';

const componentStateName = 'ParkedCallsState';
const syncMapSuffix = 'ParkedCalls';

class ParkedCallsState {
  //#region Private Variables
  _syncMapName = `${WorkerState.workerSid}.${syncMapSuffix}`;

  _syncMap;

  // Setting a TTL on the sync map so it's automatically
  // cleaned up for inactive workers
  _syncMapTtl = 604800 // 7 days * 24 hours * 3600 seconds

  _syncMapItems;

  _initialized;

  _stateUpdateTimer;

  _stateUpdateDelayMs = 100;

  _pickupLockEnabled = false;

  _pickupLockConversationId;
  //#endregion Private Variables

  //#region Public Variables
  get parkedAcdCalls() {
    const result = [];
    this._syncMapItems.forEach(call => {
      const isParkedCall = true;
      if (utils.isInboundAcdCall(call, isParkedCall)) {
        result.push(call);
      }
    });
    return result;
  }

  get pickupLock() { return {
    enabled: this._pickupLockEnabled,
    conversationId: this._pickupLockConversationId
  }; }
  //#endregion Public Variables

  _updateSyncingState = (syncing) => {
    FlexState.setComponentState(componentStateName, { syncing });
  }

  _updateParkedCallsState = () => {
    Actions.invokeAction(FlexActions.updateWorkerAcdCallCount);

    if (this._stateUpdateTimer) {
      clearTimeout(this._stateUpdateTimer);
    }
    this._stateUpdateTimer = setTimeout(() => {
      FlexState.setComponentState(
        componentStateName,
        {
          parkedCalls: this._syncMapItems,
          syncing: false
        }
      );
      this._stateUpdateTimer = undefined;
    }, this._stateUpdateDelayMs);
  }

  _prepItemForMap = (item) => {
    const { key, value } = item;
    const { attributes } = value;
    if (typeof attributes === 'string') {
      console.debug('Parsing sync item task attributes');
      value.attributes = attributes && JSON.parse(attributes);
    }
    return { key, value };
  }

  _syncMapItemAdded = (i) => {
    console.debug('ParkedCallsState itemAdded', i);
    const item = this._prepItemForMap(i.item);
    this._syncMapItems.set(item.key, item.value);
    this._updateParkedCallsState();
  }

  _syncMapItemUpdated = (i) => {
    console.debug('ParkedCallsState itemUpdated', i);
    const item = this._prepItemForMap(i.item);
    console.debug('ParkedCallsState item prepped', item);
    this._syncMapItems.set(item.key, item.value);
    this._updateParkedCallsState();
  }

  _syncMapItemRemoved = (item) => {
    console.debug('ParkedCallsState itemRemoved', item.key);
    this._syncMapItems.delete(item.key);
    this._updateParkedCallsState();
  }

  initialize = async () => {
    console.debug('ParkedCallsState initialize started');
    const syncMap = await SyncService.getSyncMap(this._syncMapName, this._syncMapTtl);
    if (syncMap.sid) {
      this._syncMap = syncMap;
    } else {
      console.error('ParkedCallsState failed to initialize. Unable to retrieve sync map.', syncMap.error);
      return;
    }
    const syncMapItems = await this._syncMap.getItems();
    this._syncMapItems = new Map(syncMapItems.items.map(i => {
      const item = this._prepItemForMap(i);
      return [item.key, item.value];
    }));
    this._updateParkedCallsState();
    this._syncMap.on('itemAdded', this._syncMapItemAdded);
    this._syncMap.on('itemUpdated', this._syncMapItemUpdated);
    this._syncMap.on('itemRemoved', this._syncMapItemRemoved);

    // Refreshing the sync map TTL so it doesn't expire while actively being used
    await SyncService.resetSyncMapTtl(this._syncMap, this._syncMapTtl);

    this._initialized = true;
    console.debug('ParkedCallsState initialize finished');
  }

  enablePickupLock = (conversationId) => {
    console.debug('ParkedCallsState, enablePickupLock, conversationId:', conversationId);
    this._pickupLockEnabled = true;
    this._pickupLockConversationId = conversationId;
  }

  clearPickupLock = () => {
    console.debug('ParkedCallsState, clearPickupLock');
    this._pickupLockEnabled = false;
    this._pickupLockConversationId = undefined;
  }

  // deleteMatchingParkedCall = (conversationId) => {
  //   const parkedCalls = [...this._syncMapItems.values()];
  //   const matchingParkedCall = parkedCalls.find(call => {
  //     const { attributes } = call;
  //     const conversations = attributes && attributes.conversations;
  //     const callConversationId = conversations && conversations.conversation_id;

  //     return conversationId === callConversationId;
  //   })

  //   if (matchingParkedCall) {
  //     try {
  //       this._syncMap.remove(matchingParkedCall.callSid);
  //     } catch (error) {
  //       if (error.status === 404) {
  //         console.debug(`Parked call matching conversation ID ${conversationId} not found`)
  //       } else {
  //         console.error(`Error removing parked call matching conversation ID ${conversationId}.`, error);
  //       }
  //     }
  //   }
  // }
}

const ParkedCallsStateSingleton = new ParkedCallsState();

export default ParkedCallsStateSingleton;
