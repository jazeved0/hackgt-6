import spotify.sync as spotify
import os
from typing import List, Tuple, Dict
import asyncio

try:
    client = spotify.Client(os.environ.get('CLIENT_ID'), os.environ.get('CLIENT_SECRET'))
except TypeError as e:
    print('Did you remember to set environment variables CLIENT_ID and CLIENT_SECRET?')
    raise e

# https://spotifypy.readthedocs.io/en/latest/api.html

def fetch_saved_tracks(token: str) -> List[str]:
    """
    Return the song_ids saved tracks for the given user.

    `token`: user token
    """
    library = spotify.Library(client, client.user_from_token(token))
    saved_tracks = library.get_all_tracks()
    output = [track.id for track in saved_tracks]
    return output

def fetch_playlist(playlist_id: str) -> List[str]:
    playlist = client.get_playlist(playlist_id)
    tracks = playlist.get_all_tracks()
    output = [track.id for track in tracks]
    return output

def top_global() -> List[str]:
    return fetch_playlist('3WxTnGherpf7t4F0VzchD4')

def user_top_tracks(token: str) -> List[str]:
    """
    Returns the IDs of the user's top tracks, the tracks that they have the greatest affinity for.
    """
    user = client.user_from_token(token)
    top_tracks: List[spotify.Track] = user.top_tracks(limit=50)
    return [track.id for track in top_tracks]

# lol haven't checked the docs after this part
def user_top_artists(token: str) -> List[str]:
    user: spotify.User = client.user_from_token(token)
    top_artists: List[spotify.Artist] = user.top_artists(limit=50)
    return [artist.id for artist in top_artists]

def artist_top_tracks(artist_id: str, limit=10) -> List[str]:
    artist: spotify.Artist = client.get_artist(artist_id)
    top_tracks: List[spotify.Track] = artist.top_tracks(limit=limit)
    return [track.id for track in top_tracks]

def user_top_trackss(token: str) -> List[str]:
    """
    Return the track IDs of the user's top tracks concatenated with the top 10 tracks for each of the user's top 50 artists.
    """
    return user_top_tracks(token) + [t for t in artist_top_tracks(artist_id) for artist_id in user_top_artists(token)]
