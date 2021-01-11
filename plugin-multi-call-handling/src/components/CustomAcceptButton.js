import React from 'react';
import { connect } from 'react-redux';
import {
  ActionStateListener,
  Actions,
  ContentFragment,
  IconButton,
  TaskHelper,
  templates,
  withTaskContext,
  withTheme
} from '@twilio/flex-ui';
import { FlexActions } from '../utils/enums';

class CustomAcceptButton extends React.PureComponent {
  onClick = (e) => {
    const { task } = this.props;
    Actions.invokeAction(FlexActions.acceptTask, { task });
    
    e.preventDefault();
  }

  render() {
    const { hasRingingOutboundCall, iconSize, task, theme } = this.props;

    const isOutboundCall = TaskHelper.isOutboundCallTask(task);

    let className, icon, themeOverride;
    if (iconSize === 'large') {
      className = 'Twilio-IncomingTask-Accept';
      icon = 'AcceptLarge';
      themeOverride = theme.IncomingTaskCanvas.AcceptTaskButton;
    } else {
      className = 'Twilio-TaskButton-Accept';
      icon = 'Accept'
      themeOverride = theme.TaskList.Item.Buttons.AcceptButton;
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
              title={templates.AcceptTaskTooltip()}
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

export default connect(mapStateToProps)(withTheme(withTaskContext(CustomAcceptButton)));