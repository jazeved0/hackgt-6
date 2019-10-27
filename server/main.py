from flask import Flask, flash, redirect, render_template, request, session, abort
import sys
import os
import spotify.sync as spotify
import random
import requests
from collections import namedtuple
from typing import Dict, Tuple, Any
from math import ceil
import numpy

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
    def __init__(self, mood: Mood, track_ids: List[str], index: int):
        """
        mood is the current mood according to which we'll sort the songs. track_ids is a list of all track_ids, both played and unplayed. index is the index within `track_ids` of the currently playing song.
        """
        self.mood = mood
        self.track_ids = track_ids
        self.index = index
    
    def get_queue(self) -> List[str]:
        return self.track_ids[self.index + 1:]

    @staticmethod
    def _dist(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
        """
        Return the squared Euclidean distance between two 3-dimensional points.
        """
        return (a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] - b[2])**2

    @staticmethod
    def _vector_diff(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
        """
        Return b - a, where a and b are three-dimensional vectors.
        """
        return (b[0] - a[0], b[1] - a[1], b[2] - a[2])

    @staticmethod
    def _vector_add(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
        """
        Return a + b, where a and b are three-dimensional vectors.
        """
        return (a[0] + b[0], a[1] + b[1], a[2] + b[2])

    def sort(self, new_mood: Mood) -> None:
        """
        Sort songs based on the set mood, such that the songs closer to that mood are first. `index + 1` is the index of the next song; i.e., the first song of the newly sorted portion of the playlist.
        """        
        self.track_ids[index + 1:] = self.track_ids[index + 1:].sorted(key=self._dist)

    def set_mood(self, new_mood: Mood) -> None:
        """
        Sets the mood to the given mood and calls `sort` accordingly.
        """
        self.mood = new_mood
        self.sort(new_mood)

    def like(self, index: int) -> None:
        """
        Update the mood in the direction of the current song, which has an id equal to `self.track_ids[index]`.
        """
        current_track_mood = _get_song_mood(self.track_ids[index])
        delta = self._vector_diff(current_track_mood, self.mood)
        self.mood = self._vector_add(self.mood, (t/2 for t in delta))

    def dislike(self, index: int) -> None:
        """
        Update the mood in the direction opposite to the current song, which has an id equal to `self.track_ids[index]`.
        """
        current_track_mood = _get_song_mood(self.track_ids[index])
        delta = self._vector_diff(self.mood, current_track_mood)
        self.mood = self._vector_add(self.mood, (t/2 for t in delta))

    
# Map user id to their desired mood and their queue.
user_to_playlist: Dict[str, MoodPlaylist] = {}

# Map a song id to its Mood.
song_id_to_mood: Dict[str, Mood] = {}

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

Metadata: Tuple = namedtuple('Metadata', 'artist_name ')
# Maps song ID to its metadata.
song_metadata: Dict[str, Metadata] = {}

def _fetch_saved_tracks(auth: str, country='US') -> List[str]:
    """
    Return the song_ids saved tracks for the given user. If the track is not available in the user's region, it is (theoretically) excluded from the output.
    https://developer.spotify.com/documentation/web-api/reference/library/get-users-saved-tracks/

    :param auth: Authorization ID for the given user.
    :param country: Two-letter abbreviation for the country the user is currently in. This is used to check that a given song in the playlist is available.
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

def _get_song_mood(song_id: str, auth: str) -> Mood:
    """
    Return the song features for the given song ID, as a named tuple Mood. This gets it from the cache if available, or else gets it from Spotify, and then adds it to song_id_to_mood.
    """
    if song_id in song_id_to_mood:
        return song_id_to_mood[song_id]
    else:
        res = spotify_client.track_audio_features(song_id)
        mood = (res['valence'], res['energy'], res['danceability'])
        song_id_to_mood[song_id] = mood
        return mood

def set_mood(mood_str: str, index: int, auth: str):
    """
    Set the mood and creates a new queue based on that. `index` is the index of the current song.
    """
    new_mood: Mood = mood_names[mood_str]
    mood_playlist = user_to_playlist[auth]
    mood_playlist.index = index
    mood_playlist.set_mood(new_mood)

def get_next_songs(index: int, auth: str, num=10) -> List[Dict]:
    """
    Return the next `num` songs to play. `index` is the index of the current song.
    """
    queue = user_to_playlist[auth].get_queue()[:num]

def like(auth: str, index: int):
    user_to_playlist[auth].like(index)

def dislike(auth: str, index: int):
    user_to_playlist[auth].dislike(index)

def _get_playlist(playlist_id: str, auth: str) -> List[str]:
    """
    Given a playlist id, return a list of its song IDs.
    """
    pass

def _get_lyrics_sentiment(song_id: str, auth: str) -> float:
    """
    Return the sentiment of the song corresponding to the given ID, using sentiment analysis on the lyrics, which are from the Genius API.
    """
    pass

# TODO
def export_playlist(auth: str):
    """
    Create a Spotify playlist from what the user has played.
    """
    user = spotify_client.user_from_token(auth)
    playlist = user.create_playlist('feels', description='sample')
    for track_id in user_to_playlist[auth]['playlist']:
        track_obj = spotify_client.get_track(track_id)
        user.add_tracks(playlist, track_obj)

if __name__ == '__main__':
    app.run(host='0.0.0.0')