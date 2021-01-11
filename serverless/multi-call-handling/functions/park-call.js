const Twilio = require('twilio');
const TokenValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = TokenValidator(async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST GET');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.appendHeader('Content-Type', 'application/json');

  const {
    ACCOUNT_SID,
    AUTH_TOKEN,
    DOMAIN_NAME,
    SYNC_SERVICE_SID,
  } = context;
  const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

  const {
    attributes,
    callSid,
    name,
    queueName,
    workerSid,
    workflowSid
  } = event;

  const syncMapSuffix = 'ParkedCalls';

  const createSyncMap = (mapName) => {
    console.log(`Creating Sync Map ${mapName}`);
    return client.sync
      .services(SYNC_SERVICE_SID)
      .syncMaps
      .create({
        uniqueName: mapName
      });
  }

  const addSyncMapItem = async (mapName, itemKey, itemData, isRetry) => {
    console.log(`Adding ${itemKey} to Sync Map ${mapName}`);
    try {
      await client.sync
        .services(SYNC_SERVICE_SID)
        .syncMaps(mapName)
        .syncMapItems
        .create({
          key: itemKey,
          data: itemData,
          ttl: 86400
        });
    } catch (error) {
      if (isRetry) {
        console.error(`Failed to create ${itemKey} in Sync Map ${mapName}.`, error);
        return
      }
      await createSyncMap(mapName);
      await addSyncMapItem(mapName, itemKey, itemData, true);
    }
  };

  const twiml = new Twilio.twiml.VoiceResponse();

  // Change this play verb to use the desired audio for callers to hear while on hold
  twiml.play({ loop: 99 }, `https://${DOMAIN_NAME}/hold_music_1.mp3`);

  console.log(`Updating call ${callSid} with new TwiML ${twiml.toString()}`);
  await client
    .calls(callSid)
    .update({
      twiml: twiml.toString(),
      statusCallback: `https://${DOMAIN_NAME}/call-status-handler`
    });

  const syncMapPromises = [];
  // Update the worker's parked calls sync map
  let syncMapName = `${workerSid}.${syncMapSuffix}`;
  let syncMapItemData = {
    attributes,
    callSid,
    dateCreated: (new Date()).toISOString(),
    name,
    queueName,
    workerSid,
    workflowSid
  };
  syncMapPromises.push(addSyncMapItem(syncMapName, callSid, syncMapItemData));

  // Global sync map is used by the call status handler to find the worker associated with
  // a parked call if the caller hangs up while the call is parked
  syncMapName = `Global.${syncMapSuffix}`;
  syncMapPromises.push(addSyncMapItem(syncMapName, callSid, syncMapItemData));

  await Promise.all(syncMapPromises);
  
  response.setBody({
    success: true
  });

  callback(null, response);
});
