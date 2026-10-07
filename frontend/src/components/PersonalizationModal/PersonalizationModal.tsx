import React from 'react';
import { X, Palette, Sparkles, Check, Droplets, Sun, Moon, Waves, RotateCcw } from 'lucide-react';
import { useCustomization, GlassTheme, GlassIntensity } from '../../context/CustomizationContext';
import './PersonalizationModal.css';

interface PersonalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEMES: { id: GlassTheme; name: string; desc: string; colors: string[] }[] = [
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    desc: 'Azul cobalto, cian eléctrico e índigo líquido',
    colors: ['#0052FF', '#06B6D4', '#6366F1'],
  },
  {
    id: 'sunset',
    name: 'Sunset Amber',
    desc: 'Ámbar cálido, melocotón y reflejos violetas',
    colors: ['#F59E0B', '#F43F5E', '#8B5CF6'],
  },
  {
    id: 'frost',
    name: 'Apple Crystal Frost',
    desc: 'Hielo puro con bordes especulares hipernítidos',
    colors: ['#E0F2FE', '#38BDF8', '#0284C7'],
  },
  {
    id: 'obsidian',
    name: 'Dark Obsidian',
    desc: 'Vidrio oscuro ahumado con destellos de neón',
    colors: ['#0F172A', '#3B82F6', '#8B5CF6'],
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald',
    desc: 'Verde esmeralda y menta bioluminiscente',
    colors: ['#10B981', '#34D399', '#059669'],
  },
];

const INTENSITIES: { id: GlassIntensity; label: string; desc: string }[] = [
  { id: 'soft', label: 'Suave', desc: 'Desfoque ligero y reflejos tenues' },
  { id: 'medium', label: 'Equilibrado', desc: 'Vidrio líquido clásico y nítido' },
  { id: 'ultra', label: 'Ultra Líquido', desc: 'Máxima refracción, caustics y aberración' },
];

const ACCENT_COLORS = [
  { name: 'Azul Real', hex: '#0052FF' },
  { name: 'Cian Neón', hex: '#06B6D4' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Violeta', hex: '#8B5CF6' },
  { name: 'Ámbar Sol', hex: '#F59E0B' },
  { name: 'Rosa Neón', hex: '#EC4899' },
];

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    setTheme,
    setIntensity,
    setAnimateMesh,
    setAccentColor,
    resetDefaults,
  } = useCustomization();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl personalization-modal-dialog p-6 shadow-2xl relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0052FF] to-cyan-400 text-white flex items-center justify-center shadow-sm">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Personalización & Liquid Glass</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-[#0052FF] font-semibold">
                  En Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Ajusta los temas de color, la intensidad del cristal líquido y los efectos visuales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* Section 1: Themes */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Temas de Cristal Líquido</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEMES.map((th) => {
                const isSelected = settings.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#0052FF] bg-gradient-to-br from-blue-50 via-sky-50/70 to-indigo-50/50 shadow-md shadow-blue-500/10 ring-2 ring-[#0052FF]/30'
                        : 'border-slate-200/80 bg-white/60 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-[#0052FF] text-white shadow-xs'
                              : 'border border-slate-300 bg-white/80'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#0052FF]' : 'text-slate-900'}`}>
                          {th.name}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {th.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-3.5 h-3.5 rounded-full shadow-2xs border border-white/60"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className={`text-[11px] leading-tight ${isSelected ? 'text-blue-900/80 font-medium' : 'text-slate-500'}`}>
                      {th.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Glass Intensity */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Intensidad de Refracción (Liquid Glass)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITIES.map((it) => {
                const isSelected = settings.intensity === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setIntensity(it.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0052FF] bg-blue-50 text-[#0052FF] font-bold shadow-xs ring-2 ring-[#0052FF]/25'
                        : 'border-slate-200/80 bg-white/60 text-slate-600 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1 text-xs font-semibold">
                      {isSelected && <Check className="w-3 h-3 text-[#0052FF] stroke-[3]" />}
                      {it.label}
                    </span>
                    <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-blue-700/80' : 'text-slate-400'}`}>
                      {it.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Floating Dynamic Mesh Animation */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/70 border border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-100 text-[#0052FF]">
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Orbs Líquidos Dinámicos en Fondo
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Animación flotante orgánica que produce refracción viva detrás de las tarjetas
                </span>
              </div>
            </div>
            <button
              onClick={() => setAnimateMesh(!settings.animateMesh)}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                settings.animateMesh ? 'bg-[#0052FF]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                  settings.animateMesh ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section 4: Accent Color */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 block">
              Color de Acento Principal
            </label>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_COLORS.map((col) => {
                const isSelected = settings.accentColor.toLowerCase() === col.hex.toLowerCase();
                return (
                  <button
                    key={col.hex}
                    onClick={() => setAccentColor(col.hex)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                      isSelected ? 'font-bold shadow-xs' : 'font-medium hover:bg-white'
                    }`}
                    style={{
                      borderColor: isSelected ? col.hex : 'rgba(203, 213, 225, 0.7)',
                      backgroundColor: isSelected ? `${col.hex}22` : 'rgba(255, 255, 255, 0.7)',
                      color: isSelected ? col.hex : '#334155',
                      boxShadow: isSelected ? `0 0 0 2px ${col.hex}33` : undefined,
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shadow-2xs flex items-center justify-center shrink-0"
                      style={{ backgroundColor: col.hex }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </div>
                    <span>{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200/70 flex items-center justify-between">
          <button
            onClick={resetDefaults}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Valores Predeterminados</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0052FF] text-white text-xs font-semibold hover:bg-[#0038B6] transition-all shadow-sm"
          >
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
