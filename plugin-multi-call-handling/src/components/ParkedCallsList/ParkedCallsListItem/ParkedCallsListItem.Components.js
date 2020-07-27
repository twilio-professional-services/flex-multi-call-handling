import styled from 'react-emotion';
import { Icon, getBackgroundWithHoverCSS } from '@twilio/flex-ui';

export const TaskListIcon = styled(Icon)`
  flex: 0 0 44px;
  ${(props) => props.theme.TaskList.Item.Icon}
`;

export const Container = styled('div')`
  display: flex;
  flex: 1 1 auto;
  flex-direction: ${(props) => (props.vertical ? 'column' : 'row')};
  user-select: none;
  height: 44px;
  border-style: solid;
  border-width: 0 0 1px 0;
  overflow-y: hidden;
  cursor: pointer;
  height: ${(props) => (props.large ? '200px' : '44px')};
  ${(props) => props.theme.TaskList.Item.Container}
  ${(props) => (props.selected ? props.theme.TaskList.Item.SelectedContainer : {})}
  ${(props) => getBackgroundWithHoverCSS(
    props.theme.TaskList.Item.Container.background,
    props.theme.TaskList.Item.Container.lightHover
  )}
  ${(props) => (props.selected
    ? getBackgroundWithHoverCSS(
      props.theme.TaskList.Item.SelectedContainer.background,
      props.theme.TaskList.Item.SelectedContainer.lightHover
    )
    : {}
  )}
  & .Twilio-TaskListBaseItem-IconArea {
    background: ${(props) => props.iconColor};
  };
  &:hover {
    & .Twilio-TaskListBaseItem-IconArea {
      ${(props) => props.iconColor && getBackgroundWithHoverCSS(props.iconColor, false, true)};
    }
  }
`;

export const UpperArea = styled('div')`
  height: 44px;
  display: flex;
  flex: auto 0 0;
  width: 100%;
`;

export const Content = styled('div')`
  flex: 1 1 auto;
  overflow: hidden;
`;

export const LowerArea = styled('div')`
  display: flex;
  height: 156px;
  p {
      overflow-y: hidden;
      text-overflow: ellipsis;
  }
  div {
      width: 100%;
      height: 100%;
  }
  iframe {
      width: 100%;
      height: 100%;
  }
`;

export const ActionsContainer = styled('div')`
  height: 44px;
  flex: 0 0 auto;
  display: flex;
  margin-right: 8px;
  button {
    margin-left: 4px;
    margin-right: 4px;
  }
`;

export const SecondLineContainer = styled('div')`
  font-size: 10px;
  margin: 1px 4px 4px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const FirstLineContainer = styled('div')`
  font-size: 12px;
  font-weight: bold;
  margin: 4px 4px 0px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const IconAreaContainer = styled('div')`
  position: relative;
  flex: 0 0 44px;
  display: flex;
`;
