import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Mic, MicOff } from 'lucide-react';
import { SpotifyPlayer } from '../SpotifyPlayer/SpotifyPlayer';
import { useToast } from '../../context/ToastContext';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import sidebarConfig from './SidebarOptions.json';
import './SidebarOptions.css';

interface SidebarOptionsProps {
  onDirectAICreate: (prompt: string) => Promise<void>;
  onOpenManualModal: () => void;
}

export const SidebarOptions: React.FC<SidebarOptionsProps> = ({
  onDirectAICreate,
  onOpenManualModal,
}) => {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const basePromptRef = useRef('');

  const { isListening, isSupported, toggleListening, error: speechError } = useSpeechRecognition({
    onResult: (transcript) => {
      const combined = basePromptRef.current
        ? `${basePromptRef.current} ${transcript}`.trim()
        : transcript;
      setPromptText(combined);
    },
  });

  useEffect(() => {
    if (speechError) {
      toast.error(speechError);
    }
  }, [speechError, toast]);

  const handleToggleVoice = () => {
    if (!isSupported) {
      toast.error('Tu navegador no soporta dictado por voz. Usa Chrome, Edge o Safari.');
      return;
    }
    if (!isListening) {
      basePromptRef.current = promptText.trim();
    }
    toggleListening();
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || loadingAI) return;
    try {
      setLoadingAI(true);
      await onDirectAICreate(promptText);
      setPromptText('');
      basePromptRef.current = '';
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la tarea con Groq.');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="sidebar-card space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{sidebarConfig.title}</span>
        </div>
        <p className="text-[11px] text-[#64748B]">{sidebarConfig.subtitle}</p>
      </div>

      {/* Autonomous AI Task Creator */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white border border-blue-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0052FF] text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">{sidebarConfig.aiSection.title}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
          Escribe o dicta por voz tu instrucción y la IA creará la tarea con sus bloques en tu cronograma:
        </p>

        <form onSubmit={handleAISubmit} className="space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={
                isListening
                  ? '🎙️ Escuchando... habla ahora en voz alta'
                  : 'Ej: Tengo examen de cálculo el jueves y quiero estudiar lunes y miércoles de 2 a 4 pm...'
              }
              className={`w-full text-xs p-2.5 pr-9 rounded-lg border transition-all resize-none ${
                isListening
                  ? 'border-red-400 bg-red-50/40 text-slate-900 ring-2 ring-red-400/20'
                  : 'border-blue-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF]'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAISubmit(e);
                }
              }}
            />
            {/* Microphone dictation button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30 scale-105'
                  : 'text-slate-400 hover:text-[#0052FF] hover:bg-blue-50/80'
              }`}
              title={isListening ? 'Detener dictado por voz' : 'Dictar instrucción por voz'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isListening && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-medium px-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Escuchando tu voz... (habla y se escribe en vivo)</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loadingAI || !promptText.trim()}
            className="w-full py-2 px-3 rounded-lg bg-[#0052FF] text-white text-xs font-semibold hover:bg-[#0038B6] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            {loadingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Planificando tarea...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Crear Tarea con IA</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Spotify Integration */}
      <SpotifyPlayer />
    </div>
  );
};
