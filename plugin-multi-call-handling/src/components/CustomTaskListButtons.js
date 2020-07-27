import React from 'react';
import {
  ContentFragment
} from '@twilio/flex-ui';

import CustomAcceptButton from './CustomAcceptButton';
import CustomRejectButton from './CustomRejectButton';

class CustomTaskListButtons extends React.Component {
  render() {
    return (
      <ContentFragment>
        <CustomAcceptButton />
        <CustomRejectButton />
      </ContentFragment>
    )
  }
}

export default CustomTaskListButtons;