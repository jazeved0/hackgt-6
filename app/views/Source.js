import React from "react";

import { View, Text } from "react-native";
import GradientButton from "../components/GradientButton";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";

import { TitleText } from "../styles/text";
import { BackgroundContainer } from "../styles/block";
import moods from "../data/moods";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";

export default function Source({ navigation }) {
  const { mood } = navigation.state.params;
  const onPress = source => {
    navigation.navigate("Player", { mood, source });
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
          onPressAction={() => onPress("library")}
          color={moodObject.color}
          style={style}
        >
          <View style={{ flexDirection: "row" }}>
            <FontAwesomeIcon
              icon={faHeart}
              style={{
                color: "white",
                marginTop: 2
              }}
              size={28}
            />
            <Text
              style={{
                marginLeft: 16,
                color: "white",
                fontSize: 22,
                fontWeight: "bold"
              }}
            >
              Liked Songs
            </Text>
          </View>
        </GradientButton>
        <GradientButton
          onPressAction={() => onPress("spotify")}
          color={moodObject.color}
          style={style}
        >
          <View style={{ flexDirection: "row" }}>
            <FontAwesomeIcon
              icon={faSpotify}
              style={{
                color: "white",
                marginTop: 2
              }}
              size={28}
            />
            <Text
              style={{
                marginLeft: 16,
                color: "white",
                fontSize: 22,
                fontWeight: "bold"
              }}
            >
              Spotify Catalog
            </Text>
          </View>
        </GradientButton>
      </View>
    </View>
  );
}
