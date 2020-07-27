export const ReservationEvents = {
  accepted: 'accepted',
  rejected: 'rejected',
  timeout: 'timeout',
  canceled: 'canceled',
  rescinded: 'rescinded',
  completed: 'completed',
  wrapup: 'wrapup'
};

export const FlexActions = {
  acceptTask: 'AcceptTask',
  completeTask: 'CompleteTask',
  hangupCall: 'HangupCall',
  holdCall: 'HoldCall',
  holdParticipant: 'HoldParticipant',
  rejectTask: 'RejectTask',
  selectTask: 'SelectTask',
  setActivity: 'SetActivity',
  setComponentState: 'SetComponentState',
  unholdCall: 'UnholdCall',
  unholdParticipant: 'UnholdParticipant',
  updateWorkerAcdCallCount: 'UpdateWorkerAcdCallCount',
};

export const ConferenceParticipantTypes = {
  customer: 'customer',
  unknown: 'unknown',
  worker: 'worker'
};

export const TaskDirections = {
  inbound: 'inbound',
  outbound: 'outbound'
};

export const TaskStatus = {
  reserved: 'reserved',
  assigned: 'assigned',
  wrapping: 'wrapping'
};
