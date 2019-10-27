import React from "react";
import LibraryGradientButton from "./LibraryGradientButton";

export default function GradientButton({
  text,
  onPress,
  color,
  textStyle,
  ...rest
}) {
  let props = {};
  if (typeof color === "string") {
    props = { [color]: true };
  } else if (typeof color === "object") {
    props = { gradientBegin: color[0], gradientEnd: color[1] };
  }
  return (
    <LibraryGradientButton
      text={text}
      gradientDirection="diagonal"
      textStyle={{ fontSize: 20, ...textStyle }}
      radius={10}
      onPressAction={onPress}
      impact
      {...props}
      {...rest}
    />
  );
}
