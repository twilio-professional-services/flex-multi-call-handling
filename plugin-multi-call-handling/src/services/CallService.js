import { Notifications } from '@twilio/flex-ui';

import utils from '../utils/utils';
import { FlexNotification, ParkedCallOutcome } from '../utils/enums';
import FlexState from '../states/FlexState';
import ParkedCallsState from '../states/ParkedCallsState';
import WorkerState from '../states/WorkerState';

class CallService {
  static parkCall = async (task) => {
    const {
      attributes,
      conference,
      taskSid,
      queueName,
      workerSid,
      workflowSid } = task;

    console.debug('Parking call for task', taskSid);

    ParkedCallsState.setUpdatePending(true);

    const { conversations, caller, name, outbound_to } = attributes;

    const conversationId = (conversations && conversations.conversation_id) || taskSid;
    const newAttributes = {
      ...attributes,
      autoComplete: true,
      conversations: {
        ...attributes.conversations,
        conversation_id: conversationId,
        outcome: ParkedCallOutcome,
      }
    };
    await task.setAttributes(newAttributes);

    const nameValue = name || caller || outbound_to;
    const { participants } = conference;
    const customerParticipant = participants.find(p => p.participantType === 'customer');
    const { callSid } = customerParticipant;

    const parkCallUrl = `${utils.baseServerlessUrl}/park-call`;
    const fetchBody = {
      Token: FlexState.userToken,
      attributes: JSON.stringify(newAttributes),
      callSid,
      name: nameValue,
      queueName,
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
    if (!WorkerState.isInAvailableActivity) {
      Notifications.showNotification(FlexNotification.changeActivityBeforeParkPickup);
      return;
    }

    console.debug('Picking up parked call');
    const {
      attributes,
      callSid,
      dateCreated,
      name,
      queueName,
      workflowSid } = parkedCall;
    const conversationId = attributes.conversations.conversation_id;

    ParkedCallsState.enablePickupLock(conversationId);
    WorkerState.lockAcdCallCountUpdate();

    const pickupParkedCallUrl = `${utils.baseServerlessUrl}/pickup-parked-call`;
    const fetchBody = {
      Token: FlexState.userToken,
      attributes: JSON.stringify(attributes),
      callSid,
      dateCreated,
      name,
      queueName,
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
