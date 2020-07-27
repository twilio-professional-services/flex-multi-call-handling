const Twilio = require('twilio');

exports.handler = async function(context, event, callback) {
  const {
    ACCOUNT_SID,
    AUTH_TOKEN,
    WORKSPACE_SID
  } = context;
  const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);
  const {
    extension
  } = event;

  let workers = await client.taskrouter
    .workspaces(WORKSPACE_SID)
    .workers
    .list({
      targetWorkersExpression: `ext == '${extension}'`
    });
  workers = Array.isArray(workers) ? workers : [];
  console.log(`Workers with extension ${extension}:`, workers.length);

  const response = {};
  if (workers.length === 0) {
    response.success = false;
    response.message = `No workers were found with extension ${extension}`;
  } else if (workers.length > 1) {
    response.success = false;
    response.message = `More than one worker was found with extension ${extension}`;
  } else {
    const worker = workers[0];
    response.success = true;
    response.workerSid = worker.sid;
    response.workerActivity = worker.activityName
  }

  callback(null, response);
};
