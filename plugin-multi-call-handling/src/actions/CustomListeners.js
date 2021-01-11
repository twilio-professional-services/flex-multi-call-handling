import { Actions, Manager, TaskHelper } from '@twilio/flex-ui';
import FlexState from '../states/FlexState';
import WorkerState from '../states/WorkerState';
import ParkedCallsState from '../states/ParkedCallsState';
import AcdCallsState from '../states/AcdCallsState';
import CallService from '../services/CallService';
import {
  FlexActions,
  ParkedCallOutcome,
  ReservationEvents,
} from '../utils/enums';
import utils from '../utils/utils';

const reservationListeners = new Map();
const actionsPendingReservationEnded = new Map();
const manager = Manager.getInstance();

manager.events.addListener('pluginsLoaded', () => {
  ParkedCallsState.initialize();
  WorkerState.initialize();

  FlexState.workerTasks.forEach(reservation => {
    handleNewReservation(reservation);
  });
});

//#region Reservation Event Listeners and Handlers
const stopReservationListeners = (reservation) => {
  const listeners = reservationListeners.get(reservation);
  if (listeners) {
    listeners.forEach(listener => {
      reservation.removeListener(listener.event, listener.callback);
    });
    reservationListeners.delete(reservation);
  }
};

const handleReservationAccepted = (reservation) => {
  const reservationSid = reservation.sid;
  const task = reservation.task || reservation;
  const { attributes } = task;
  const { isParkHangup } = attributes;

  if (isParkHangup) {
    Actions.invokeAction(FlexActions.wrapupTask, { sid: reservationSid });
  }
}

const handleReservationWrapup = async (reservation) => {
  const reservationSid = reservation.sid;
  const task = reservation.task || reservation;
  const { attributes } = task;
  const { autoComplete, isParkHangup } = attributes;

  if (utils.hasCustomHoldTime(task) && !isParkHangup) {
    // Indicates the call disconnected while on hold, so the hold
    // time wasn't updated by a UnholdCall/Participant event

    await updateTaskHoldTalkTime(task);
  }

  if (autoComplete) {
    Actions.invokeAction(FlexActions.completeTask, { sid: reservationSid })
  }
};

const handleInboundAcdCompleted = () => {
  Actions.invokeAction(FlexActions.updateWorkerAcdCallCount);
};

const handleReservationEnded = async (reservation) => {
  const task = reservation.task || reservation;
  const { attributes } = task;
  const { call_sid, conversations } = attributes;

  console.debug('handleReservationEnded, actionsPendingReservationEnded:', actionsPendingReservationEnded);
  console.debug('handleReservationEnded, reservation:', reservation);
  const pendingAction = actionsPendingReservationEnded.get(reservation.sid);

  if (pendingAction) {
    console.debug('handleReservationEnded, pendingAction:', pendingAction);
    actionsPendingReservationEnded.delete(reservation.sid);
    Actions.invokeAction(pendingAction.action, pendingAction.payload);
  }

  if (!TaskHelper.isCallTask(task)) {
    return;
  }

  if (call_sid && conversations?.outcome !== ParkedCallOutcome) {
    await ParkedCallsState.deleteParkedCall(call_sid);
  }

  if (utils.isInboundAcdCall(task)) {
    handleInboundAcdCompleted();
  }
}

const handleReservationUpdated = (event, reservation) => {
  console.debug('Event, reservation updated', event, reservation);
  switch (event) {
    case ReservationEvents.accepted: {
      handleReservationAccepted(reservation);
      break; 
    }
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
  const { attributes } = task;
  const { call_sid, isParkHangup } = attributes;

  if (isParkHangup) {
    ParkedCallsState.updateIsReservationPending(false, call_sid);
  }

  if (WorkerState.workerAcdCallCount === AcdCallsState.acdCallCount) {
    return;
  }

  Actions.invokeAction(FlexActions.updateWorkerAcdCallCount);
}

const releasePickupLockIfParked = (task) => {
  const { attributes } = task;
  const { conversations } = attributes;
  const conversationId = conversations && conversations.conversation_id;
  
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
  const { autoAnswer, isParkHangup } = attributes;

  if (isParkHangup) {
    task.sourceObject.accept();
    if (!FlexState.selectedTaskSid) {
      Actions.invokeAction(FlexActions.selectTask, { sid });
    }
  }
  else if (autoAnswer) {
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
//#endregion Reservation Event Listeners and Handlers

//#region Flex Actions Event Listeners and Handlers
Actions.addListener(`before${FlexActions.acceptTask}`, async (payload, abortAction) => {
  const { task } = payload;
  const { attributes } = task;
  const { isParkHangup } = attributes;

  if (!TaskHelper.isCallTask(task)
    || TaskHelper.isInitialOutboundAttemptTask(task)
    || isParkHangup
  ) {
    return;
  }

  let liveCallTask;
  let ringingOutboundTask;
  FlexState.workerTasks.forEach(task => {
    if (TaskHelper.isLiveCall(task)) {
      liveCallTask = task;
    }
    else if (TaskHelper.isInitialOutboundAttemptTask(task)) {
      ringingOutboundTask = task;
    }
  });
  
  if (liveCallTask) {
    await CallService.parkCall(liveCallTask);
  }
  else if (ringingOutboundTask) {
    actionsPendingReservationEnded.set(ringingOutboundTask.sid, {
      action: FlexActions.acceptTask,
      payload
    });
    Actions.invokeAction(FlexActions.hangupCall, { task: ringingOutboundTask });
    abortAction();
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

const handleAfterHoldAction = async (payload) => {
  const { participantCallSid, task } = payload;
  const { taskSid } = task;
  
  if (utils.isCustomerParticipant(participantCallSid, taskSid)
    && utils.hasCustomHoldTime(task)
  ) {
    await storeHoldEventOnTask(task);
  }
};

const handleAfterUnholdAction = async (payload) => {
  const { participantCallSid, task } = payload;
  const { taskSid } = task;

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
//#endregion Flex Actions Event Listeners and Handlers
