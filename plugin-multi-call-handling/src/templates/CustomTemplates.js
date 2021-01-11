import { Manager } from '@twilio/flex-ui';

import { TaskStatus } from '../utils/enums';
import utils from '../utils/utils';

class CustomTemplates {
  constructor() {
    // Uncomment the following line if you'd like to control the default
    // task item lines one and two content
    //this.initializeManagerStrings();
  }

  _manager = Manager.getInstance();

  taskLineTwoDefaultReserved = 'Incoming call from queue {{task.queueName}}';
  taskLineTwoDefaultAssigned = 'Live | {{helper.durationSinceUpdate}}';
  taskLineTwoDefaultWrapup = 'Wrap up | {{helper.durationSinceUpdate}}';

  generateTaskLineTwoString = (status, parkedCall) => {
    let linePrefix = '';
    let lineSuffix = '';

    switch(status) {
      case TaskStatus.reserved: {
        lineSuffix = (
          '{{#if task.attributes.outbound_to}} '
            + 'Outbound Call '
          + '{{else}} {{#if task.attributes.directExtension}} '
            + 'Incoming direct call '
          + '{{else}} '
            + `${this.taskLineTwoDefaultReserved} `
          + '{{/if}}{{/if}}{{/if}}'
        );
        break;
      }
      case TaskStatus.assigned: 
      case TaskStatus.wrapping: {
        linePrefix = status === TaskStatus.assigned
          ? this.taskLineTwoDefaultAssigned
          : this.taskLineTwoDefaultWrapup;

        lineSuffix = (
          '{{#if task.attributes.outbound_to}} '
            + '| Outbound Call '
          + '{{else}} {{#if task.attributes.directExtension}} '
            + '| Direct Call'
          + '{{else}} '
            + '| Queue: {{task.queueName}}'
          + '{{/if}}{{/if}}{{/if}}'
        );
        break;
      }
      case TaskStatus.parked: {
        const { attributes, callerHangup, dateCreated, queueName} = parkedCall;
        const { directExtension, outbound_to } = attributes;

        const duration = utils.getDurationToNow(dateCreated);

        linePrefix = `${callerHangup ? 'Caller hung up' : 'Parked'}`
          + `${duration ? ` | ${duration} ` : ' '}`;
        
        if (outbound_to) {
          lineSuffix = `| Outbound Call`
        } else if (directExtension) {
          lineSuffix = '| Direct Call';
        } else {
          lineSuffix = `| Queue: ${queueName}`
        }
        break;
      }
      default: {
        console.debug('CustomTemplates, generateTaskLineTwoString, unhandled status:', status);
      }
    }

    return `${linePrefix} ${lineSuffix}`;
  }

  initializeManagerStrings = () => {
    this._manager.strings.TaskLineCallReserved = this.generateTaskLineTwoString(TaskStatus.reserved);
    this._manager.strings.TaskLineCallAssigned = this.generateTaskLineTwoString(TaskStatus.assigned);
    this._manager.strings.TaskLineCallWrapup = this.generateTaskLineTwoString(TaskStatus.wrapping);

    this._manager.strings.TaskHeaderStatusPending = this.generateTaskLineTwoString(TaskStatus.reserved);
    this._manager.strings.TaskHeaderStatusAccepted = this.generateTaskLineTwoString(TaskStatus.assigned);
    this._manager.strings.TaskHeaderStatusWrapup = this.generateTaskLineTwoString(TaskStatus.wrapping);
  }
}

const CustomTemplatesSingleton = new CustomTemplates();

export default CustomTemplatesSingleton;
