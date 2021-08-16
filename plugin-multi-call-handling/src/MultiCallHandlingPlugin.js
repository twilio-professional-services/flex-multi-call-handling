import React from 'react';
import { VERSION, TaskHelper } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';

import reducers, { namespace } from './states/MultiCallState';
import CustomTaskListButtons from './components/CustomTaskListButtons';
import CustomIncomingTaskCanvasActions from './components/CustomIncomingTaskCanvasActions';
import ParkButton from './components/ParkButton';
import ParkedCallsList from './components/ParkedCallsList/ParkedCallsList';
import LiveCallsList from './components/LiveCallsList/LiveCallsList';

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
    this.registerReducers(manager);

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

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint: disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    manager.store.addReducer(namespace, reducers);
  }
}
