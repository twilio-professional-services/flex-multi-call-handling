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
    WORKSPACE_SID,
  } = context;
  const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

  const {
    taskSid,
    workerSid
  } = event;

  const reservationAcceptedEvents = await client.taskrouter
    .workspaces(WORKSPACE_SID)
    .events
    .list({
      eventType: 'reservation.accepted',
      minutes: 1440,
      taskSid,
      workerSid
    });
  
  console.log('Reservation Accepted Event properties:')
  Object.keys(reservationAcceptedEvents).forEach(key => {
    console.log(`${key}: ${reservationAcceptedEvents[key]}`);
  });
  
  response.setBody({
    success: true
  });

  callback(null, response);
});
