import React from 'react';
import {
  ActionStateListener,
  ContentFragment,
  IconButton,
  withTaskContext,
  withTheme
} from '@twilio/flex-ui';
import LoopIcon from '@material-ui/icons/Loop';
import { FlexActions } from '../utils/enums';
import CallService from '../services/CallService';

class ParkButton extends React.PureComponent {
  onClick = async (e) => {
    const { task } = this.props;
    await CallService.parkCall(task)
  }

  render() {
    const { iconSize, theme } = this.props;
    
    return (
      <ContentFragment>
        <ActionStateListener action={[FlexActions.acceptTask, FlexActions.rejectTask]}>
          {(actionState) => (
            <IconButton
              onClick={this.onClick}
              icon={<LoopIcon fontSize={iconSize} />}
              themeOverride={theme.TaskList.Item.Buttons.DefaultButton}
              disabled={actionState.disabled}
              title="Park Call"
            />
          )}
        </ActionStateListener>
      </ContentFragment>
    )
  }
}

export default withTheme(withTaskContext(ParkButton));
