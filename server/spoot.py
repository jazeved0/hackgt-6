import spotify.sync as spotify
import os
from typing import List, Tuple, Dict

client = spotify.Client(os.environ.get('CLIENT_ID'), os.environ.get('CLIENT_SECRET'))

# https://spotifypy.readthedocs.io/en/latest/api.html

def fetch_saved_tracks(auth: str, country='US', lim=1000) -> List[str]:
    """
    Return the song_ids saved tracks for the given user. If the track is not available in the user's region, it is (theoretically) excluded from the output.
    https://developer.spotify.com/documentation/web-api/reference/library/get-users-saved-tracks/

    `auth`: Authorization ID for the given user.
    `country`: Two-letter abbreviation for the country the user is currently in. This is used to check that a given song in the playlist is available.
    `lim`: The maximum number of song IDs to return.
    """
    total = float('inf')
    song_ids = []
    offset = 0
    while offset < min(total, lim):
        res: Dict = client.saved_tracks(limit=50, offset=offset)
        song_ids += [item['track']['id'] for item in res['items'] if country in item['track']['available markets']]
        total: int = res['total'] # this doesn't need to be set every iteration but it's simpler to do it this way
        offset += 50
    return song_ids

def fetch_playlist(

# TODO
def fetch_popular(auth: str) -> List[str]:
    """
    Return the track IDs of the 200 most popular songs worldwide.
    """
    pass

def user_top_tracks(auth: str) -> List[str]:
    """
    Returns the IDs of the user's top tracks, the tracks that they have the greatest affinity for.
    """
    user = client.user_from_token(auth)
    top_tracks: List[spotify.Track] = user.top_tracks(limit=50)
    return [track.id for track in top_tracks]

# lol haven't checked the docs after this part
def user_top_artists(auth: str) -> List[str]:
    user: spotify.User = client.user_from_token(auth)
    top_artists: List[spotify.Artist] = user.top_artists(limit=50)
    return [artist.id for artist in top_artists]

def artist_top_tracks(artist_id: str) -> List[str]:
    artist: spotify.Artist = client.get_artist(artist_id)
    top_tracks: List[spotify.Track] = artist.top_tracks(limit=50)
    return [track.id for track in top_tracks]
