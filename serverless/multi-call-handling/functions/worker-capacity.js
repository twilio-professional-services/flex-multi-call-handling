const TokenValidator = require('twilio-flex-token-validator').functionValidator;
const Twilio = require('twilio');

exports.handler = TokenValidator(async function(context, event, callback) {
  const {
    ACCOUNT_SID,
    AUTH_TOKEN,
    WORKSPACE_SID
  } = context;

  const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST GET');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.appendHeader('Content-Type', 'application/json');

  const {
    capacity,
    workerChannelSid,
    workerSid,
  } = event;

  let message = "";
  if (capacity === undefined || capacity === 'undefined') {
    message += 'Missing capacity parameter. ';
  }
  if (workerChannelSid === undefined || workerChannelSid === 'undefined') {
    message += 'Missing workerChannelSid parameter. ';
  }
  if (workerSid === undefined || workerSid === 'undefined') {
    message += 'Missing workerSid parameter. ';
  }

  if (message !== "") {
    response.setBody({ message });
    response.setStatusCode(400);
    return callback(null, response);
  }

  try {
    console.log(`Setting worker ${workerSid} channel ${workerChannelSid} to capacity ${capacity}`);
    const workerChannel = await client.taskrouter
      .workspaces(WORKSPACE_SID)
      .workers(workerSid)
      .workerChannels(workerChannelSid)
      .update({ capacity });
    
    response.setBody({
      sid: workerChannel.sid,
      configuredCapacity: workerChannel.configuredCapacity,
      dateUpdated: workerChannel.dateUpdated,
      taskChannelUniqueName: workerChannel.taskChannelUniqueName
    });
  } catch (error) {
    response.setBody({ message: error.message });
    response.setStatusCode(500);
  }

  callback(null, response);
});
