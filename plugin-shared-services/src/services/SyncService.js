import TwilioSync from 'twilio-sync';
import FlexState from '../states/FlexState';
import { SyncActions } from '../states/SharedServicesState';

class SyncService {
  constructor() {
    FlexState.loginHandler.on('tokenUpdated', this._tokenUpdateHandler);
  }

  _syncClient = new TwilioSync(FlexState.userToken)

  _tokenUpdateHandler = () => {
    console.debug('Updating Twilio Sync user token');

    const tokenInfo = FlexState.loginHandler.getTokenInfo();
    const accessToken = tokenInfo.token;

    this._syncClient.updateToken(accessToken);
  }

  initialize = () => {
    FlexState.dispatchStoreAction(SyncActions.setSyncClient(SyncServiceSingleton));
  }

  getSyncMap = async (syncMapName, syncMapTtl) => {
    let syncMap;
    try {
      syncMap = await this._syncClient.map({
        id: syncMapName,
        mode: 'open_or_create',
        ttl: syncMapTtl
      });
      return syncMap;
    } catch (error) {
      console.error(`Error getting sync map ${syncMapName}`, error);
      return undefined;
    }
  }

  resetSyncMapTtl = async (syncMap, syncMapTtl) => {
    try {
      await syncMap.setTtl(syncMapTtl)
      console.debug(`Reset TTL for sync map ${syncMap.uniqueName} to ${syncMapTtl} seconds`);
    } catch (error) {
      console.error(`Error resetting TTL for sync map ${syncMap.uniqueName}.`, error);
    }
  }
}

const SyncServiceSingleton = new SyncService();

export default SyncServiceSingleton;
