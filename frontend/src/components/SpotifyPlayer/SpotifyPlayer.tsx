import React, { useState, useEffect, useCallback } from 'react';
import { Disc3, ChevronDown, ChevronUp, ExternalLink, Plus, Trash2, Music, Check, Sparkles } from 'lucide-react';
import { UserPlaylist } from '../../types';
import { api } from '../../services/api';
import './SpotifyPlayer.css';

export type { UserPlaylist };

const DEFAULT_PLAYLISTS: UserPlaylist[] = [
  {
    id: '37i9dQZF1DWWQRwui0ExPn',
    name: 'Lo-Fi Beats',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0',
  },
  {
    id: '37i9dQZF1DX3qCx52Suqom',
    name: 'Deep Focus',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX3qCx52Suqom',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX3qCx52Suqom?utm_source=generator&theme=0',
  },
  {
    id: '37i9dQZF1DXdLEN7aqioXM',
    name: 'Synthwave Coding',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0',
  },
];

const LEGACY_STORAGE_PLAYLISTS_KEY = 'taskflow_user_playlists';
const LEGACY_STORAGE_ACTIVE_KEY = 'taskflow_active_playlist_id';

const getStoragePlaylistsKey = (userId?: number) =>
  userId ? `taskflow_spotify_playlists_user_${userId}` : LEGACY_STORAGE_PLAYLISTS_KEY;

const getStorageActiveKey = (userId?: number) =>
  userId ? `taskflow_spotify_active_user_${userId}` : LEGACY_STORAGE_ACTIVE_KEY;

export const SpotifyPlayer: React.FC = () => {
  const currentUser = api.getCurrentStoredUser();

  // 1. Instant Cache-First Load
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(() => {
    try {
      const userKey = getStoragePlaylistsKey(currentUser?.id);
      const savedUser = localStorage.getItem(userKey);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Fallback to legacy key
      const legacy = localStorage.getItem(LEGACY_STORAGE_PLAYLISTS_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) return parsedLegacy;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PLAYLISTS;
  });

  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const userActiveKey = getStorageActiveKey(currentUser?.id);
      const savedActive = localStorage.getItem(userActiveKey);
      if (savedActive) return savedActive;

      const legacyActive = localStorage.getItem(LEGACY_STORAGE_ACTIVE_KEY);
      if (legacyActive) return legacyActive;
    } catch {
      // Fallback
    }
    return DEFAULT_PLAYLISTS[0].id;
  });

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // 2. Synchronize with Cloud Account on Mount / Login
  useEffect(() => {
    const user = api.getCurrentStoredUser();
    if (!user) return;

    let isMounted = true;

    const syncWithBackend = async () => {
      try {
        const prefs = await api.getUserPreferences();
        if (!isMounted) return;

        if (prefs && prefs.spotify_playlists && prefs.spotify_playlists.length > 0) {
          // Cloud has saved playlists, sync down to state and cache
          setPlaylists(prefs.spotify_playlists);
          const userKey = getStoragePlaylistsKey(user.id);
          localStorage.setItem(userKey, JSON.stringify(prefs.spotify_playlists));

          if (prefs.spotify_active_id) {
            setActiveId(prefs.spotify_active_id);
            localStorage.setItem(getStorageActiveKey(user.id), prefs.spotify_active_id);
          }
        } else {
          // Cloud has no playlists yet; sync local cache UP to cloud account
          if (playlists.length > 0) {
            await api.updateUserPreferences({
              spotify_playlists: playlists,
              spotify_active_id: activeId,
            });
          }
        }
      } catch (err) {
        console.warn('[SpotifyPlayer] Cloud sync offline or fallback to local cache:', err);
      }
    };

    syncWithBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to persist to both user-scoped localStorage and cloud backend
  const persistChanges = useCallback(async (updatedPlaylists: UserPlaylist[], newActiveId: string) => {
    const user = api.getCurrentStoredUser();
    const playlistsKey = getStoragePlaylistsKey(user?.id);
    const activeKey = getStorageActiveKey(user?.id);

    // 1. Instant local cache update
    try {
      localStorage.setItem(playlistsKey, JSON.stringify(updatedPlaylists));
      localStorage.setItem(activeKey, newActiveId);
      // Also update legacy keys as fallback
      localStorage.setItem(LEGACY_STORAGE_PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));
      localStorage.setItem(LEGACY_STORAGE_ACTIVE_KEY, newActiveId);
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }

    // 2. Cloud sync if authenticated
    if (user) {
      try {
        await api.updateUserPreferences({
          spotify_playlists: updatedPlaylists,
          spotify_active_id: newActiveId,
        });
      } catch (err) {
        console.warn('[SpotifyPlayer] Could not persist to cloud backend:', err);
      }
    }
  }, []);

  const parseSpotifyUrl = (url: string): { type: string; id: string } | null => {
    const clean = url.trim();
    const uriMatch = clean.match(/spotify:(playlist|album|track|artist|show|episode):([a-zA-Z0-9]+)/i);
    if (uriMatch) return { type: uriMatch[1].toLowerCase(), id: uriMatch[2] };
    const webMatch = clean.match(/open\.spotify\.com\/(?:intl-[a-zA-Z0-9-]+\/)?(playlist|album|track|artist|show|episode)\/([a-zA-Z0-9]+)/i);
    if (webMatch) return { type: webMatch[1].toLowerCase(), id: webMatch[2] };
    return null;
  };

  const handleAddPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const url = newPlaylistUrl.trim();
    if (!url) {
      setFormError('Por favor pega el enlace de tu playlist o canción de Spotify');
      return;
    }

    const parsed = parseSpotifyUrl(url);
    if (!parsed) {
      setFormError('Enlace inválido. Pega un link de Spotify (ej: https://open.spotify.com/playlist/...)');
      return;
    }

    // Friendly default name if user leaves it blank
    const typeLabel =
      parsed.type === 'playlist' ? 'Mi Playlist' : parsed.type === 'album' ? 'Mi Álbum' : 'Mi Música';
    const name = newPlaylistName.trim() || `${typeLabel} #${playlists.length + 1}`;

    const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator&theme=0`;
    const newPlaylist: UserPlaylist = {
      id: `${parsed.id}_${Date.now()}`,
      name,
      url,
      embedUrl,
    };

    const updated = [newPlaylist, ...playlists];
    setPlaylists(updated);
    setActiveId(newPlaylist.id);
    setNewPlaylistName('');
    setNewPlaylistUrl('');
    setShowAddForm(false);

    await persistChanges(updated, newPlaylist.id);
  };

  const handleSelectPlaylist = async (id: string) => {
    setActiveId(id);
    await persistChanges(playlists, id);
  };

  const handleDeletePlaylist = async (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlists.length <= 1) {
      alert('Debes mantener al menos una playlist guardada.');
      return;
    }

    const updated = playlists.filter((p) => p.id !== idToDelete);
    const nextActiveId = activeId === idToDelete && updated.length > 0 ? updated[0].id : activeId;

    setPlaylists(updated);
    setActiveId(nextActiveId);

    await persistChanges(updated, nextActiveId);
  };

  const activePlaylist = playlists.find((p) => p.id === activeId) || playlists[0] || DEFAULT_PLAYLISTS[0];

  return (
    <div className="spotify-liquid-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#1DB954] text-white flex items-center justify-center shadow-xs shadow-emerald-500/30">
            <Disc3 className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block leading-tight">
              Spotify
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Tus Playlists ({playlists.length})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
              showAddForm
                ? 'bg-[#1DB954] text-white shadow-xs shadow-emerald-500/30'
                : 'bg-white/90 text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-[#1DB954] hover:text-white hover:border-[#1DB954] hover:shadow-md hover:shadow-emerald-500/25 active:scale-95'
            }`}
            title={showAddForm ? 'Cerrar formulario' : 'Añadir nueva playlist'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">Añadir Playlist</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
            title={isExpanded ? 'Minimizar reproductor' : 'Expandir reproductor'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Add Playlist Form */}
          {showAddForm && (
            <form onSubmit={handleAddPlaylist} className="p-3 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>Guardar nueva playlist propia</span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                  Nombre de tu playlist
                </label>
                <input
                  type="text"
                  required
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Ej: Mi Música de Estudio, Rock, Lofi..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1DB954] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                  Enlace de Spotify (URL o URI)
                </label>
                <input
                  type="text"
                  required
                  value={newPlaylistUrl}
                  onChange={(e) => setNewPlaylistUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1DB954] transition-all"
                />
              </div>

              {formError && (
                <p className="text-[10px] text-red-600 leading-tight">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormError(null);
                  }}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#1DB954] hover:bg-[#1aa34a] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          )}

          {/* User Saved Playlists Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Selecciona tu playlist
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 truncate max-w-[180px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">{activePlaylist.name}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {playlists.map((p) => {
                const isActive = p.id === activePlaylist.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPlaylist(p.id)}
                    className={`group px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                      <Music className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1DB954]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span className="truncate font-semibold">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <Check className="w-3.5 h-3.5 text-[#1DB954] shrink-0" />
                      )}
                      {playlists.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeletePlaylist(p.id, e)}
                          className={`p-1 rounded transition-colors ${
                            isActive
                              ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                              : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title="Eliminar playlist"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Spotify Embed Player */}
          <div className="spotify-embed-container rounded-xl overflow-hidden shadow-sm border border-slate-200/80 bg-black">
            <iframe
              key={activePlaylist.id}
              title={`Spotify Player - ${activePlaylist.name}`}
              src={
                activePlaylist.embedUrl && activePlaylist.embedUrl.includes('open.spotify.com/embed/')
                  ? activePlaylist.embedUrl
                  : (parseSpotifyUrl(activePlaylist.url)
                      ? `https://open.spotify.com/embed/${parseSpotifyUrl(activePlaylist.url)!.type}/${parseSpotifyUrl(activePlaylist.url)!.id}?utm_source=generator&theme=0`
                      : DEFAULT_PLAYLISTS[0].embedUrl)
              }
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="eager"
              className="rounded-xl w-full"
            />
          </div>

          {/* Direct Actions: Open in App / Open Web */}
          <div className="pt-0.5 flex items-center justify-between text-xs">
            <a
              href={activePlaylist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors"
            >
              Abrir en Spotify Web
            </a>
            <a
              href={activePlaylist.url.replace('https://open.spotify.com', 'spotify').replace('http://open.spotify.com', 'spotify')}
              className="text-[11px] text-[#1DB954] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Abrir en App</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
