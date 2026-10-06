from typing import Optional, List
from pydantic import BaseModel

class SpotifyPlaylistSchema(BaseModel):
    id: str
    name: str
    url: str
    embedUrl: str

class UserPreferencesResponse(BaseModel):
    spotify_playlists: Optional[List[SpotifyPlaylistSchema]] = None
    spotify_active_id: Optional[str] = None

    class Config:
        from_attributes = True

class UserPreferencesUpdate(BaseModel):
    spotify_playlists: Optional[List[SpotifyPlaylistSchema]] = None
    spotify_active_id: Optional[str] = None

