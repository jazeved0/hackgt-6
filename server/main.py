from flask import Flask, flash, redirect, render_template, request, session, abort
import sys
import spotipy
import spotipy.util as util
import random
import requests
from collections import namedtuple
from typing import Dict, Tuple, Any
from math import ceil

app = Flask(__name__)

"""
Maps user id to their desired mood and their queue. index is the index of the next song to play.
Example:
{
    '3498978328': {
        'mood': 'upbeat',
        'playlist': [3, 24, 5],
        'index': 2,
    },
    …
}
"""
data: Dict[str, Dict[str, Any]] = {}

"""
https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/
- valence
- danceability (based on tempo, rhythm stability, beat strength, regularity)
- energy
- loudness
- tempo
"""
SongFeatures: Tuple[float, float, float, float, float] = namedtuple('SongFeatures', 'valence danceability energy loudness tempo')
# Maps a song id to its song features
song_features_cache: Dict[str, SongFeatures] = {}

# TODO
SongMeta: Tuple = namedtuple('SongMeta', 'id name images ')

# TODO: wait a sec I should probably just use Spotipy
def _fetch_saved_tracks(auth: str) -> List[SongMeta]:
    """
    Return saved tracks for the given user. If the track is not available in the user's region, it is excluded from the output.
    https://developer.spotify.com/documentation/web-api/reference/library/get-users-saved-tracks/

    :param auth: Authorization ID for the given user.
    """
    try:
        res: Dict = requests.get(
            f'https://api.spotify.com/v1/me/tracks',
            params={'limit': 50},
            headers={'Authorization': auth}
        )
        res.raise_for_status()
        song_items: List[Dict] = res['items']
        total: int = res['total'] # number of tracks in saved tracks
        if total > 50:
            for offset in range(50, total, 50):
                res: Dict = requests.get(
                    f'https://api.spotify.com/v1/me/tracks',
                    params={'limit': 50, 'offset': offset},
                    headers={'Authorization': auth}
                )
                res.raise_for_status()
                song_items += res['items']
        return song_items
    except Exception as err:
        print(f'Error: {err}')

def _get_queue(auth: str) -> List[str]:
    """
    Return songs that will be played up next for the current user.
    """
    index = data[auth]['index']
    return data[auth]['playlist'][index:]

def _get_song_features(song_id: str, auth: str) -> SongFeatures:
    """
    Return the song features for the given song ID, as a named tuple SongFeatures. This gets it from the cache if available, or else gets it from Spotify, and then adds it to song_features_cache.
    """
    pass

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
    data[auth]['mood'] = mood
    # TODO

def get_next_songs(index: int, auth: str, num=10) -> List[Dict]:
    """
    Return the next `num` songs to play. index is the index of the next song.
    """
    queue = _get_queue(auth)[num]

def _get_lyrics_sentiment(song_id: str, auth: str) -> float:
    """
    Return the sentiment of the song corresponding to the given ID, using sentiment analysis on the lyrics, which are from the Genius API.
    """
    pass

def dequeue_song(auth: str, song_id: str):
    """
    Remove a song from the queue.
    """
    pass

# TODO, not super important
def export_playlist(auth: str):
    """
    Create a Spotify playlist from what the user has played.
    """
    pass

if __name__ == '__main__':
    app.run(host='0.0.0.0')