import React from 'react';
import {
  ContentFragment
} from '@twilio/flex-ui';

import CustomAcceptButton from './CustomAcceptButton';
import CustomRejectButton from './CustomRejectButton';

class CustomIncomingTaskCanvasActions extends React.Component {

  render() {
    return (
      <ContentFragment>
        <CustomAcceptButton iconSize='large' />
        <CustomRejectButton iconSize='large' />
      </ContentFragment>
    )
  }
}

export default CustomIncomingTaskCanvasActions;