import React from 'react';
import {
  ActionStateListener,
  Actions,
  ContentFragment,
  IconButton,
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
    const { iconSize, theme } = this.props;

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
              disabled={actionState.disabled}
              title={templates.AcceptTaskTooltip()}
            />
          )}
        </ActionStateListener>
      </ContentFragment>
    )
  }
}

export default withTheme(withTaskContext(CustomAcceptButton));