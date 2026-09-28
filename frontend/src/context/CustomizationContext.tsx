import React, { createContext, useContext, useState, useEffect } from 'react';

export type GlassTheme = 'aurora' | 'sunset' | 'frost' | 'obsidian' | 'emerald';
export type GlassIntensity = 'soft' | 'medium' | 'ultra';

interface CustomizationSettings {
  theme: GlassTheme;
  intensity: GlassIntensity;
  animateMesh: boolean;
  accentColor: string;
}

interface CustomizationContextType {
  settings: CustomizationSettings;
  setTheme: (theme: GlassTheme) => void;
  setIntensity: (intensity: GlassIntensity) => void;
  setAnimateMesh: (animate: boolean) => void;
  setAccentColor: (color: string) => void;
  resetDefaults: () => void;
}

const DEFAULT_SETTINGS: CustomizationSettings = {
  theme: 'aurora',
  intensity: 'ultra',
  animateMesh: true,
  accentColor: '#0052FF',
};

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

export const CustomizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CustomizationSettings>(() => {
    try {
      const saved = localStorage.getItem('taskflow_customization');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('taskflow_customization', JSON.stringify(settings));
    } catch {
      // ignore
    }

    // Apply classes to body
    const body = document.body;
    body.classList.remove('theme-aurora', 'theme-sunset', 'theme-frost', 'theme-obsidian', 'theme-emerald');
    body.classList.add(`theme-${settings.theme}`);

    body.classList.remove('glass-soft', 'glass-medium', 'glass-ultra');
    body.classList.add(`glass-${settings.intensity}`);

    if (settings.animateMesh) {
      body.classList.add('mesh-animated');
    } else {
      body.classList.remove('mesh-animated');
    }

    body.style.setProperty('--color-primary', settings.accentColor);
  }, [settings]);

  const setTheme = (theme: GlassTheme) => setSettings((s) => ({ ...s, theme }));
  const setIntensity = (intensity: GlassIntensity) => setSettings((s) => ({ ...s, intensity }));
  const setAnimateMesh = (animateMesh: boolean) => setSettings((s) => ({ ...s, animateMesh }));
  const setAccentColor = (accentColor: string) => setSettings((s) => ({ ...s, accentColor }));
  const resetDefaults = () => setSettings(DEFAULT_SETTINGS);

  return (
    <CustomizationContext.Provider
      value={{
        settings,
        setTheme,
        setIntensity,
        setAnimateMesh,
        setAccentColor,
        resetDefaults,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  );
};

export const useCustomization = () => {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error('useCustomization must be used within a CustomizationProvider');
  }
  return context;
};
