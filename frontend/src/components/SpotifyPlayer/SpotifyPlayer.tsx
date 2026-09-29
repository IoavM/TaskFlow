import React, { useState, useEffect } from 'react';
import { Disc3, ChevronDown, ChevronUp, ExternalLink, Plus, Trash2, Music, Check, Sparkles } from 'lucide-react';
import './SpotifyPlayer.css';

export interface UserPlaylist {
  id: string;
  name: string;
  url: string;
  embedUrl: string;
}

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

const STORAGE_PLAYLISTS_KEY = 'taskflow_user_playlists';
const STORAGE_ACTIVE_KEY = 'taskflow_active_playlist_id';

export const SpotifyPlayer: React.FC = () => {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PLAYLISTS;
  });

  const [activeId, setActiveId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_ACTIVE_KEY);
    return savedId || DEFAULT_PLAYLISTS[0].id;
  });

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync playlists to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch (e) {
      console.error('Error saving playlists to localStorage', e);
    }
  }, [playlists]);

  // Sync activeId to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_KEY, activeId);
  }, [activeId]);

  const parseSpotifyUrl = (url: string): { type: string; id: string } | null => {
    const clean = url.trim();
    const uriMatch = clean.match(/spotify:(playlist|album|track|artist|show|episode):([a-zA-Z0-9]+)/i);
    if (uriMatch) return { type: uriMatch[1].toLowerCase(), id: uriMatch[2] };
    const webMatch = clean.match(/open\.spotify\.com\/(?:intl-[a-zA-Z0-9-]+\/)?(playlist|album|track|artist|show|episode)\/([a-zA-Z0-9]+)/i);
    if (webMatch) return { type: webMatch[1].toLowerCase(), id: webMatch[2] };
    return null;
  };

  const handleAddPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = newPlaylistName.trim();
    const url = newPlaylistUrl.trim();

    if (!name) {
      setFormError('Por favor asigna un nombre a la playlist');
      return;
    }

    if (!url) {
      setFormError('Por favor pega el enlace de tu playlist de Spotify');
      return;
    }

    const parsed = parseSpotifyUrl(url);
    if (!parsed) {
      setFormError('Enlace inválido. Pega un link de Spotify (ej: https://open.spotify.com/playlist/...)');
      return;
    }

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
  };

  const handleDeletePlaylist = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlists.length <= 1) {
      alert('Debes mantener al menos una playlist guardada.');
      return;
    }

    const updated = playlists.filter((p) => p.id !== idToDelete);
    setPlaylists(updated);
    if (activeId === idToDelete && updated.length > 0) {
      setActiveId(updated[0].id);
    }
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

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              showAddForm
                ? 'bg-slate-900 text-white'
                : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 shadow-2xs'
            }`}
            title={showAddForm ? 'Cerrar formulario' : 'Añadir nueva playlist'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Añadir</span>
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
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activePlaylist.name}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {playlists.map((p) => {
                const isActive = p.id === activePlaylist.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
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
              title={`Spotify Player - ${activePlaylist.name}`}
              src={activePlaylist.embedUrl}
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
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
