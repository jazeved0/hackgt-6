import React, { useCallback, useState, useRef } from "react";

import GradientButton from "../components/GradientButton";
import {
  ActivityIndicator,
  StyleSheet,
  Image,
  View,
  Text,
  TouchableOpacity
} from "react-native";
import Slider from "react-native-slider";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faStepBackward,
  faStepForward,
  faUndoAlt,
  faPlayCircle,
  faPauseCircle
} from "@fortawesome/free-solid-svg-icons";
import Swiper from "react-native-swiper";

import { BackgroundContainer } from "../styles/block";
import moods from "../data/moods";
import { gradients } from "../data/colors";

const basePadding = 20;
const baseVPadding = 24;
const baseHPadding = 20;

const placeholder = i => {
  return i % 2 === 0
    ? {
        image:
          "https://upload.wikimedia.org/wikipedia/en/d/dd/Lady_Gaga_%E2%80%93_The_Fame_album_cover.png",
        title: "Just Dance",
        artist: "Lady Gaga"
      }
    : {
        image:
          "https://images.genius.com/c9284e25d68511b33a3376e6eafc1587.1000x1000x1.jpg",
        title: "Bad Ideas",
        artist: "Tessa Violet"
      };
};

export default function Player({ navigation }) {
  const onReturn = useCallback(() => {
    navigation.navigate("Mood");
  });
  // Navigation state parameters
  const { mood, source } = navigation.state.params;
  const moodObject = moods.find(m => m.key === mood) || {};
  const currentGradient =
    typeof moodObject.color === "string"
      ? gradients[moodObject.color]
      : moodObject.color;
  const currentColor = currentGradient[0];

  // Album slider
  const albumSliderRef = useRef({});
  const [position, setPosition] = useState(0);

  // Song queue properties
  const loading = false;
  const paused = true;
  const songCount = 5;
  const queue = [...new Array(songCount)].map((_, i) => placeholder(i));
  const getSong = i => queue[i];
  // TODO replace with playback property
  const song = loading ? { title: "", artist: "" } : getSong(position);

  // Playback controls callbacks
  const onNextPress = () => {
    albumSliderRef.current.next();
  };
  const onPrevPress = () => {
    albumSliderRef.current.prev();
  };
  const onPlayPausePress = () => null;

  // Top level container
  return (
    <View style={styles.topLevelContainer}>
      {/* Return button area */}
      <View style={styles.topContainer}>
        <GradientButton
          textStyle={styles.returnButtonText}
          onPressAction={onReturn}
          color={moodObject.color}
          radius={100}
          height={48}
        >
          <View style={{ flexDirection: "row" }}>
            <FontAwesomeIcon
              icon={faUndoAlt}
              style={styles.iconBase}
              size={20}
            />
            <Text
              style={{
                marginLeft: 8,
                color: "white",
                fontSize: 20,
                fontWeight: "bold"
              }}
            >
              Return
            </Text>
          </View>
        </GradientButton>
      </View>
      {/* Middle album slider */}
      <View style={styles.albumOuter}>
        <View style={styles.albumInner}>
          {loading && (
            <View style={styles.loadingIndicatorWrapper}>
              <View style={styles.loadingPlaceholder} />
              <ActivityIndicator size={80} animated color={currentColor} />
            </View>
          )}
          <AlbumSlider
            style={styles.albumSlider}
            getSong={getSong}
            songCount={songCount}
            loadRange={2}
            ref={albumSliderRef}
            onChangePosition={setPosition}
            loading={loading}
          />
        </View>
      </View>
      {/* Slider Bar*/}
      <View style={styles.sliderBar}>
        <Slider
        step={1}
        />
      </View>
      {/* Bottom playback controls */}
      <View style={styles.playbackContainer}>
        <SongInfo title={song.title} artist={song.artist} />
      </View>
      <View style={styles.buttons}>
        <PlaybackButton
          onPress={onPrevPress}
          disabled={position === 0}
          size={32}
          icon={faStepBackward}
        />
        <PlaybackButton
          onPress={onPlayPausePress}
          size={64}
          icon={paused ? faPlayCircle : faPauseCircle}
          disabled={songCount === 0}
        />
        <PlaybackButton
          onPress={onNextPress}
          disabled={position >= songCount - 1}
          size={32}
          icon={faStepForward}
        />
      </View>
      <View
        style={{ flex: 1, alignItems: "stretch", justifyContent: "center" }}
      ></View>
    </View>
  );
}

const styles = StyleSheet.create({
  topLevelContainer: {
    ...BackgroundContainer,
    flex: 1,
    flexDirection: "column"
  },
  albumOuter: {
    paddingHorizontal: baseHPadding,
    paddingVertical: baseVPadding
  },
  albumInner: {
    aspectRatio: 1,
    width: "100%",
    position: "relative"
  },
  loadingIndicatorWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1"
  },
  loadingPlaceholder: {},
  albumSlider: {
    marginHorizontal: -baseHPadding,
    marginVertical: -baseVPadding
  },
  sliderBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 48

  },
  iconBase: {
    color: "white",
    marginTop: 4
  },
  topContainer: {
    paddingHorizontal: basePadding - 10,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "stretch",
    paddingTop: 28,
    paddingBottom: 4
  },
  playbackContainer: {
    paddingHorizontal: basePadding
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 4
  },
  returnButtonText: {
    paddingHorizontal: 48
  }
});

// ? ===============
// ? Playback button
// ? ===============
const playbackStyles = StyleSheet.create({
  base: {
    paddingHorizontal: 24,
    paddingVertical: 4
  },
  disabledIcon: {
    opacity: 0.4
  },
  icon: styles.iconBase
});

function PlaybackButton({ disabled, size, icon, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={playbackStyles.base}
    >
      <FontAwesomeIcon
        icon={icon}
        size={size}
        style={{
          ...playbackStyles.icon,
          ...(disabled ? playbackStyles.disabledIcon : {})
        }}
      />
    </TouchableOpacity>
  );
}

// ? ===================
// ? Song info component
// ? ===================

const songInfoStyles = StyleSheet.create({
  base: {},
  title: {
    fontWeight: "bold",
    color: "#eee",
    fontSize: 24,
    lineHeight: 22,
    marginBottom: 0,
    paddingTop: 4
  },
  artist: {
    color: "#bbb",
    fontSize: 20,
    lineHeight: 20
  }
});
function SongInfo({ title, artist }) {
  return (
    <View style={songInfoStyles.base}>
      <Text style={songInfoStyles.title}>{title}</Text>
      <Text style={songInfoStyles.artist}>{artist}</Text>
    </View>
  );
}

// ? ======================
// ? Album slider component
// ? ======================

const albumSliderStyles = StyleSheet.create({
  base: {},
  slide: {
    paddingHorizontal: baseHPadding,
    paddingVertical: baseVPadding,
    flex: 1
  },
  albumArt: {
    flex: 1,
    aspectRatio: 1,
    width: "100%"
  },
  placeholder: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch"
  },
  placeholderInner: {
    flex: 1,
    backgroundColor: "white"
  }
});

function clamp(a, min, max) {
  return Math.max(min, Math.min(max, a));
}

class AlbumSlider extends React.Component {
  constructor() {
    super();
    this.setPosition = this.setPosition.bind(this);
    this.swiperRef = React.createRef();
    this.state = {
      position: 0
    };
  }

  setPosition(i) {
    this.setPositionAndUpdate(i);
  }

  prev() {
    this.swiperRef.current.scrollBy(-1, true);
  }

  next() {
    this.swiperRef.current.scrollBy(1, true);
  }

  setPositionAndUpdate(newPosition) {
    const { songCount, onChangePosition } = this.props;
    const { position } = this.state;
    const clampedPosition = clamp(newPosition, 0, songCount - 1);
    if (position !== clampedPosition) {
      this.setState({ position: clampedPosition });
      if (onChangePosition) {
        onChangePosition(clampedPosition);
      }
    }
  }

  render() {
    const { style, getSong, songCount, loadRange, loading } = this.props;
    const { position } = this.state;
    const resolveSong = i => {
      if (i >= position - loadRange && i <= position + loadRange) {
        const song = getSong(i);
        return (
          <View style={albumSliderStyles.slide} key={i}>
            <Image
              style={albumSliderStyles.albumArt}
              source={{ uri: song.image }}
            />
          </View>
        );
      } else return null;
    };
    const children = [...Array(songCount).keys()].map(resolveSong);
    return loading ? null : (
      <Swiper
        style={{ ...style, ...albumSliderStyles.base }}
        loop={false}
        showsPagination={false}
        autoplay={false}
        children={children}
        onIndexChanged={this.setPosition}
        ref={this.swiperRef}
      />
    );
  }
}
