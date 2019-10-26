import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";

export default function RoundedButton({ title, style, textStyle, onPress }) {
  return (
    <TouchableOpacity
      style={{ ...styles.BaseStyle, ...style }}
      activeOpacity={0.5}
      onPress={onPress}
    >
      <Text style={{ ...styles.TextStyle, ...textStyle }}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  BaseStyle: {
    marginTop: 10,
    paddingTop: 15,
    paddingBottom: 15,
    marginLeft: 30,
    marginRight: 30,
    backgroundColor: "#00BCD4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff"
  },
  TextStyle: {
    color: "#fff",
    textAlign: "center"
  }
});
