import { Actions, Manager, TaskHelper, StateHelper } from '@twilio/flex-ui';
import FlexState from '../states/FlexState';
import WorkerState from '../states/WorkerState';
import ParkedCallsState from '../states/ParkedCallsState';
import AcdCallsState from '../states/AcdCallsState';
import CallService from '../services/CallService';
import { ConferenceParticipantTypes, FlexActions, ReservationEvents } from '../utils/enums';
import utils from '../utils/utils';

const reservationListeners = new Map();
const manager = Manager.getInstance();

manager.events.addListener('pluginsLoaded', () => {
  ParkedCallsState.initialize();

  FlexState.workerTasks.forEach(reservation => {
    handleNewReservation(reservation);
  });
});

const stopReservationListeners = (reservation) => {
  const listeners = reservationListeners.get(reservation);
  if (listeners) {
    listeners.forEach(listener => {
      reservation.removeListener(listener.event, listener.callback);
    });
    reservationListeners.delete(reservation);
  }
};

const handleReservationWrapup = async (reservation) => {
  const reservationSid = reservation.sid;
  const task = reservation.task || reservation;
  const { attributes } = task;
  const { autoComplete } = attributes;

  if (utils.hasCustomHoldTime(task)) {
    // Indicates the call disconnected while on hold, so the hold
    // time wasn't updated by a UnholdCall/Participant event

    await updateTaskHoldTalkTime(task);
  }

  if (autoComplete) {
    Actions.invokeAction(FlexActions.completeTask, { sid: reservationSid })
  }
};

const handleInboundAcdCompleted = async () => {
  Actions.invokeAction(FlexActions.updateWorkerAcdCallCount);
};

const handleReservationEnded = (reservation) => {
  const task = reservation.task || reservation;

  if (utils.isInboundAcdCall(task)) {
    handleInboundAcdCompleted();
  }
}

const handleReservationUpdated = (event, reservation) => {
  console.debug('Event, reservation updated', event, reservation);
  switch (event) {
    case ReservationEvents.wrapup: {
      handleReservationWrapup(reservation);
      break;
    }
    case ReservationEvents.completed:
    case ReservationEvents.rejected:
    case ReservationEvents.timeout:
    case ReservationEvents.canceled:
    case ReservationEvents.rescinded: {
      handleReservationEnded(reservation);
      stopReservationListeners(reservation);
      break;
    }
    default:
      break;
  }
};

const initReservationListeners = (reservation) => {
  const trueReservation = reservation.addListener ? reservation : reservation.source;
  stopReservationListeners(trueReservation);
  const listeners = [];
  Object.values(ReservationEvents).forEach(event => {
    const callback = () => handleReservationUpdated(event, trueReservation);
    trueReservation.addListener(event, callback);
    listeners.push({ event, callback });
  });
  reservationListeners.set(trueReservation, listeners);
};

const handleNewReservation = (reservation) => {
  console.debug('new reservation', reservation);
  initReservationListeners(reservation);
};

const handleInboundAcdReservation = (task) => {
  if (WorkerState.workerAcdCallCount === AcdCallsState.acdCallCount) {
    return;
  }

  Actions.invokeAction(FlexActions.updateWorkerAcdCallCount);
}

const releasePickupLockIfParked = (task) => {
  const { attributes } = task;
  const { conversations } = attributes;
  const conversationId = conversations && conversations.conversation_id;
  
  //ParkedCallsState.deleteMatchingParkedCall(conversationId);
  const { pickupLock } = ParkedCallsState;
  console.debug('releasePickupLockIfParked, '
    + `pickupLockEnabled: ${pickupLock.enabled}, `
    + `pickupLockConversationId: ${pickupLock.conversationId}`);
  if (ParkedCallsState.pickupLock.enabled
    && ParkedCallsState.pickupLock.conversationId === conversationId
  ) {
    WorkerState.releaseAcdCallCountUpdate();
    ParkedCallsState.clearPickupLock();
  }
}

const handleReservationCreated = (reservation) => {
  handleNewReservation(reservation);
  const { sid } = reservation;
  const task = TaskHelper.getTaskByTaskSid(sid);
  const { attributes } = task;

  if (attributes && attributes.autoAnswer) {
    Actions.invokeAction(FlexActions.acceptTask, { task });
    Actions.invokeAction(FlexActions.selectTask, { sid });
  }

  releasePickupLockIfParked(task);

  if (utils.isInboundAcdCall(task)) {
    handleInboundAcdReservation(task)
  }
};

manager.workerClient.on('reservationCreated', reservation => {
  handleReservationCreated(reservation);
});

Actions.addListener(`before${FlexActions.acceptTask}`, async payload => {
  const { task } = payload;
  if (!TaskHelper.isCallTask(task)) {
    return;
  }

  let liveCallTask;
  FlexState.workerTasks.forEach(task => {
    if (TaskHelper.isLiveCall(task)) {
      liveCallTask = task;
    }
  });
  
  if (liveCallTask) {
    const { attributes, taskSid } = liveCallTask;
    const { conversations } = attributes;
  
    const conversationId = (conversations && conversations.conversation_id) || taskSid;
    const newAttributes = {
      ...attributes,
      autoComplete: true,
      conversations: {
        ...attributes.conversations,
        conversation_id: conversationId,
        outcome: 'Parked Call'
      }
    };
    await liveCallTask.setAttributes(newAttributes);
    await CallService.parkCall(liveCallTask);
  }
});

Actions.addListener(`after${FlexActions.setActivity}`, async (payload) => {
  // Using this event so a user can easily reset their acdCallsCount attribute
  // with the correct value without refreshing the browser
  Actions.invokeAction(FlexActions.updateWorkerAcdCallCount);
});

const storeHoldEventOnTask = async (task) => {
  const { attributes } = task;

  const newAttributes = {
    ...attributes,
    holdTimestamp: Date.now()
  };

  await task.setAttributes(newAttributes);
};

const calculateTalkTime = (task, holdTime) => {
  const { attributes } = task;
  const { conversations } = attributes;
  const { date } = conversations;
  
  console.debug('Call parked at', new Date(date).toLocaleString());

  const acceptDurationMs = Date.now() - date;
  const acceptDurationSeconds = Math.round(acceptDurationMs / 1000);
  console.debug(`Calculated accept duration: ${acceptDurationSeconds} seconds`);

  return acceptDurationSeconds - holdTime;
}

const calculateHoldTime = (task) => {
  const { attributes } = task;
  const { holdTimestamp, conversations } = attributes;
  const holdTime = conversations && conversations.hold_time;

  const existingHoldTime = holdTime === undefined ? 0 : holdTime;

  let newHoldTime = 0;
  if (holdTimestamp) {
    const newHoldTimeMs = Date.now() - holdTimestamp;
    newHoldTime = Math.round(newHoldTimeMs / 1000);
    console.debug(`Calculated new hold time: ${newHoldTime} seconds`);
  }

  return existingHoldTime + newHoldTime;
}

const updateTaskHoldTime = async (task) => { 
  const { attributes } = task;
  const { holdTimestamp } = attributes;

  if (holdTimestamp) {
    const holdTime = calculateHoldTime(task);
    const newAttributes = {
      ...attributes,
      conversations: {
        ...attributes.conversations,
        hold_time: holdTime
      }
    };
    delete newAttributes.holdTimestamp;

    console.debug(`Setting hold time to ${holdTime} seconds`);
    await task.setAttributes(newAttributes);
  }
}

const updateTaskHoldTalkTime = async (task) => {
  const { attributes } = task;

  const newAttributes = {
    ...attributes
  };

  const holdTime = calculateHoldTime(task);
  const talkTime = calculateTalkTime(task, holdTime);

  newAttributes.conversations = {
    ...attributes.conversations,
    hold_time: holdTime,
    talk_time: talkTime
  };
  delete newAttributes.holdTimestamp;

  console.debug(`Setting hold time to ${holdTime} seconds `
    + `and talk time to ${talkTime} seconds`);
  await task.setAttributes(newAttributes);
}

const handleAfterHoldAction = async (payload, abortAction) => {
  const { participantCallSid, task } = payload;
  const { taskSid } = task;
  
  if (utils.isCustomerParticipant(participantCallSid, taskSid)
    && utils.hasCustomHoldTime(task)
  ) {
    await storeHoldEventOnTask(task);
  }
};

const handleAfterUnholdAction = async (payload, abortAction) => {
  const { participantCallSid, task } = payload;
  const { taskSid, attributes } = task;

  if (utils.isCustomerParticipant(participantCallSid, taskSid)
    && utils.hasCustomHoldTime(task)
  ) {
    await updateTaskHoldTime(task);
  }
}

Actions.addListener(`after${FlexActions.holdCall}`, handleAfterHoldAction);

Actions.addListener(`after${FlexActions.holdParticipant}`, handleAfterHoldAction);

Actions.addListener(`after${FlexActions.unholdCall}`, handleAfterUnholdAction);

Actions.addListener(`after${FlexActions.unholdParticipant}`, handleAfterUnholdAction);
