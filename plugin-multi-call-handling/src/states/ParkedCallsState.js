import { Actions } from '@twilio/flex-ui';
import FlexState from './FlexState';
import SharedState from './SharedState';
import WorkerState from './WorkerState';
import { MultiCallActions } from '../states/MultiCallState';
import { FlexActions } from '../utils/enums';
import utils from '../utils/utils';

const componentStateName = 'ParkedCallsState';
const syncMapSuffix = 'ParkedCalls';

class ParkedCallsState {
  //#region Private Variables
  _syncClient;

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

  get hasParkedCall() {
    if (!this._syncMapItems) {
      return false;
    }

    return [...this._syncMapItems.values()]
      .some(call => call.callerHangup === undefined);
  }

  get hasOutboundParkedCall() {
    if (!this._syncMapItems) {
      return false;
    }

    return [...this._syncMapItems.values()]
      .some(call => utils.isOutboundCallTask(call));
  }

  get hasInboundParkedAcdCall() {
    if (!this._syncMapItems) {
      return false;
    }

    return [...this._syncMapItems.values()]
      .some(call => utils.isInboundAcdCall(call, true));
  }
  //#endregion Public Variables

  _updateParkedCallsState = () => {
    if (this._stateUpdateTimer) {
      clearTimeout(this._stateUpdateTimer);
    }
    this._stateUpdateTimer = setTimeout(() => {
      FlexState.dispatchStoreAction(
        MultiCallActions.setParkedCalls(this._syncMapItems)
      );
      FlexState.dispatchStoreAction(
        MultiCallActions.setIsUpdatePending(false)
      );
      // FlexState.setComponentState(
      //   componentStateName,
      //   {
      //     parkedCalls: this._syncMapItems,
      //     isUpdatePending: false
      //   }
      // );
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

    this._syncClient = SharedState.syncClient;
    if (!this._syncClient) {
      console.error('Failed to initialize ParkedCallsState. SharedState.syncClient is undefined. '
        + 'Check if the shared services plugin failed to load.');
      return;
    }
    const syncMap = await this._syncClient.getSyncMap(this._syncMapName, this._syncMapTtl);
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
    await this._syncClient.resetSyncMapTtl(this._syncMap, this._syncMapTtl);

    this._initialized = true;
    console.debug('ParkedCallsState initialize finished');
  }

  setUpdatePending = (isUpdatePending) => {
    FlexState.dispatchStoreAction(
      MultiCallActions.setIsUpdatePending(isUpdatePending)
    );
    // FlexState.setComponentState(componentStateName, { isUpdatePending });
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

  updateIsReservationPending = async (isReservationPending, callSid) => {
    const item = this._syncMapItems.get(callSid);

    if (!item) return;

    item.isReservationPending = isReservationPending;

    try {
      const updatedItem = await this._syncMap.update(callSid, item);
      console.debug('updateIsReservationPending, updatedItem:', updatedItem);
    } catch (error) {
      console.error('Error updating isReservationPending for sync map item', callSid);
    }
  }

  deleteParkedCall = async (callSid) => {
    const item = this._syncMapItems.get(callSid);

    if (!item) return;

    try {
      await this._syncMap.remove(callSid);
      console.debug('deleteParkedCall, deleted item', callSid);
    } catch (error) {
      console.error('Error deleting parked call sync map item', callSid);
    }
  }
}

const ParkedCallsStateSingleton = new ParkedCallsState();

export default ParkedCallsStateSingleton;
