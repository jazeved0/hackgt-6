import React from "react";
import { View, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 8
  },
  gradient: {
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white"
  }
});

class GradientButton extends React.PureComponent {
  render() {
    const {
      children,
      style,
      text,
      textStyle,
      gradientBegin,
      gradientEnd,
      disabledGradientBegin,
      disabledGradientEnd,
      gradientDirection,
      height,
      width,
      radius,
      impact,
      impactStyle,
      onPressAction,
      purpleViolet,
      violetPink,
      pinkDarkGreen,
      blueViolet,
      blueMarine,
      deepBlue,
      disabled
    } = this.props;

    const purpleVioletColor = ["#7B42F6", "#B01EFF"];
    const violetPinkColor = ["#B01EFF", "#E1467C"];
    const pinkDarkGreenColor = ["#E1467C", "#205284"];
    const blueVioletColor = ["#3672F8", "#B01EFF"];
    const blueMarineColor = ["#14F1D9", "#3672F8"];
    const deepBlueColor = ["#4F73C3", "#3C46A2"];
    const disabledColor = [
      disabledGradientBegin || "#D3D3D3",
      disabledGradientEnd || "#696969"
    ];

    const horizontalGradient = {
      start: { x: 0, y: 0.5 },
      end: { x: 1, y: 0.5 }
    };

    const verticalGradient = {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 }
    };

    const diagonalGradient = {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 }
    };

    return (
      <TouchableOpacity
        style={[styles.button, { height, width }, style]}
        onPress={
          disabled
            ? null
            : () => {
                if (Platform.OS === "ios" && impact === true) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle[impactStyle]);
                }
                if (onPressAction) {
                  return onPressAction();
                }
              }
        }
      >
        <LinearGradient
          style={[styles.gradient, { borderRadius: radius }]}
          colors={
            disabled
              ? disabledColor
              : purpleViolet
              ? purpleVioletColor
              : violetPink
              ? violetPinkColor
              : pinkDarkGreen
              ? pinkDarkGreenColor
              : blueViolet
              ? blueVioletColor
              : blueMarine
              ? blueMarineColor
              : deepBlue
              ? deepBlueColor
              : [gradientBegin, gradientEnd]
          }
          start={
            gradientDirection === "vertical"
              ? verticalGradient.start
              : gradientDirection === "diagonal"
              ? diagonalGradient.start
              : horizontalGradient.start
          }
          end={
            gradientDirection === "vertical"
              ? verticalGradient.end
              : gradientDirection === "diagonal"
              ? diagonalGradient.end
              : horizontalGradient.end
          }
        >
          {children ? (
            <View style={[styles.text, textStyle]}>{children}</View>
          ) : (
            <Text style={[styles.text, textStyle]}>{text}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
}

GradientButton.defaultProps = {
  gradientBegin: "#00d2ff",
  gradientEnd: "#3a47d5",
  gradientDirection: "horizontal",
  height: 75,
  radius: 25,
  impact: false,
  impactStyle: "Heavy",
  textStyle: {},
  disabled: false,
  disabledGradientBegin: "#D3D3D3",
  disabledGradientEnd: "#696969"
};

export default GradientButton;
