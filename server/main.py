from flask import Flask, flash, redirect, render_template, request, session, abort
import sys
import os
import spotify.sync as spotify
import random
import requests
from collections import namedtuple
from typing import Dict, Tuple, Any
from math import ceil

app = Flask(__name__)
spotify_client = spotify.Client(os.environ.get('CLIENT_ID'), os.environ.get('CLIENT_SECRET'))

"""
Maps user id to their desired mood and their queue. playlist is a list of song IDs. index is the index of the next song to play.
Example:
{
    '3sdf498978328': {
        'mood': (0.25, 0.7, 0.3),
        'playlist': ['fjiw35', 'fijoi424', '2234f5'],
        'index': 2,
    },
}
"""
user_data: Dict[str, Dict[str, Any]] = {}

"""
https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/
- valence
- danceability (based on tempo, rhythm stability, beat strength, regularity)
- energy
- loudness
- tempo
"""
Mood: Tuple[float, float, float] = namedtuple('Mood', 'valence energy danceability')

# Maps a song id to some of its song features
song_id_to_mood: Dict[str, Mood] = {}

str_to_mood: Dict[str, Mood] = {
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

def _fetch_saved_tracks(auth: str) -> List[SongMeta]:
    """
    Return all saved tracks for the given user. If the track is not available in the user's region, it is (theoretically) excluded from the output.
    https://developer.spotify.com/documentation/web-api/reference/library/get-users-saved-tracks/

    :param auth: Authorization ID for the given user.
    """
    res: Dict = spotify_client.saved_tracks(limit=50)
    song_items: List[Dict] = res['items']
    total: int = res['total'] # number of tracks in saved tracks
    if total > 50:
        for offset in range(50, total, 50):
            res: Dict = spotify_client.saved_tracks(limit=50, offset=offset)
            res.raise_for_status()
            song_items += res['items']
    return song_items

def _get_queue(auth: str) -> List[str]:
    """
    Return songs that will be played up next for the current user.
    """
    index = user_data[auth]['index']
    return user_data[auth]['playlist'][index:]

def _get_song_features(song_id: str, auth: str) -> Mood:
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

def _get_song_meta(song_id: str, auth: str) -> Tuple:
    """
    Returns the metadata for a given song.
    """
    pass

def _get_playlist(playlist_id: str, auth: str) -> List[str]:
    """
    Given a playlist id, return a list of its song IDs.
    """
    pass

def _sort(song_ids: List[str], comparator):
    """
    Distance in the latent space. Sort all songs by distance. Take the first n, but with some randomness? Or sort in blocks? We don't want it to be the same every time you click play, but also put the better matches first. Sort them, and shuffle in blocks of 4. Could depend on how many you have.
    """
    pass

def set_mood(mood: str, auth: str):
    """
    Set the mood and creates a new queue based on that.
    """
    user_data[auth]['mood'] = mood
    # TODO

def get_next_songs(index: int, auth: str, num=10) -> List[Dict]:
    """
    Return the next `num` songs to play. index is the index of the next song.
    """
    queue = _get_queue(auth)[:num]

def dequeue_song(auth: str, song_id: str):
    """
    Remove a song from the queue.
    """
    pass

def _get_lyrics_sentiment(song_id: str, auth: str) -> float:
    """
    Return the sentiment of the song corresponding to the given ID, using sentiment analysis on the lyrics, which are from the Genius API.
    """
    pass

def export_playlist(auth: str):
    """
    Create a Spotify playlist from what the user has played.
    """
    user = spotify_client.user_from_token(auth)
    playlist = user.create_playlist('feels', description='sample')
    for track_id in user_data[auth]['playlist']:
        track_obj = spotify_client.get_track(track_id)
        user.add_tracks(playlist, track_obj)

if __name__ == '__main__':
    app.run(host='0.0.0.0')