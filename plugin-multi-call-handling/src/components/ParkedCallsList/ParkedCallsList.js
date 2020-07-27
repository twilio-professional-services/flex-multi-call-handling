import React from 'react';
import { connect } from 'react-redux';
import FlipMove from 'react-flip-move';
import { ContentFragment, FlexBox, withTaskContext, withTheme } from '@twilio/flex-ui';
import {
  NoTasksCanvasContainer,
  ParkedCallsListHeader,
  ParkedCallsListHeaderContent,
  TasksListContainer
} from './ParkedCallsList.Components';
import ParkedCallsListItem from './ParkedCallsListItem/ParkedCallsListItem';

const ANIMATION_DURATION = 0.3 * 1000;
const ENTER_ANIMATION = {
    from: {
        transform: "translateY(-45px)"
    },
    to: {
        transform: ""
    }
};

class ParkedCallsList extends React.PureComponent {
  refreshTimer;

  componentWillMount() {
    this.refreshTimer = setInterval(() => this.forceUpdate(), 1000);
  }

  componentWillUnmount() {
    if (this.refreshTimer !== undefined) {
      clearInterval(this.refreshTimer);
    }
  }

  shouldShowParkedCall = (parkedCall) => {
    const { callerHangup, callerHangupTime } = parkedCall;
    if (!callerHangup) {
      return true;
    }
    const staleCallExpiration = Date.parse(callerHangupTime) - Date.now();
    return staleCallExpiration > -15000 ? true : false;
  }

  renderList = (visibleParkedCalls) => {
    return (
      <ContentFragment>
        <ParkedCallsListHeader>
          <ParkedCallsListHeaderContent>PARKED CALLS</ParkedCallsListHeaderContent>
        </ParkedCallsListHeader>
        <FlexBox vertical noShrink>
          <FlipMove
            key='parked-calls-list-contents'
            easing='ease-in'
            duration={ANIMATION_DURATION}
            appearAnimation='fade'
            enterAnimation={ENTER_ANIMATION}
            leaveAnimation='none'
          >
            {
              visibleParkedCalls.length > 0
                ? visibleParkedCalls.map(call => <ParkedCallsListItem key={call.callSid} parkedCall={call} />)
                : null // : (
                //   <NoCallsContainer>
                //     <span>{'No parked calls'}</span>
                //   </NoCallsContainer>
                // )
            }
          </FlipMove>
        </FlexBox>
      </ContentFragment>
    )
  }

  render() {
    const { parkedCalls, tasks } = this.props;
    const visibleParkedCalls = parkedCalls.filter(c => this.shouldShowParkedCall(c));
    // if (!parkedCalls || (Array.isArray(parkedCalls) && parkedCalls.length === 0)) {
    //   return null;
    // }
    return ( tasks && tasks.size > 0
      ? <TasksListContainer>
        { this.renderList(visibleParkedCalls) }
      </TasksListContainer>
      : visibleParkedCalls.length === 0 ? null : 
        <NoTasksCanvasContainer>
          { this.renderList(visibleParkedCalls) }
        </NoTasksCanvasContainer>
    );
  }
}

const mapStateToProps = (state) => {
  const { componentViewStates } = state.flex.view;
  const parkedCallsState = (componentViewStates && componentViewStates.ParkedCallsState) || {};
  const parkedCalls = (parkedCallsState && parkedCallsState.parkedCalls) || new Map();
  return {
    parkedCalls: Array.from(parkedCalls.values()),
  };
};

export default connect(mapStateToProps)(withTaskContext(withTheme(ParkedCallsList)));
