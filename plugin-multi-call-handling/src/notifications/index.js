import { Manager, Notifications, NotificationType } from '@twilio/flex-ui';

import { FlexNotification } from '../utils/enums';

const manager = Manager.getInstance();

manager.strings[FlexNotification.changeActivityBeforeParkPickup] = (
  'You must be in an available activity to pickup a parked call. '
  + 'Please change to "Online" or "Ready for Queue" and try again.'
);

Notifications.registerNotification({
  id: FlexNotification.changeActivityBeforeParkPickup,
  closeButton: true,
  content: FlexNotification.changeActivityBeforeParkPickup,
  timeout: 5000,
  type: NotificationType.warning,
});
