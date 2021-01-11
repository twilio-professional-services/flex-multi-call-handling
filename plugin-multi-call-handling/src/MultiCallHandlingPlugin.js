import React from 'react';
import { VERSION, TaskHelper } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';

import CustomTaskListButtons from './components/CustomTaskListButtons';
import CustomIncomingTaskCanvasActions from './components/CustomIncomingTaskCanvasActions';
import ParkButton from './components/ParkButton';
import ParkedCallsList from './components/ParkedCallsList/ParkedCallsList';
import LiveCallsList from './components/LiveCallsList/LiveCallsList';

import './actions/CustomActions';
import './actions/CustomListeners';
import './notifications';

const PLUGIN_NAME = 'MultiCallHandlingPlugin';

export default class MultiCallHandlingPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  init(flex, manager) {
    console.debug('Flex UI version', VERSION);

    const isPendingCall = (props) => {
      const { task } = props;
      return TaskHelper.isCallTask(task) && TaskHelper.isPending(task);
    }

    const isLiveCall = (props) => {
      const { task } = props;
      return TaskHelper.isLiveCall(task);
    }

    flex.TaskListButtons.Content.replace(
      <CustomTaskListButtons key="custom-task-list-buttons" />,
      { if: isPendingCall }
    );

    flex.TaskListButtons.Content.add(
      <ParkButton key="task-list-park-button" iconSize="small" />,
      { if: isLiveCall, sortOrder: -1 }
    );

    flex.IncomingTaskCanvasActions.Content.replace(
      <CustomIncomingTaskCanvasActions key='custom-incoming-task-canvas-actions' />,
      { if: isPendingCall }
    );

    flex.TaskList.Content.add(
      <ParkedCallsList key="parked-calls-list" />,
      { sortOrder: -2 }
    );

    flex.NoTasksCanvas.Content.add(
      <ParkedCallsList key="parked-calls-list" />,
      { sortOrder: -2 }
    );

    flex.TaskList.Content.add(
      <LiveCallsList key="live-calls-list" />,
      { sortOrder: -1 }
    );
  }
}
