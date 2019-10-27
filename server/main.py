from flask import Flask, request, jsonify, Response
from flask_restful import reqparse, Api, Resource
import sys
import os
import random
import requests
from collections import namedtuple
from typing import Dict, Tuple, Optional
import math
from math import ceil
import numpy as np
from scipy.spatial.distance import euclidean
from spoot import *
import asyncio

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
api = Api(app)

# https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/
Mood: Tuple[float, float, float] = namedtuple('Mood', 'valence energy danceability')

class MoodPlaylist:
    def __init__(self, token: str, mood: Mood, play_saved_tracks: bool, track_ids: Optional[List[str]] = None, index: int = -1, end: Optional[int] = None):
        """
        `token` is the user token
        `mood` is the current mood according to which we'll sort the songs.
        `play_saved_tracks` is True if we are playing from the user's saved tracks (or liked songs) and False if we are playing from the all of Spotify (more specifically, the most popular tracks at https://spotifycharts.com/regional)
        `track_ids` is a list of all track_ids, both played and unplayed.
        `index` is the index within `track_ids` of the currently playing song. This defaults to -1 so that the next song is index 0.
        `end` is 1 greater than the index of the last song within `track_ids` that we want to play; the last song that meets a certain threshold of closeness to the desired mood.
        """
        self.token = token
        self.mood = mood
        self.play_saved_tracks = play_saved_tracks
        self.index = index
        if track_ids:
            self.track_ids = track_ids
        else:
            if play_saved_tracks:
                self.track_ids = fetch_saved_tracks(token)
            else:
                self.track_ids = user_top_trackss(token)
            self._sort(True)
        self.end = end if end is not None else len(self.track_ids)
    
    def get_queue(self, length: int = None) -> List[str]:
        """
        Return song IDs of songs that will be played up next.

        `length`: number of song IDs to return.
        """
        if length:
            return self.track_ids[self.index + 1 : self.end][:length]
        else:
            return self.track_ids[self.index + 1 : self.end]

    def _sort(self, new: bool, threshold=0.4) -> None:
        """
        Sort songs based on the current mood, such that the songs closer to that mood are first. This is meant to be called after changing the mood.

        `new`: True if it's a brand new playlist and so we should sort the entire playlist, and False if we only want to sort the songs starting with `index + 1`.
        `threshold`: maximum distance between the mood of a song and `self.mood`. `self.end` will be set such that songs that exceed this threshold will not be played.
        """
        track_moods = _get_song_moods(self.track_ids)
        track_id_to_mood = {self.track_ids[i]: track_moods[i] for i in range(len(self.track_ids))}
        dist = lambda track_id: euclidean(track_id_to_mood[track_id], self.mood)
        if new:
            self.track_ids.sort(key=dist)
        else:
            self.track_ids[index + 1:] = self.track_ids.sorted(key=dist)
        self.end = len(self.track_ids)
        for i, track_id in enumerate(self.track_ids):
            if dist(track_id) > threshold:
                self.end = i
        for i in range(self.index, self.end):
            j = random.randint(i, min(i + 5, self.end - 1))
            self.track_ids[i], self.track_ids[j] = self.track_ids[j], self.track_ids[i]

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

def _get_song_mood(song_id: str) -> Mood:
    """
    Return the song features for the given song ID, as a named tuple Mood. This gets it from the cache if available, or else gets it from Spotify, and then adds it to song_id_to_mood.
    """
    if song_id in song_mood:
        return song_mood[song_id]
    else:
        try:
            res = client.http.request(client.http.route("GET", "/audio-features/{id}", id=song_id))
            mood = (res['valence'], res['energy'], res['danceability'])
            song_mood[song_id] = mood
            return mood
        except:
            return (0, 0, 0)

def divide_chunks(l, n):
    for i in range(0, len(l), n):  
        yield l[i:i + n] 

def _get_song_moods(song_ids: List[str]) -> List[Mood]:
    mapping = {song_id: song_mood[song_id] for song_id in song_ids if song_id in song_mood}
    non_cached = [song_id for song_id in song_ids if song_id not in song_mood]
    song_id_groups = list(divide_chunks(non_cached, 100))
    for group in song_id_groups:
        formatted_group = ",".join(group)
        res = client.http.request(client.http.route("GET", "/audio-features?ids={ids}", ids=formatted_group))
        res = res["audio_features"]
        for i in range(len(group)):
            data = res[i]
            mood = (data['valence'], data['energy'], data['danceability'])
            mapping[group[i]] = mood
            song_mood[group[i]] = mood
    return [mapping[song_ids[i]] for i in range(len(song_ids))]

def _nearest_moods(token: str) -> Dict[str, float]:
    """
    Returns what two moods the current mood of the playlist is closest to.

    Example return value:
    {
        'adele': 0.4,
        'hide the tears': 0.6
    }
    """
    # Reverse mapping from mood name to its distance from the current mood.
    mood_dists: Dict[float, str] = {}
    for mood_name, mood_vec in mood_names:
        dist = euclidean(mood_vec, playlists[token].mood)
        mood_dists[dist] = mood_name
    dists_sorted = mood_dists.keys.sorted()
    i = 0
    for mood_name in mood_names:
        pass # TODO
    sum_of_dists = math.sqrt(mood_dists[dists_sorted[0]]) + math.sqrt(mood_dists[dists_sorted[1]])
    proportions = (math.sqrt(mood_dists[dists_sorted[0]])/sum_of_dists,  math.sqrt(mood_dists[dists_sorted[1]])/sum_of_dists)

    return top_two_mood_names
    # TODO: Project the current mood onto the line connecting the two nearest moods. Return what percent of one mood it is compared to another.


@app.route('/playlist/new', methods=['GET'])
def new_playlist() -> Response:
    """
    Create a new mood playlist. Returns the first `request_length` track IDs of the new playlist, which is a List[str], as a JSON response.

    `play_saved_tracks`: whether we want to play from saved tracks (True) or from top charts (False)
    `mood`: a string representing the mood of the new playlist, such as 'sad bops' or 'adele'
    `request_length`: number of track IDs to return
    `token`: user token
    """
    parser = reqparse.RequestParser()
    parser.add_argument('token', type=str, required=True)
    parser.add_argument('mood', type=str, required=True)
    parser.add_argument('play_saved_tracks', type=bool, required=True)
    parser.add_argument('request_length', type=int, required=True)
    args = parser.parse_args()

    try:
        token: str = args['token']
        mood: str = args['mood']
        play_saved_tracks: bool = args['play_saved_tracks']
        request_length: int = args['request_length']

        mood: Mood = mood_names[mood]
        if token not in playlists or playlists[token].play_saved_tracks != play_saved_tracks:
            playlists[token] = MoodPlaylist(token, mood, play_saved_tracks)
        else:
            playlists[token].new_mood(mood)
        return jsonify(queue=playlists[token].get_queue(request_length))
    except ValueError as e:
        message = 'Incorrect parameter types'
        print(message + ' ' + repr(e))
        raise e
        return {'message': message}, 405
    except Exception as e:
        message = 'Unknown error: ' + repr(e)
        print(message)
        raise e
        return {'message': message}, 400

@app.route('/playlist/extend', methods=['GET'])
def get_next_songs() -> Response:
    """
    Return the next `num` songs to play, which is a List[str], as a JSON response. `index` is the index of the current song.
    """
    parser = reqparse.RequestParser()
    parser.add_argument('token', type=str, required=True)
    parser.add_argument('index', type=int, required=True)
    parser.add_argument('request_length', type=int, required=True)
    args = parser.parse_args()

    try:
        token: str = args['token']
        index: int = args['index']
        request_length: int = args['request_length']

        playlists[token].index = index
        return jsonify(queue=playlists[token].get_queue(request_length))
    except Exception as e:
        message = 'Unknown error: ' + repr(e)
        print(message)
        raise e
        return {'message': message}, 400

@app.route('/playlist/like', methods=['POST'])
def like() -> Response:
    """
    Mark the song with the given index as liked for the given user. This adjusts the mood of the playlist, which affects the order of the subsequent songs. 
    """
    parser = reqparse.RequestParser()
    parser.add_argument('token', type=str, required=True)
    parser.add_argument('index', type=int, required=True)
    parser.add_argument('request_length', type=int, required=True)
    args = parser.parse_args()

    try:
        token: str = args['token']
        index: int = args['index']
        request_length: int = args['request_length']

        playlists[token].index = index
        playlists[token].like()
        return jsonify(queue=playlists[token].get_queue(request_length))
    except Exception as e:
        message = 'Unknown error: ' + repr(e)
        print(message)
        raise e
        return {'message': message}, 400

@app.route('/playlist/dislike', methods=['POST'])
def dislike(token: str, index: int, request_length: int, was_skip: bool) -> Response:
    parser = reqparse.RequestParser()
    parser.add_argument('token', type=str, required=True)
    parser.add_argument('index', type=int, required=True)
    parser.add_argument('request_length', type=int, required=True)
    parser.add_argument('was_skip', type=bool, required=True)
    args = parser.parse_args()

    try:
        token: str = args['token']
        index: int = args['index']
        request_length: int = args['request_length']
        was_skip: bool = args['was_skip']

        playlists[token].index = index
        playlists[token].dislike(was_skip)
        return jsonify(queue=playlists[token].get_queue(request_length))
    except Exception as e:
        message = 'Unknown error: ' + repr(e)
        print(message)
        raise e
        return {'message': message}, 400
if __name__ == '__main__':
    app.run(host='0.0.0.0')
