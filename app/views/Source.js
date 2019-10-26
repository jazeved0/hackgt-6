import React from "react";

import { View, Text } from "react-native";
import GradientButton from "../components/GradientButton";

import { TitleText } from "../styles/text";
import { BackgroundContainer } from "../styles/block";
import moods from "../data/moods";

export default function Source({ navigation }) {
  const { mood } = navigation.state.params;
  const onPress = source => {
    navigation.navigate("Player", { source });
  };
  const style = {
    marginBottom: 16
  };
  const moodObject = moods.find(m => m.key === mood) || {};
  return (
    <View style={BackgroundContainer}>
      <Text
        style={{
          ...TitleText,
          paddingTop: 62,
          paddingHorizontal: 20,
          ...style,
          paddingBottom: 4
        }}
      >
        Load <Text style={{ fontWeight: "bold" }}>{mood}</Text> songs from
      </Text>
      <View style={{ paddingHorizontal: 14 }}>
        <GradientButton
          text="Liked Songs"
          onPressAction={() => onPress("library")}
          color={moodObject.color}
          style={style}
        />
        <GradientButton
          text="Spotify Catalog"
          onPressAction={() => onPress("spotify")}
          color={moodObject.color}
          style={style}
        />
      </View>
    </View>
  );
}
