import React from 'react';
import {
  ActionStateListener,
  Actions,
  ContentFragment,
  IconButton,
  Manager,
  withTaskContext,
  withTheme
} from '@twilio/flex-ui';
import { FlexActions } from '../utils/enums';

class CustomRejectButton extends React.PureComponent {
  onClick = (e) => {
    const { task } = this.props;
    Actions.invokeAction(FlexActions.rejectTask, { task });
    
    e.preventDefault();
  }

  render() {
    const { iconSize, task, theme } = this.props;
    const { attributes: taskAttributes } = task;
    const { isDirectCall } = taskAttributes;
    const { attributes: workerAttributes } = Manager.getInstance().workerClient;
    const { isVoicemailEnabled } = workerAttributes;

    const tooltip = isDirectCall && isVoicemailEnabled
      ? 'Send to Voicemail'
      : 'Ignore Call'

    let className, icon, themeOverride;
    if (iconSize === 'large') {
      className = 'Twilio-IncomingTask-Reject';
      icon = 'CloseLarge';
      themeOverride = theme.IncomingTaskCanvas.RejectTaskButton;
    } else {
      className = 'Twilio-TaskButton-Reject';
      icon = 'Close'
      themeOverride = theme.TaskList.Item.Buttons.RejectButton;
    }

    return (
      <ContentFragment>
        <ActionStateListener action={[FlexActions.acceptTask, FlexActions.rejectTask]}>
          {(actionState) => (
            <IconButton
              className={className}
              themeOverride={themeOverride}
              onClick={this.onClick}
              icon={icon}
              disabled={actionState.disabled}
              title={tooltip}
            />
          )}
        </ActionStateListener>
      </ContentFragment>
    )
  }
}

export default withTheme(withTaskContext(CustomRejectButton));
