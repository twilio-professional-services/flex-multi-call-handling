import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import {
  withTaskContext,
  withTheme
} from '@twilio/flex-ui';

import {
  Container,
  Content,
  FirstLineContainer,
  IconAreaContainer,
  SecondLineContainer,
  TaskListIcon,
  UpperArea
} from './ParkedCallsListItem.Components';
import CallService from '../../../services/CallService';
import utils from '../../../utils/utils';
import { TaskStatus } from '../../../utils/enums';
import WorkerState from '../../../states/WorkerState';
import CustomTemplates from '../../../templates/CustomTemplates';

class ParkedCallsListItem extends React.PureComponent {
  refreshTimer;

  componentWillMount() {
    this.refreshTimer = setInterval(() => this.forceUpdate(), 1000);
  }

  componentWillUnmount() {
    if (this.refreshTimer !== undefined) {
      clearInterval(this.refreshTimer);
    }
  }

  handleContainerClick = () => {
    const { parkedCall } = this.props;
    console.debug('Container clicked for parked call', parkedCall.callSid);
  }

  handleContainerDoubleClick = async () => {
    const { parkedCall } = this.props;
    console.debug('Container double clicked for parked call', parkedCall.callSid);
    await CallService.pickupParkedCall(parkedCall, WorkerState.workerSid);
  }

  getDuration = (dateCreated) => {
    if (!dateCreated) {
      return undefined;
    }
    const duration = Date.now() - Date.parse(dateCreated);
    return utils.msToTime(duration);
  }

  render() {
    const { parkedCall, theme } = this.props;
    const { callerHangup, name } = parkedCall;

    const itemProps = {
      icon: callerHangup ? 'Hangup' : 'Call',
      iconColor: callerHangup ? '#a0a8bd' : theme.colors.holdColor,
      firstLine: name || '',
      secondLine: CustomTemplates.generateTaskLineTwoString(TaskStatus.parked, parkedCall),
      extraInfo: 'none'
    };
    return (
      <Container
        className="Twilio-TaskListBaseItem"
        iconColor={itemProps.iconColor}
        onClick={this.handleContainerClick}
        onDoubleClick={this.handleContainerDoubleClick}
      >
        <Tooltip title="Double-click to pickup" enterDelay={500}>
          <UpperArea className="Twilio-TaskListBaseItem-UpperArea">
            <IconAreaContainer className="Twilio-TaskListBaseItem-IconAreaContainer">
              <TaskListIcon
                className="Twilio-TaskListBaseItem-IconArea"
                icon={itemProps.icon}
              />
            </IconAreaContainer>
            <Content className="Twilio-TaskListBaseItem-Content">
              <FirstLineContainer className="Twilio-TaskListBaseItem-FirstLine">
                {itemProps.firstLine}
              </FirstLineContainer>
              <SecondLineContainer className="Twilio-TaskListBaseItem-SecondLine">
                {itemProps.secondLine}
              </SecondLineContainer>
            </Content>
          </UpperArea>
        </Tooltip>
      </Container>
    );
  }
}

export default withTaskContext(withTheme(ParkedCallsListItem));
