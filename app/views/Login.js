import React, { PureComponent } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableHighlight,
  View
} from "react-native";
import Spotify from "rn-spotify-sdk";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";

import { StackActions, NavigationActions } from "react-navigation";
import { BackgroundContainer } from "../styles/block";
import GradientButton from "../components/GradientButton";

const resetAction = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({ routeName: "Mood" })]
});

export default class Login extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      spotifyInitialized: false
    };
    this.spotifyLoginButtonWasPressed = this.spotifyLoginButtonWasPressed.bind(
      this
    );
  }

  goToPlayer() {
    this.props.navigation.dispatch(resetAction);
  }

  async initializeIfNeeded() {
    // initialize Spotify if it hasn't been initialized yet
    if (!(await Spotify.isInitializedAsync())) {
      // initialize spotify
      const spotifyOptions = {
        clientID: "c497f3827d14435aa0256a4ff69910ac",
        sessionUserDefaultsKey: "SpotifySession",
        redirectURL: "bopify://auth",
        scopes: [
          "user-read-private",
          "playlist-read",
          "playlist-read-private",
          "streaming",
          "user-library-read",
          "app-remote-control"
        ]
      };
      const loggedIn = await Spotify.initialize(spotifyOptions);
      // update UI state
      this.setState({
        spotifyInitialized: true
      });
      // handle initialization
      if (loggedIn) {
        this.goToPlayer();
      }
    } else {
      // update UI state
      this.setState({
        spotifyInitialized: true
      });
      // handle logged in
      if (await Spotify.isLoggedInAsync()) {
        this.goToPlayer();
      }
    }
  }

  componentDidMount() {
    this.initializeIfNeeded().catch(error => {
      Alert.alert("Error", error.message);
    });
  }

  spotifyLoginButtonWasPressed() {
    // log into Spotify
    Spotify.login()
      .then(loggedIn => {
        if (loggedIn) {
          // logged in
          this.goToPlayer();
        } else {
          // cancelled
        }
      })
      .catch(error => {
        // error
        Alert.alert("Error", error.message);
      });
  }

  render() {
    if (!this.state.spotifyInitialized) {
      return (
        <View style={{ ...styles.container, ...BackgroundContainer }}>
          <ActivityIndicator
            animating={true}
            style={styles.loadIndicator}
            size={80}
            color="#11998e"
          ></ActivityIndicator>
          <Text style={styles.loadMessage}>Loading...</Text>
        </View>
      );
    } else {
      return (
        <View style={{ ...styles.container, ...BackgroundContainer }}>
          <Text style={styles.greeting}>
            Please log in to Spotify to continue
          </Text>

          <GradientButton
            onPressAction={this.spotifyLoginButtonWasPressed}
            color={["#11998e", "#47D57C"]}
          >
            <View style={{ flexDirection: "row", paddingHorizontal: 24 }}>
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
                Log in to Spotify
              </Text>
            </View>
          </GradientButton>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32
  },

  loadIndicator: {
    color: "#1DB954"
  },
  loadMessage: {
    fontSize: 24,
    textAlign: "center",
    margin: 10,
    color: "#ddd"
  },

  greeting: {
    fontSize: 24,
    textAlign: "center",
    margin: 10,
    marginBottom: 32,
    color: "#ddd"
  }
});
