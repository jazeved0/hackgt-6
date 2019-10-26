import React, { useCallback } from "react";

import { StyleSheet, Text, View, ScrollView } from "react-native";
import GradientButton from "../components/GradientButton";

import moods from "../data/moods";
import { TitleText } from "../styles/text";
import { BackgroundContainer } from "../styles/block";

// ? ===============
// ? Stylesheet
// ? ===============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222"
  },
  moodContainer: {
    marginTop: 4,
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    justifyContent: "flex-start",
    alignContent: "flex-start",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8
  },
  moodButtonContainer: {
    flexBasis: "48.5%",
    flexDirection: "row",
    marginBottom: 16
  },
  moodButton: {
    flex: 1,
    width: "100%",
    height: 96
  }
});

export default function App({ navigation }) {
  const navigateToMood = k => {
    navigation.navigate("Source", { mood: k });
  };
  return (
    <View style={BackgroundContainer}>
      <ScrollView
        style={{
          flex: 1
        }}
      >
        <Text style={{ ...TitleText, paddingTop: 64, paddingHorizontal: 20 }}>
          Start a new listening session
        </Text>
        <View style={styles.moodContainer}>
          {moods.map(({ key, label, color }) => (
            <View style={styles.moodButtonContainer} key={key}>
              <MoodButton
                mood={key}
                label={label}
                color={color}
                onPressGeneric={navigateToMood}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ? ====================
// ? Auxiliary components
// ? ====================
function MoodButton({ mood, label, onPressGeneric, color }) {
  const onPress = useCallback(() => onPressGeneric(mood));
  return (
    <GradientButton
      text={label}
      onPress={onPress}
      color={color}
      style={styles.moodButton}
    />
  );
}
