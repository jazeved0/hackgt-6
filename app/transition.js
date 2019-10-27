import { Animated, Easing, I18nManager } from "react-native";

function forInitial(props) {
  const { navigation, scene } = props;

  const focused = navigation.state.index === scene.index;
  const opacity = focused ? 1 : 0;
  // If not focused, move the scene far away.
  const translate = focused ? 0 : 1000000;
  return {
    opacity,
    transform: [{ translateX: translate }, { translateY: translate }]
  };
}

function forHorizontal(props) {
  const { layout, position, scene } = props;

  if (!layout.isMeasured) {
    return forInitial(props);
  }

  const index = scene.index;
  const inputRange = [index - 1, index, index + 1];

  const width = layout.initWidth;
  const outputRange = I18nManager.isRTL
    ? [-width, 0, width * 1]
    : [width, 0, width * -1];

  const translateY = 0;
  const translateX = position.interpolate({
    inputRange,
    outputRange
  });

  return {
    opacity: 1,
    transform: [{ translateX }, { translateY }]
  };
}

export default function getSlideFromRightTransitionConfig() {
  return {
    transitionSpec: {
      duration: 500,
      easing: Easing.bezier(0.2833, 0.99, 0.31833, 0.99),
      timing: Animated.timing
    },
    screenInterpolator: forHorizontal
  };
}
