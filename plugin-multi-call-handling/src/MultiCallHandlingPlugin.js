import React from 'react';
import { VERSION, TaskHelper } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';

import CustomTaskListButtons from './components/CustomTaskListButtons';
import CustomIncomingTaskCanvasActions from './components/CustomIncomingTaskCanvasActions';
import ParkedCallsList from './components/ParkedCallsList/ParkedCallsList';
import LiveCallsList from './components/LiveCallsList/LiveCallsList';
import './actions/CustomActions';
import './actions/CustomListeners';

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
    console.debug('Service Base URL:', process.env.REACT_APP_SERVICE_BASE_URL);

    const isPendingReservation = (props) => {
      const { task } = props;
      return TaskHelper.isPending(task);
    }

    flex.TaskListButtons.Content.replace(
      <CustomTaskListButtons key='custom-task-list-buttons' />,
      { if: isPendingReservation }
    );

    flex.IncomingTaskCanvasActions.Content.replace(
      <CustomIncomingTaskCanvasActions key='custom-incoming-task-canvas-actions' />,
      { if: isPendingReservation }
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
