import utils from '../utils/utils';
import FlexState from '../states/FlexState';
import ParkedCallsState from '../states/ParkedCallsState';
import WorkerState from '../states/WorkerState';

class CallService {
  static baseUrl = `https://${process.env.REACT_APP_SERVERLESS_DOMAIN}`

  static parkCall = async (task) => {
    console.debug('Parking call');
    const { attributes, conference, taskSid, workerSid, workflowSid } = task;
    const { name, outbound_to } = attributes;
    const nameValue = name || outbound_to;
    const { participants } = conference;
    const customerParticipant = participants.find(p => p.participantType === 'customer');
    const { callSid } = customerParticipant;

    const parkCallUrl = `${this.baseUrl}/park-call`;
    const fetchBody = {
      Token: FlexState.userToken,
      callSid,
      name: nameValue,
      attributes: JSON.stringify(attributes),
      taskSid,
      workerSid,
      workflowSid
    };
    const fetchOptions = utils.fetchPostUrlEncoded(fetchBody);
    const fetchResponse = await fetch(parkCallUrl, fetchOptions);
    const parkCallResult = await fetchResponse.json();
    console.debug('Park call result:', parkCallResult);
  }

  static pickupParkedCall = async (parkedCall, workerSid) => {
    console.debug('Picking up parked call');
    const { callSid, dateCreated, name, attributes, workflowSid } = parkedCall;
    const conversationId = attributes.conversations.conversation_id;

    ParkedCallsState.enablePickupLock(conversationId);
    WorkerState.lockAcdCallCountUpdate();

    const pickupParkedCallUrl = `${this.baseUrl}/pickup-parked-call`;
    const fetchBody = {
      Token: FlexState.userToken,
      callSid,
      dateCreated,
      name,
      attributes: JSON.stringify(attributes),
      workerSid,
      workflowSid
    };
    const fetchOptions = utils.fetchPostUrlEncoded(fetchBody);
    const fetchResponse = await fetch(pickupParkedCallUrl, fetchOptions);
    const pickupParkedCallResult = await fetchResponse.json();
    console.debug('Pickup parked call result:', pickupParkedCallResult);
  }
}

export default CallService;
