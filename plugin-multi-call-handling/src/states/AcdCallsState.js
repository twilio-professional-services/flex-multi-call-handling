import FlexState from './FlexState';
import ParkedCallsState from './ParkedCallsState';

class AcdCallsState {
  get acdConversationIds() {
    const uniqueConversations = new Set();

    FlexState.acdTasks.forEach(task => {
      const { attributes } = task;
      const { conversations } = attributes;
      
      if (conversations && conversations.conversation_id) {
        console.debug('acdCallsState, adding to uniqueConversations:', conversations.conversation_id);
        uniqueConversations.add(conversations.conversation_id);
      } else {
        console.debug('acdCallsState, adding to uniqueConversations:', task.taskSid);
        uniqueConversations.add(task.taskSid);
      }
    });

    ParkedCallsState.parkedAcdCalls.forEach(call => {
      const { callerHangup, attributes } = call;
      const { conversations } = attributes;

      if (callerHangup) {
        return;
      }

      if (conversations && conversations.conversation_id) {
        console.debug('acdCallsState, adding to uniqueConversations:', conversations.conversation_id);
        uniqueConversations.add(conversations.conversation_id);
      }
    })

    console.debug('acdCallsState, uniqueConversations:', uniqueConversations);
    return uniqueConversations;
  }

  get acdCallCount() {
    return this.acdConversationIds.size;
  }
}

const AcdCallsStateSingleton = new AcdCallsState();

export default AcdCallsStateSingleton;
