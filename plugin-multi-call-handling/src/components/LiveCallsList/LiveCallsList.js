import React from 'react';
import { ContentFragment, withTaskContext, withTheme, TaskHelper } from '@twilio/flex-ui';
import {
  LiveCallsListHeader,
  LiveCallsListHeaderContent,
  TasksListContainer
} from './LiveCallsList.Components';

class LiveCallsList extends React.PureComponent {
  renderList = () => {
    return (
      <ContentFragment>
        <LiveCallsListHeader>
          <LiveCallsListHeaderContent>LIVE CALLS</LiveCallsListHeaderContent>
        </LiveCallsListHeader>
      </ContentFragment>
    )
  }

  isLiveCallPresent = () =>  {
    const { tasks } = this.props;
    if (!tasks) {
      return;
    }
    let result = false;
    tasks.forEach(task => {
      if (TaskHelper.isLiveCall(task)) {
        result = true;
      }
    });
    return result;
  }

  render() {
    // if (!parkedCalls || (Array.isArray(parkedCalls) && parkedCalls.length === 0)) {
    //   return null;
    // }
    return ( 
      <TasksListContainer>
        { this.renderList() }
      </TasksListContainer>
    );
  }
}

export default withTaskContext(withTheme(LiveCallsList));
