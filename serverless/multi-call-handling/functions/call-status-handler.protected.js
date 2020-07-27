const Twilio = require('twilio');

exports.handler = async function(context, event, callback) {
  const {
    ACCOUNT_SID,
    AUTH_TOKEN,
    SYNC_SERVICE_SID,
    WORKSPACE_SID
  } = context;
  const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

  const {
    CallSid: callSid,
    CallStatus: callStatus
  } = event;

  const syncMapSuffix = 'ParkedCalls';

  const getSyncMapItem = async (mapName, itemKey) => {
    console.log(`Fetching ${itemKey} from Sync Map ${mapName}`);
    try {
      const item = await client.sync
        .services(SYNC_SERVICE_SID)
        .syncMaps(mapName)
        .syncMapItems(itemKey)
        .fetch();
      return item;
    } catch (error) {
      console.log(`Unable to find ${itemKey} in Sync Map ${mapName}`);
      return undefined;
    }
  };

  const deleteSyncMapItem = (mapName, itemKey) => {
    console.log(`Deleting ${itemKey} from Sync Map ${mapName}`);
    return client.sync
      .services(SYNC_SERVICE_SID)
      .syncMaps(mapName)
      .syncMapItems(itemKey)
      .remove();
  };

  const updateSyncMapItem = async (mapName, itemKey, itemData, itemTtl) => {
    console.log(`Updating ${itemKey} in sync map ${mapName}`);
    try {
      await client.sync
        .services(SYNC_SERVICE_SID)
        .syncMaps(mapName)
        .syncMapItems(itemKey)
        .update({
          data: itemData,
          ttl: itemTtl
        })
    } catch (error) {
      console.error(`Error updating ${itemKey} in sync map ${mapName}.`, error);
    }
  }

  const convertMsToSec = (ms) => {
    return Math.round(ms / 1000);
  };

  if (callStatus !== 'completed') {
    return callback(null, {});
  }

  let syncMapName = `Global.${syncMapSuffix}`;
  const globalSyncMapItem = await getSyncMapItem(syncMapName, callSid);
  
  if (!globalSyncMapItem) {
    return callback(null, {});
  }

  const syncMapPromises = [];

  syncMapPromises.push(deleteSyncMapItem(syncMapName, callSid));

  const globalParkedCall = globalSyncMapItem.data || {};
  const { workerSid } = globalParkedCall;

  if (workerSid) {
    syncMapName = `${workerSid}.${syncMapSuffix}`;
    const syncMapItemData = {
      ...globalParkedCall,
      callerHangup: true,
      callerHangupTime: new Date().toISOString()
    };
    // Setting item TTL to a long enough value for the user to notice the
    // caller hung up before it disappears from the parked call list
    const syncMapItemTtl = 120;
    syncMapPromises.push(updateSyncMapItem(syncMapName, callSid, syncMapItemData, syncMapItemTtl));
  }

  await Promise.all(syncMapPromises);

  const { dateCreated, attributes, workflowSid } = globalParkedCall;

  const holdDuration = convertMsToSec(Date.now() - Date.parse(dateCreated));
  const parsedAttributes = JSON.parse(attributes);

  const newTaskAttributes = {
    ...parsedAttributes,
    targetWorker: 'nobody',
    conversations: {
      ...parsedAttributes.conversations,
      date: Date.parse(dateCreated),
      hold_time: holdDuration,
      outcome: 'Hangup While Parked',
      queue_time: 0
    }
  };

  console.log('Creating task to capture park time before hangup');
  const task = await client.taskrouter
    .workspaces(WORKSPACE_SID)
    .tasks
    .create({
      workflowSid,
      attributes: JSON.stringify(newTaskAttributes)
    });
  console.log(`Created task ${task.sid}`);

  console.log(`Cancelling task ${task.sid}`);
  await client.taskrouter
    .workspaces(WORKSPACE_SID)
    .tasks(task.sid)
    .update({
      assignmentStatus: 'canceled',
      reason: 'Hangup While Parked'
    });
  console.log(`Canceled task ${task.sid}`);

  callback(null, {});
};
