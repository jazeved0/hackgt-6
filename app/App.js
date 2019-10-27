import { Easing, Animated } from "react-native";
import { createStackNavigator } from "react-navigation-stack";
import { createAppContainer } from "react-navigation";

import Login from "./views/Login";
import Mood from "./views/Mood";
import Source from "./views/Source";
import Player from "./views/Player";

const transitionConfig = () => {
  return {
    transitionSpec: {
      duration: 750,
      easing: Easing.out(Easing.poly(4)),
      timing: Animated.timing,
      useNativeDriver: true
    },
    screenInterpolator: sceneProps => {
      const { position, layout, scene } = sceneProps;

      const thisSceneIndex = scene.index;
      const width = layout.initWidth;

      const translateX = position.interpolate({
        inputRange: [thisSceneIndex - 1, thisSceneIndex, thisSceneIndex + 1],
        outputRange: [width, 0, 0]
      });

      const slideFromRight = { transform: [{ translateX }] };

      return slideFromRight;
    }
  };
};

const navigator = createStackNavigator(
  {
    Login,
    Mood,
    Source,
    Player
  },
  {
    headerMode: "none",
    initialRouteName: "Mood",
    transitionConfig
  }
);

export default createAppContainer(navigator);
