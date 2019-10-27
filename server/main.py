from flask import Flask, flash, redirect, render_template, request, session, abort
import sys
import os
import random
import requests
from collections import namedtuple
from typing import Dict, Tuple, Optional
from math import ceil
import numpy as np
from .spoot import *

app = Flask(__name__)

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
                track_ids = fetch_saved_tracks(auth)
            else:
                track_ids = user_top_trackss(auth)
            self._sort(True)
        self.index = index if index else 0
        self.end = end if end else len(self.track_ids)
    
    def get_queue(self) -> List[str]:
        """
        Return song IDs of songs that will be played up next.
        """
        return self.track_ids[self.index + 1 : self.end]

    def _sort(self, new: bool, threshold=0.4) -> None:
        """
        Sort songs based on the current mood, such that the songs closer to that mood are first. This is meant to be called after changing the mood.

        `new`: True if it's a brand new playlist and so we should sort the entire playlist, and False if we only want to sort the songs starting with `index + 1`.
        `threshold`: maximum distance between the mood of a song and `self.mood`. `self.end` will be set such that songs that exceed this threshold will not be played.
        """
        comparator = lambda track_id: np.linalg.norm(song_mood[track_id], self.mood)
        if new:
            self.track_ids.sort(key=comparator)
        else:
            self.track_ids[index + 1:] = self.track_ids.sorted(key=comparator)
        # TODO: set self.end
        # TODO
        for i in range(self.index, (self.end - self.index)):
            pass

    def new_mood(self, mood: Mood) -> None:
        """
        Sets the mood to `mood`, resets the index, and calls `_sort`.
        """
        self.index = 0
        self.mood = mood
        self._sort(True)

    def _like_or_dislike(self, scale: float) -> None:
        """
        Update the mood in the direction of the current song, which has an id equal to `self.track_ids[self.index]`. We calculate the vector from the current mood to the mood of the current song, and update according to that multiplied by `scale`.
        """
        current_track_mood = _get_song_mood(self.track_ids[self.index])
        delta = np.subtract(current_track_mood, self.mood)
        self.mood = np.add(self.mood, np.multiply(delta, scale))
        self._sort(False)

    def like(self) -> None:
        """
        Update the mood in the direction of the current song, which has an id equal to `self.track_ids[self.index]`.
        """
        self._like_or_dislike(0.5)

    def dislike(self, was_skip=False) -> None:
        """
        Update the mood in the direction opposite to the current song, which has an id equal to `self.track_ids[self.index]`.

        `was_skip`: True if the user skipped and False if it was an actual dislike. Skips have half the weight of a dislike.
        """
        if was_skip:
            self._like_or_dislike(-0.25)
        else:
            self._like_or_dislike(-0.5)

    
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

def _get_song_mood(song_id: str, auth: str) -> Mood:
    """
    Return the song features for the given song ID, as a named tuple Mood. This gets it from the cache if available, or else gets it from Spotify, and then adds it to song_id_to_mood.
    """
    if song_id in song_mood:
        return song_mood[song_id]
    else:
        res = client.track_audio_features(song_id)
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
        playlists[auth].new_mood(mood)

def get_next_songs(index: int, auth: str, num=10) -> List[Dict]:
    """
    Return the next `num` songs to play. `index` is the index of the current song.
    """
    playlists[auth].index = index
    queue = playlists[auth].get_queue()[:num]

def like(auth: str, index: int):
    """
    Mark the song with the given index as liked for the given user. This adjusts the mood of the playlist, which affects the order of the subsequent songs. 
    """
    playlists[auth].index = index
    playlists[auth].like()

def dislike(auth: str, index: int):
    playlists[auth].index = index
    playlists[auth].dislike()

if __name__ == '__main__':
    app.run(host='0.0.0.0')