import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.user_preference import UserPreferencesResponse, UserPreferencesUpdate

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/preferences", response_model=UserPreferencesResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        return UserPreferencesResponse(spotify_playlists=None, spotify_active_id=None)
    
    playlists = None
    if pref.spotify_playlists:
        try:
            playlists = json.loads(pref.spotify_playlists)
        except Exception:
            playlists = None
            
    return UserPreferencesResponse(
        spotify_playlists=playlists,
        spotify_active_id=pref.spotify_active_id
    )

@router.put("/preferences", response_model=UserPreferencesResponse)
def update_preferences(
    pref_in: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    if pref_in.spotify_playlists is not None:
        playlists_data = [p.model_dump() for p in pref_in.spotify_playlists]
        pref.spotify_playlists = json.dumps(playlists_data)

    if pref_in.spotify_active_id is not None:
        pref.spotify_active_id = pref_in.spotify_active_id

    db.commit()
    db.refresh(pref)

    playlists = None
    if pref.spotify_playlists:
        try:
            playlists = json.loads(pref.spotify_playlists)
        except Exception:
            playlists = None

    return UserPreferencesResponse(
        spotify_playlists=playlists,
        spotify_active_id=pref.spotify_active_id
    )
