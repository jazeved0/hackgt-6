import React, { useCallback } from "react";
import GradientButton from "../components/GradientButton";

import { StyleSheet, Button, View, Text } from "react-native";

import { BackgroundContainer } from "../styles/block";

export default function Player({ navigation }) {
  const onReturn = useCallback(() => {
    navigation.navigate("Mood");
  });
  const artist = "Lady Gaga"
  const title = "Just Dance";

  // Top level container
  return (
    <View style={styles.topLevelContainer}>
      {/* Return button area */}
      <View style={{ ...styles.padding, ...styles.topContainer }}>
        <GradientButton
        text="Return"
        onPressAction = {onReturn}
        color = {["#000428", "#004e92"]}
        />
      </View>
      {/* Middle album slider */}
      <View style={{}}></View>
      {/* Bottom playback controls */}
      <View style={{ ...styles.padding, ...styles.playbackContainer }}>
        <SongInfo title={title} artist={artist} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topLevelContainer: {
    ...BackgroundContainer,
    flex: 1,
    flexDirection: "column"
  },
  padding: {
    paddingHorizontal: 24
  },
  topContainer: {},
  playbackContainer: {}
});
