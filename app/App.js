import { Easing, Animated } from "react-native";
import { createStackNavigator } from "react-navigation-stack";
import { createAppContainer } from "react-navigation";

import Login from "./views/Login";
import Mood from "./views/Mood";
import Source from "./views/Source";
import Player from "./views/Player";

import getSlideFromRightTransitionConfig from "./transition";

console.disableYellowBox = true;

const navigator = createStackNavigator(
  {
    Login,
    Mood,
    Source,
    Player
  },
  {
    headerMode: "none",
    initialRouteName: "Login",
    transitionConfig: getSlideFromRightTransitionConfig
  }
);

export default createAppContainer(navigator);
