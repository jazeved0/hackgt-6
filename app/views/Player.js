import React, { useCallback, useState, useRef, useEffect } from "react";

import GradientButton from "../components/GradientButton";
import {
  ActivityIndicator,
  StyleSheet,
  Image,
  View,
  Text,
  Alert,
  TouchableOpacity,
  Dimensions
} from "react-native";
import Slider from "react-native-slider";
import RadialGradient from "react-native-radial-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faStepBackward,
  faStepForward,
  faUndoAlt,
  faPlayCircle,
  faPauseCircle,
  faThumbsUp,
  faThumbsDown,
  faSignOutAlt
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import Swiper from "react-native-swiper";

import { StackActions, NavigationActions } from "react-navigation";
import { BackgroundContainer } from "../styles/block";
import moods from "../data/moods";
import Spotify from "rn-spotify-sdk/src/Spotify";

const basePadding = 20;
const baseVPadding = 24;
const baseHPadding = 24;

const minimumLeft = 4;
const initialRequestLength = 10;
const refineRequestLength = 10;

const songCache = {};
const requestingSet = new Set();
function accessCache(id) {
  return songCache[id];
}
const likedSongSet = new Set();
let session = null;
const url = "http://10.0.2.2:5000";

const resetAction = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({ routeName: "Login" })]
});

function formatDuration(duration) {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${("0" + seconds).substr(-2)}`;
}

function loadSong(songId) {
  return Spotify.getTrack(songId);
}

function blendColors(colorA, colorB, amount) {
  const [rA, gA, bA] = colorA.match(/\w\w/g).map(c => parseInt(c, 16));
  const [rB, gB, bB] = colorB.match(/\w\w/g).map(c => parseInt(c, 16));
  const r = Math.round(rA + (rB - rA) * amount)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(gA + (gB - gA) * amount)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(bA + (bB - bA) * amount)
    .toString(16)
    .padStart(2, "0");
  return "#" + r + g + b;
}

function loadSongMetadata(song) {
  return song
    ? {
        title: song.name,
        artist: song.artists[0].name,
        image: song.album.images[0].url,
        duration: Math.round(song.duration_ms / 1000)
      }
    : {};
}

export default function Player({ navigation }) {
  const onReturn = useCallback(() => {
    Spotify.setPlaying(false);
    navigation.navigate("Mood");
  });

  // Navigation state parameters
  const { mood, source } = navigation.state.params;
  const moodObject = moods.find(m => m.key === mood) || {};
  const currentColor = moodObject.accent;

  // Fetch queue from API upon mount
  useEffect(() => {
    Spotify.getSessionAsync()
      .then(s => {
        session = s;
        newUrl = `${url}/playlist/new?token=${
          session.accessToken
        }&request_length=${initialRequestLength}&mood=${mood}&play_saved_tracks=${source !==
          "spotify"}`;
        return axios.get(newUrl);
      })
      .then(({ data }) => {
        setQueue(data.queue);
        setLoaded([...new Array(data.queue.length)].map(_ => false));
      })
      .catch(error => {
        Alert.alert("Error", error.message);
      });
  }, []);

  // Album slider
  const albumSliderRef = useRef({});
  const [position, setPosition] = useState(0);
  const onAlbumChange = p => {
    setPosition(p);
    playFromStart(queue[p]);
  };

  // Song queue properties
  const [queue, setQueue] = useState([]);
  const [loaded, setLoaded] = useState([]);
  const [paused, setPaused] = useState(true);
  const loading = loaded.length === 0 || !loaded[position];
  const songCount = queue.length;
  const getSong = i => {
    if (loaded[i]) {
      return accessCache(queue[i]);
    } else {
      const id = queue[i];
      if (queue[i] && !requestingSet.has(id)) {
        requestingSet.add(id);
        loadSong(id)
          .then(song => {
            const metadata = loadSongMetadata(song);
            songCache[id] = metadata;
            setLoaded(l => l.map((p, j) => p || i === j));
            requestingSet.delete(id);
            if (i === position) {
              playFromStart(id);
            }
          })
          .catch(error => {
            console.log(error);
          });
      }
      return null;
    }
  };

  const song = loading ? { title: " ", artist: " " } : getSong(position);
  const [trackPosition, setTrackPosition] = useState(0);
  const trackDuration =
    !loading &&
    position <= queue.length &&
    queue[position] &&
    accessCache(queue[position])
      ? accessCache(queue[position]).duration
      : 0;

  const playFromStart = id => playFrom(id, 0);
  const playFrom = (id, from) => {
    Spotify.playURI(`spotify:track:${id}`, 0, from)
      .then(() => {
        setTrackPosition(from);
      })
      .catch(error => {
        console.log(error);
      });
  };

  // Playback controls callbacks
  const nextSong = () => {
    albumSliderRef.current.next();
    playFromStart(queue[position + 1]);
    const newPosition = position + 1;
    if (minimumLeft <= queue.length - 1 - newPosition) {
      axios
        .post(
          `${url}/playlist/dislike?token=${session.accessToken}&index=${position}&request_length=${refineRequestLength}&was_skip=true`
        )
        .then(({ data }) => {
          const previousQueue = queue.slice(0, position + 2);
          const previousLoaded = loaded.slice(0, position + 2);
          const newLoaded = [...new Array(data.queue.length)].map(_ => false);
          setQueue([...previousQueue, ...data.queue]);
          setLoaded([...previousLoaded, ...newLoaded]);
        });
    }
  };
  const onPrevPress = () => {
    albumSliderRef.current.prev();
    playFromStart(queue[position - 1]);
  };
  const onPlayPausePress = () => {
    Spotify.setPlaying(paused);
    setPaused(!paused);
  };

  // Log out command
  const onLogOut = () => {
    Spotify.logout().finally(() => navigation.dispatch(resetAction));
  };

  // Auto play effect
  useEffect(() => {
    let additionalTimer = null;
    const timer = setInterval(() => {
      Spotify.getPlaybackStateAsync().then(pbs => {
        if (!pbs) return;
        if (!isDraggingRef.current.d) {
          setTrackPosition(clamp(pbs.position, 0, trackDuration));
        }
        setPaused(!pbs.playing);
        if (trackDuration - pbs.position <= 2) {
          if (additionalTimer === null) {
            additionalTimer = setTimeout(() => {
              albumSliderRef.current.next();
              playFromStart(queue[position + 1]);
              additionalTimer = null;
              axios
                .post(
                  `${url}/playlist/extend?token=${session.accessToken}&index=${position}&request_length=${refineRequestLength}`
                )
                .then(({ data }) => {
                  const newLoaded = [...new Array(data.queue.length)].map(
                    _ => false
                  );
                  setQueue([...queue, ...data.queue]);
                  setLoaded([...loaded, ...newLoaded]);
                });
            }, (trackDuration - pbs.position) * 1000);
          }
        }
      });
    }, 500);
    return () => {
      clearInterval(timer);
      if (additionalTimer) clearTimeout(additionalTimer);
    };
  }, [trackDuration]);

  // Track slider callbacks
  const isDraggingRef = useRef({ d: false });
  const newPos = useRef({ p: 0 });
  const onTrackPositionChange = position => {
    newPos.current.p = position;
  };
  const onTrackSlidingStart = () => {
    isDraggingRef.current.d = true;
  };
  const onTrackSlidingEnd = () => {
    const { p } = newPos.current;
    isDraggingRef.current.d = false;
    setTrackPosition(p);
    Spotify.seek(p);
  };

  // On like/dislike
  const onLike = () => {
    const id = queue[position];
    if (!likedSongSet.has(id)) {
      likedSongSet.add(id);
      const i = position;
      axios
        .post(
          `${url}/playlist/like?token=${session.accessToken}&index=${position}&request_length=${refineRequestLength}`
        )
        .then(({ data }) => {
          const previousQueue = queue.slice(0, i + 2);
          const previousLoaded = loaded.slice(0, i + 2);
          const newLoaded = [...new Array(data.queue.length)].map(_ => false);
          setQueue([...previousQueue, ...data.queue]);
          setLoaded([...previousLoaded, ...newLoaded]);
        });
    }
  };
  const onDislike = () => {
    albumSliderRef.current.next();
    playFromStart(position + 1);
    const i = position;
    axios
      .post(
        `${url}/playlist/dislike?token=${session.accessToken}&index=${position}&request_length=${refineRequestLength}&was_skip=false`
      )
      .then(({ data }) => {
        const previousQueue = queue.slice(0, i + 2);
        const previousLoaded = loaded.slice(0, i + 2);
        const newLoaded = [...new Array(data.queue.length)].map(_ => false);
        setQueue([...previousQueue, ...data.queue]);
        setLoaded([...previousLoaded, ...newLoaded]);
      });
  };

  // Top level container
  return (
    <RadialGradient
      style={{ ...styles.topLevelContainer }}
      colors={[blendColors(currentColor, "#222222", 0.8), "#222"]}
      stops={[0.2, 1]}
      center={[Dimensions.get("window").width / 2, 0]}
      radius={300}
    >
      {/* Return button area */}
      <View style={styles.topContainer}>
        <GradientButton
          textStyle={styles.returnButtonText}
          onPressAction={onReturn}
          color={[currentColor, currentColor]}
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
                marginLeft: 12,
                color: "white",
                fontSize: 20,
                fontWeight: "bold"
              }}
            >
              Return
            </Text>
          </View>
        </GradientButton>
        <PlaybackButton onPress={onLogOut} size={32} icon={faSignOutAlt} />
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
            onChangePosition={onAlbumChange}
            loading={loading}
          />
        </View>
      </View>
      {/* Bottom playback controls */}
      <View style={styles.playbackContainer}>
        <SongInfo title={song.title} artist={song.artist} />
      </View>
      {/* Slider Bar*/}
      <View style={styles.sliderBar}>
        <Text style={{ ...styles.playbackText, marginRight: 8 }}>
          {loading ? "X:XX" : formatDuration(Math.round(trackPosition))}
        </Text>
        <Slider
          value={trackPosition}
          onValueChange={onTrackPositionChange}
          onSlidingStart={onTrackSlidingStart}
          onSlidingComplete={onTrackSlidingEnd}
          maximumValue={trackDuration}
          minimumValue={0}
          minimumTrackTintColor={currentColor}
          maximumTrackTintColor="#333"
          thumbTintColor="#ddd"
          animateTransitions
          style={{ flex: 1 }}
        />
        <Text style={{ ...styles.playbackText, marginLeft: 8 }}>
          {loading ? "X:XX" : formatDuration(Math.round(trackDuration))}
        </Text>
      </View>
      <View style={styles.buttons}>
        <PlaybackButton
          onPress={onPrevPress}
          disabled={position === 0 || loading}
          size={32}
          icon={faStepBackward}
        />
        <PlaybackButton
          onPress={onPlayPausePress}
          size={64}
          icon={paused ? faPlayCircle : faPauseCircle}
          disabled={songCount === 0 || loading}
        />
        <PlaybackButton
          onPress={nextSong}
          disabled={position >= songCount - 1 || loading}
          size={32}
          icon={faStepForward}
        />
      </View>
      <View style={styles.likeDislikeButtons}>
        <GradientButton
          textStyle={styles.likeDislikeButtonText}
          style={styles.likeDislikeButton}
          onPressAction={onLike}
          color={[currentColor, currentColor]}
          radius={100}
          height={48}
        >
          <View style={{ flexDirection: "row" }}>
            <FontAwesomeIcon
              icon={faThumbsUp}
              style={styles.iconBase}
              size={20}
            />
            <Text
              style={{
                marginLeft: 12,
                color: "white",
                fontSize: 20,
                fontWeight: "bold"
              }}
            >
              Like
            </Text>
          </View>
        </GradientButton>
        <GradientButton
          textStyle={styles.likeDislikeButtonText}
          style={styles.likeDislikeButton}
          onPressAction={onDislike}
          color={[currentColor, currentColor]}
          radius={100}
          height={48}
        >
          <View style={{ flexDirection: "row" }}>
            <FontAwesomeIcon
              icon={faThumbsDown}
              style={styles.iconBase}
              size={20}
            />
            <Text
              style={{
                marginLeft: 12,
                color: "white",
                fontSize: 20,
                fontWeight: "bold"
              }}
            >
              Dislike
            </Text>
          </View>
        </GradientButton>
      </View>
      <View
        style={{ flex: 1, alignItems: "stretch", justifyContent: "center" }}
      ></View>
    </RadialGradient>
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
  playbackText: {
    fontSize: 14,
    color: "#999",
    flex: 0,
    marginTop: -2
  },
  sliderBar: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: basePadding,
    marginTop: 10
  },
  iconBase: {
    color: "white",
    marginTop: 4
  },
  topContainer: {
    paddingHorizontal: basePadding - 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    paddingTop: 22,
    paddingBottom: 0
  },
  likeDislikeButtons: {
    paddingHorizontal: basePadding - 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    paddingTop: 8,
    paddingBottom: 4
  },
  likeDislikeButton: {
    flex: 1
  },
  playbackContainer: {
    paddingHorizontal: basePadding
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 18
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
      <Text style={songInfoStyles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={songInfoStyles.artist} numberOfLines={1}>
        {artist}
      </Text>
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
    this.swiperRef.current && this.swiperRef.current.scrollBy(-1, true);
  }

  next() {
    this.swiperRef.current && this.swiperRef.current.scrollBy(1, true);
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
        return song ? (
          <View style={albumSliderStyles.slide} key={i}>
            <Image
              style={albumSliderStyles.albumArt}
              source={{ uri: song.image }}
            />
          </View>
        ) : null;
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
