import { TaskHelper } from '@twilio/flex-ui';
import FlexState from '../states/FlexState';
import { ConferenceParticipantTypes, TaskDirections } from './enums';

const fetchPostUrlEncoded = (body) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams(body)
});

const msToTime = (duration) => {
  let seconds = parseInt((duration / 1000) % 60);
  let minutes = parseInt((duration / (1000 * 60)) % 60);
  let hours = parseInt((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? `0${hours}` : hours;
  minutes = (minutes < 10) ? `0${minutes}` : minutes;
  seconds = (seconds < 10) ? `0${seconds}` : seconds;

  return `${hours === '00' ? '' : `${hours}:`}${minutes}:${seconds}`;
};

const isCustomerParticipant = (participantCallSid, taskSid) => {
  const conference = FlexState.conferences.get(taskSid);
  const conferenceSource = conference && conference.source;
  const conferenceParticipants = (conferenceSource && conferenceSource.participants) || [];

  const heldParticipant = conferenceParticipants.find(p => p.callSid === participantCallSid);
  const participantType = heldParticipant && heldParticipant.participantType;

  return participantType === ConferenceParticipantTypes.customer;
};

const isInboundAcdCall = (task, isParkedCall) => {
  const { attributes } = task;
  const { direction, isDirectCall } = attributes;

  return ((TaskHelper.isCallTask(task) || isParkedCall)
    && direction === TaskDirections.inbound
    && !isDirectCall);
};

const hasCustomHoldTime = (task) => {
  const { attributes } = task;
  const { conversations } = attributes;

  return !!(conversations && conversations.hold_time);
}

export default {
  fetchPostUrlEncoded,
  hasCustomHoldTime,
  isCustomerParticipant,
  isInboundAcdCall,
  msToTime
};

