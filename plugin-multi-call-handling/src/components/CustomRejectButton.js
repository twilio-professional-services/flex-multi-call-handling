import React from 'react';
import { connect } from 'react-redux';
import {
  ActionStateListener,
  Actions,
  ContentFragment,
  IconButton,
  Manager,
  TaskHelper,
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
    const { hasRingingOutboundCall, iconSize, task, theme } = this.props;
    const { attributes: taskAttributes } = task;
    const { isDirectCall } = taskAttributes;
    const { attributes: workerAttributes } = Manager.getInstance().workerClient;
    const { isVoicemailEnabled } = workerAttributes;

    const isOutboundCall = TaskHelper.isOutboundCallTask(task);

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
              disabled={
                actionState.disabled
                && (isOutboundCall || !hasRingingOutboundCall)
              }
              title={tooltip}
            />
          )}
        </ActionStateListener>
      </ContentFragment>
    )
  }
}

const mapStateToProps = (state) => {
  const workerTasks = state?.flex?.worker?.tasks || [];
  const hasRingingOutboundCall = [...workerTasks.values()]
    .some(task => TaskHelper.isInitialOutboundAttemptTask(task));

  return {
    hasRingingOutboundCall
  }
}

export default connect(mapStateToProps)(withTheme(withTaskContext(CustomRejectButton)));
