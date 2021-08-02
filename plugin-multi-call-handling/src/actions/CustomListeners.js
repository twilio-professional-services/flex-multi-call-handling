import { Actions, Manager, TaskHelper } from '@twilio/flex-ui';
import FlexState from '../states/FlexState';
import SharedState from '../states/SharedState';
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

let _isPendingOutboundCall = false;

manager.events.addListener('pluginsLoaded', async () => {
  await ParkedCallsState.initialize();
  WorkerState.initialize();

  FlexState.workerTasks.forEach(reservation => {
    handleNewReservation(reservation);
  });

  updateIsAcdReadyIfNeeded();
  updateVoiceChannelCapacityIfNeeded();
});

// When changing to an ACD Ready Activity, the TaskRouter worker
// activity change has to happen before the worker's attributes
// are updated. This helper function is used to determine if the
// worker attribute updated should occur in beforeSetActivity
// (non-ACD Ready Activities) or afterSetActivity (ACD Ready Activities)
const calculateIsAcdReady = () => {
  let isAcdReady = true;

  if (!WorkerState.isInAvailableActivity) {
    isAcdReady = false;
  }
  else if (ParkedCallsState.hasParkedCall
    || FlexState.hasCallTask
	) {
		isAcdReady = false;
	}

	console.debug('calculateIsAcdReady, isAcdReady:', isAcdReady);
	return isAcdReady;
};

const updateIsAcdReadyIfNeeded = async () => {
	const isAcdReady = calculateIsAcdReady();

	if (WorkerState.workerAttributes.isAcdReady !== isAcdReady){
		let attrToUpdate = { isAcdReady };
		await WorkerState.updateWorkerAttributes(attrToUpdate);

		console.debug('updateIsAcdReadyIfNeeded: Worker attributes updated', attrToUpdate);
	}
}

const calculateTargetVoiceChannelCapacity = () => {
	let targetCapacity = WorkerState.defaultVoiceChannelCapacity;


  if (ParkedCallsState.hasParkedCall
    && !ParkedCallsState.isUpdatePending
	) {
    // With a parked call present, capacity must be one greater than the number
    // of call tasks to allow retrieval of the parked call
		targetCapacity = FlexState.workerCallTasks.length + 1;
	}
	else if (FlexState.hasActiveCallTask) {
		targetCapacity = WorkerState.multiCallVoiceChannelCapacity;
	}

	console.debug('calculateTargetVoiceChannelCapacity, targetCapacity:', targetCapacity);
	return targetCapacity;
};

const updateVoiceChannelCapacityIfNeeded = async (options) => {
	let targetVoiceChannelCapacity;
	
	if (options && options.beforeHangupCall) {
		const { payload } = options.beforeHangupCall;
		const { task } = payload;

		if (TaskHelper.isInitialOutboundAttemptTask(task)) {
			targetVoiceChannelCapacity = WorkerState.defaultVoiceChannelCapacity;
		} else {
			// Only want to modify channel capacity for HangupCall if it's the
			// initial outbound attempt task
			return;
		}
	} else {
		targetVoiceChannelCapacity = calculateTargetVoiceChannelCapacity();
	}

	if (WorkerState.voiceChannelCapacity !== targetVoiceChannelCapacity) {
		await SharedState.updateVoiceChannelCapacity(targetVoiceChannelCapacity);
	} else {
		console.debug(`Voice channel capacity is already ${targetVoiceChannelCapacity}. No update needed.`);
	}
}

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

const handleReservationAccepted = async (reservation) => {
  const reservationSid = reservation.sid;
  const task = reservation.task || reservation;
  const { attributes } = task;
  const { isParkHangup } = attributes;

  if (isParkHangup) {
    Actions.invokeAction(FlexActions.wrapupTask, { sid: reservationSid });
  }

  await updateIsAcdReadyIfNeeded(WorkerState.workerActivityName);
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

const handleInboundAcdCompleted = async () => {
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

  // if (ParkedCallsState.isUpdatePending || ParkedCallsState.hasParkedCall) {
	// 	await updateIsAcdReadyIfNeeded(WorkerState.workerActivitySid);
  // }
  
  await updateVoiceChannelCapacityIfNeeded();
  await updateIsAcdReadyIfNeeded();
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

const handleReservationCreated = async (reservation) => {
  handleNewReservation(reservation);
  const { sid } = reservation;
  const task = TaskHelper.getTaskByTaskSid(sid);
  const { attributes } = task;
  const { autoAnswer, isParkHangup } = attributes;

  if (TaskHelper.isOutboundCallTask(reservation.task) && _isPendingOutboundCall) {
		_isPendingOutboundCall = false;
	}

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

  await updateIsAcdReadyIfNeeded();
	await updateVoiceChannelCapacityIfNeeded();
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

Actions.addListener(`before${FlexActions.hangupCall}`, async (payload) => {
  const options = {
		beforeHangupCall: {
			payload
		}
	};
	await updateVoiceChannelCapacityIfNeeded(options);
})

Actions.addListener(`before${FlexActions.completeTask}`, async (payload) => {
	await updateVoiceChannelCapacityIfNeeded();
})

Actions.addListener(`before${FlexActions.setActivity}`, async (payload) => {
	await updateVoiceChannelCapacityIfNeeded();
})

Actions.addListener(`after${FlexActions.setActivity}`, async (payload) => {
  // Using this event so a user can easily reset their acdCallsCount attribute
  // with the correct value without refreshing the browser
  Actions.invokeAction(FlexActions.updateWorkerAcdCallCount);

  await updateIsAcdReadyIfNeeded();
});

Actions.addListener(`before${FlexActions.startOutboundCall}`, (payload, abortFunction) => {
	_isPendingOutboundCall = true;
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

  newAttributes.conversations = {
    ...attributes.conversations,
    hold_time: holdTime,
  };
  delete newAttributes.holdTimestamp;

  console.debug(`Setting hold time to ${holdTime} seconds`);
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
