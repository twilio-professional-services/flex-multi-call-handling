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
    SYNC_SERVICE_SID
  } = context;
  const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

  const {
    attributes,
    callSid,
    dateCreated,
    name,
    queueName,
    workerSid,
    workflowSid
  } = event;

  const syncMapSuffix = 'ParkedCalls';

  const deleteSyncMapItem = (mapName, itemKey) => {
    console.log(`Deleting ${itemKey} from Sync Map ${mapName}`);
    return client.sync
      .services(SYNC_SERVICE_SID)
      .syncMaps(mapName)
      .syncMapItems(itemKey)
      .remove();
  };

  const convertMsToSec = (ms) => {
    return Math.round(ms / 1000);
  };

  let newAttributes = attributes && JSON.parse(attributes);

  // Converting the task age to hold time so the time they spent parked is
  // counted as hold time in Flex Insights
  const holdDuration = convertMsToSec(Date.now() - Date.parse(dateCreated));
 
  newAttributes = {
    ...newAttributes,
    autoComplete: undefined,
    autoAnswer: true,
    isParkPickup: true,
    targetWorker: workerSid,
    conversations: {
      ...newAttributes.conversations,
      outcome: undefined,
      date: Date.parse(dateCreated),
      hold_time: holdDuration,
      queue_time: 0 // We don't want this task to increase queue time metrics
    }
  };
  if (!newAttributes.name) {
    newAttributes.name = name;
  }
  if (!newAttributes.conversations.queue) {
    newAttributes.conversations.queue = queueName;
  }

  const twiml = new Twilio.twiml.VoiceResponse();
  twiml
    .enqueue({
      workflowSid
    })
    .task({
      priority: '1000'
    }, JSON.stringify(newAttributes));

  console.log(`Updating call ${callSid} with new TwiML ${twiml.toString()}`);
  try {
    await client.calls(callSid).update({ twiml: twiml.toString() });
  } catch (error) {
    console.error('Failed to update call.', error);
  }

  const syncMapPromises = [];
  let syncMapName = `${workerSid}.${syncMapSuffix}`;
  syncMapPromises.push(deleteSyncMapItem(syncMapName, callSid));

  // Global sync map is used by the call status handler to find the worker associated with
  // a parked call if the caller hangs up while the call is parked
  syncMapName = `Global.${syncMapSuffix}`;
  syncMapPromises.push(deleteSyncMapItem(syncMapName, callSid));

  await Promise.all(syncMapPromises);
  
  response.setBody({
    success: true
  });

  callback(null, response);
});
