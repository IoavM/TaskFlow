import React, { useState, useEffect } from 'react';
import { Disc3, ChevronDown, ChevronUp, ExternalLink, Plus, Check } from 'lucide-react';
import './SpotifyPlayer.css';

interface CuratedPlaylist {
  id: string;
  name: string;
  type: 'playlist' | 'album' | 'track';
  spotifyUri: string;
}

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  {
    id: '37i9dQZF1DWWQRwui0ExPn',
    name: 'Lo-Fi Beats',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn',
  },
  {
    id: '37i9dQZF1DX3qCx52Suqom',
    name: 'Deep Focus',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX3qCx52Suqom',
  },
  {
    id: '37i9dQZF1DXdLEN7aqioXM',
    name: 'Synthwave Coding',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioXM',
  },
  {
    id: '37i9dQZF1DX4sWSpwq3LiO',
    name: 'Peaceful Piano',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
  },
];

export const SpotifyPlayer: React.FC = () => {
  const [selectedPlaylist, setSelectedPlaylist] = useState<CuratedPlaylist>(CURATED_PLAYLISTS[0]);
  const [customUrl, setCustomUrl] = useState('');
  const [customEmbedUrl, setCustomEmbedUrl] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('taskflow_spotify_custom');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.embedUrl) {
          setCustomEmbedUrl(parsed.embedUrl);
          setCustomUrl(parsed.originalUrl || '');
          setIsCustomMode(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const parseSpotifyUrl = (url: string): { type: string; id: string } | null => {
    const clean = url.trim();
    const uriMatch = clean.match(/^spotify:(playlist|album|track|artist):([a-zA-Z0-9]+)/);
    if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] };
    const webMatch = clean.match(/open\.spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/);
    if (webMatch) return { type: webMatch[1], id: webMatch[2] };
    return null;
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customUrl.trim()) return;

    const parsed = parseSpotifyUrl(customUrl);
    if (!parsed) {
      setCustomError('Pega un enlace válido de Spotify (ej: https://open.spotify.com/playlist/...)');
      return;
    }

    const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator&theme=0`;
    setCustomEmbedUrl(embedUrl);
    setIsCustomMode(true);

    localStorage.setItem(
      'taskflow_spotify_custom',
      JSON.stringify({ originalUrl: customUrl, embedUrl })
    );
  };

  const handleSelectCurated = (p: CuratedPlaylist) => {
    setSelectedPlaylist(p);
    setIsCustomMode(false);
  };

  const currentEmbedSrc = isCustomMode && customEmbedUrl
    ? customEmbedUrl
    : `https://open.spotify.com/embed/${selectedPlaylist.type}/${selectedPlaylist.id}?utm_source=generator&theme=0`;

  const activeWebUrl = isCustomMode && customUrl
    ? customUrl
    : `https://open.spotify.com/playlist/${selectedPlaylist.id}`;

  return (
    <div className="spotify-liquid-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#1DB954] text-white flex items-center justify-center shadow-xs shadow-emerald-500/30">
            <Disc3 className="w-4 h-4 animate-spin-slow" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            Spotify Focus
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
          title={isExpanded ? 'Minimizar reproductor' : 'Expandir reproductor'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Preset Playlists */}
          <div className="grid grid-cols-2 gap-1.5">
            {CURATED_PLAYLISTS.map((p) => {
              const isActive = !isCustomMode && selectedPlaylist.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectCurated(p)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 border border-white/60'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {isActive && <Check className="w-3 h-3 text-[#1DB954] shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Custom Spotify link input */}
          <form onSubmit={handleApplyCustomUrl} className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Pega cualquier link de Spotify..."
                className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-white/80 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1DB954] transition-all"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-[#1DB954] text-white text-[11px] font-semibold rounded-lg hover:bg-[#1aa34a] transition-all flex items-center gap-1 shrink-0 shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>Cargar</span>
              </button>
            </div>
            {customError && (
              <p className="text-[10px] text-red-600 leading-tight">{customError}</p>
            )}
          </form>

          {/* Official Spotify Embed Player */}
          <div className="spotify-embed-container rounded-xl overflow-hidden shadow-xs border border-white/80 bg-black/90">
            <iframe
              title="Spotify Focus Player"
              src={currentEmbedSrc}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
            />
          </div>

          {/* Direct Actions: Open in App / Open Web */}
          <div className="pt-1 flex items-center justify-between text-[11px]">
            <a
              href={activeWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              Abrir en Spotify Web
            </a>
            <a
              href={activeWebUrl.replace('https://open.spotify.com', 'spotify').replace('http://open.spotify.com', 'spotify')}
              className="text-[#1DB954] font-semibold hover:underline flex items-center gap-1"
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
