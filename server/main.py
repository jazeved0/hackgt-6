from flask import Flask, flash, redirect, render_template, request, session, abort
import sys
import os
import spotify.sync as spotify
import random
import requests
from collections import namedtuple
from typing import Dict, Tuple, Any, Optional
from math import ceil
import numpy as np

app = Flask(__name__)
spotify_client = spotify.Client(os.environ.get('CLIENT_ID'), os.environ.get('CLIENT_SECRET'))

"""
https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/
- valence
- danceability (based on tempo, rhythm stability, beat strength, regularity)
- energy
- loudness
- tempo
"""
Mood: Tuple[float, float, float] = namedtuple('Mood', 'valence energy danceability')

class MoodPlaylist:
    def __init__(self, auth: str, mood: Mood, play_saved_tracks: bool, track_ids: Optional[List[str]], index: Optional[int], end: Optional[int]):
        """
        `auth` is the user token
        `mood` is the current mood according to which we'll sort the songs.
        `play_saved_tracks` is True if we are playing from the user's saved tracks (or liked songs) and False if we are playing from the all of Spotify (more specifically, the most popular tracks at https://spotifycharts.com/regional)
        `track_ids` is a list of all track_ids, both played and unplayed.
        `index` is the index within `track_ids` of the currently playing song.
        `end` is 1 greater than the index of the last song within `track_ids` that we want to play; the last song that meets a certain threshold of closeness to the desired mood.
        """
        self.auth = auth
        self.mood = mood
        self.play_saved_tracks = play_saved_tracks
        if track_ids:
            self.track_ids = track_ids
        else:
            if play_saved_tracks:
                track_ids = _fetch_saved_tracks(auth)
            else:
                track_ids = _fetch_popular(auth)
            self.sort(mood)
        self.index = index if index else 0
        self.end = end if end else len(self.track_ids)
    
    def get_queue(self) -> List[str]:
        """
        Return song IDs of songs that will be played up next.
        """
        return self.track_ids[self.index + 1 : self.end]

    def sort(self, new_mood: Mood) -> None:
        """
        Sort songs based on the set mood, such that the songs closer to that mood are first. `index + 1` is the index of the next song; i.e., the first song of the newly sorted portion of the playlist.
        """
        self.track_ids.sort(key=lambda track_id: np.linalg.norm(song_mood[track_id], new_mood))
        # TODO
        for i in range(self.index, (self.end - self.index)):
            pass

    def set_mood(self, new_mood: Mood) -> None:
        """
        Sets the mood to the given mood and calls `sort` accordingly.
        """
        self.mood = new_mood
        self.sort(new_mood)

    def _like_or_dislike(self, index: int, scale: float) -> None:
        """
        Update the mood in the direction of the current song, which has an id equal to `self.track_ids[index]`. We calculate the vector from the current mood to the mood of the current song, and update according to that multiplied by `scale`.
        """
        current_track_mood = _get_song_mood(self.track_ids[index])
        delta = np.subtract(current_track_mood, self.mood)
        self.mood = np.add(self.mood, np.multiply(delta, scale))

    def like(self, index: int) -> None:
        """
        Update the mood in the direction of the current song, which has an id equal to `self.track_ids[index]`.
        """
        self._like_or_dislike(index, 0.5)

    def dislike(self, index: int) -> None:
        """
        Update the mood in the direction opposite to the current song, which has an id equal to `self.track_ids[index]`.
        """
        self._like_or_dislike(index, -0.5)

    
# Map user IDs to their corresponding MoodPlaylist.
playlists: Dict[str, MoodPlaylist] = {}

# Map a song ID to its Mood.
song_mood: Dict[str, Mood] = {}

# Map mood names to their Mood vector.
mood_names: Dict[str, Mood] = {
    'upbeat': (1, 1, 0),
    'slow dance': (1, 0, 1),
    'hide the tears': (0, 1, 1),
    'sad bops': (0, 0, 1),
    'happy chill': (1, 1, 0),
    'mellow': (1, 0, 0),
    'adele': (0, 1, 0),
    'depressed': (0, 0, 0)
}

def _fetch_saved_tracks(auth: str, country='US') -> List[str]:
    """
    Return the song_ids saved tracks for the given user. If the track is not available in the user's region, it is (theoretically) excluded from the output.
    https://developer.spotify.com/documentation/web-api/reference/library/get-users-saved-tracks/

    `auth`: Authorization ID for the given user.
    `country`: Two-letter abbreviation for the country the user is currently in. This is used to check that a given song in the playlist is available.
    """
    res: Dict = spotify_client.saved_tracks(limit=50)
    song_items: List[Dict] = res['items']
    song_ids: List[str] = [item['track']['id'] for item in song_items if country in item['track']['available markets']]
    total: int = res['total'] # number of tracks in saved tracks
    if total > 50:
        for offset in range(50, total, 50):
            res: Dict = spotify_client.saved_tracks(limit=50, offset=offset)
            res.raise_for_status()
            song_items: List[Dict] = res['items']
            song_ids += [item['track']['id'] for item in song_items if country in item['track']['available markets']]
    return song_ids

# TODO
def _fetch_popular(auth: str) -> List[str]:
    """
    Return the track IDs of the 200 most popular songs worldwide.
    """
    pass

def _get_song_mood(song_id: str, auth: str) -> Mood:
    """
    Return the song features for the given song ID, as a named tuple Mood. This gets it from the cache if available, or else gets it from Spotify, and then adds it to song_id_to_mood.
    """
    if song_id in song_mood:
        return song_mood[song_id]
    else:
        res = spotify_client.track_audio_features(song_id)
        mood = (res['valence'], res['energy'], res['danceability'])
        song_mood[song_id] = mood
        return mood

def new_playlist(play_saved_tracks: bool, mood_str: str, auth: str) -> None:
    """
    Create a new mood playlist.

    `play_saved_tracks`: whether we want to play from saved tracks (True) or from top charts (False)
    `mood_str`: a string representing the mood of the new playlist, such as 'sad bops' or 'adele'
    `auth`: user token
    """
    mood: Mood = mood_names[mood_str]
    if not playlists[auth] or playlists[auth].play_saved_tracks != play_saved_tracks:
        playlists[auth] = MoodPlaylist(auth, mood, play_saved_tracks)
    else:
        playlists[auth].set_mood(mood)

def get_next_songs(index: int, auth: str, num=10) -> List[Dict]:
    """
    Return the next `num` songs to play. `index` is the index of the current song.
    """
    queue = playlists[auth].get_queue()[:num]

def like(auth: str, index: int):
    playlists[auth].like(index)

def dislike(auth: str, index: int):
    playlists[auth].dislike(index)

if __name__ == '__main__':
    app.run(host='0.0.0.0')