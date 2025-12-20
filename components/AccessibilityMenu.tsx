'use client';

import { useState, useEffect } from 'react';
import { Eye, Type, Contrast, Link as LinkIcon, Pause, Palette, MousePointer, X } from 'lucide-react';

type AccessibilitySettings = {
  fontSize: number;
  highContrast: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  pauseAnimations: boolean;
  grayscale: boolean;
  largeCursor: boolean;
};

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 100,
    highContrast: false,
    highlightLinks: false,
    readableFont: false,
    pauseAnimations: false,
    grayscale: false,
    largeCursor: false,
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  // Apply settings
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    if (settings.fontSize !== 100) {
      root.style.fontSize = `${settings.fontSize}%`;
    } else {
      root.style.fontSize = '';
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Highlight links
    if (settings.highlightLinks) {
      root.classList.add('highlight-links');
    } else {
      root.classList.remove('highlight-links');
    }

    // Readable font
    if (settings.readableFont) {
      root.classList.add('readable-font');
    } else {
      root.classList.remove('readable-font');
    }

    // Pause animations
    if (settings.pauseAnimations) {
      root.classList.add('pause-animations');
    } else {
      root.classList.remove('pause-animations');
    }

    // Grayscale
    if (settings.grayscale) {
      root.classList.add('grayscale');
    } else {
      root.classList.remove('grayscale');
    }

    // Large cursor
    if (settings.largeCursor) {
      root.classList.add('large-cursor');
    } else {
      root.classList.remove('large-cursor');
    }

    // Save to localStorage
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
  }, [settings]);

  const resetSettings = () => {
    const defaultSettings: AccessibilitySettings = {
      fontSize: 100,
      highContrast: false,
      highlightLinks: false,
      readableFont: false,
      pauseAnimations: false,
      grayscale: false,
      largeCursor: false,
    };
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility_settings');
  };

  return (
    <>
      {/* Accessibility Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 bottom-24 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110"
        aria-label="תפריט נגישות"
      >
        <Eye className="w-6 h-6" />
      </button>

      {/* Accessibility Menu */}
      {isOpen && (
        <div className="fixed left-4 bottom-40 z-50 bg-white rounded-2xl shadow-2xl border border-stone-200 w-80 max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-stone-200 p-4 flex items-center justify-between rounded-t-2xl">
            <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              הגדרות נגישות
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings */}
          <div className="p-4 space-y-4">
            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <Type className="w-4 h-4" />
                  גודל טקסט
                </label>
                <span className="text-xs text-stone-500">{settings.fontSize}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="150"
                step="10"
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* High Contrast */}
            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-2">
                <Contrast className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-stone-700">ניגודיות גבוהה</span>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => setSettings({ ...settings, highContrast: e.target.checked })}
                className="w-5 h-5 accent-blue-600"
              />
            </label>

            {/* Highlight Links */}
            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-stone-700">הדגש קישורים</span>
              </div>
              <input
                type="checkbox"
                checked={settings.highlightLinks}
                onChange={(e) => setSettings({ ...settings, highlightLinks: e.target.checked })}
                className="w-5 h-5 accent-blue-600"
              />
            </label>

            {/* Readable Font */}
            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-stone-700">גופן קריא (דיסלקציה)</span>
              </div>
              <input
                type="checkbox"
                checked={settings.readableFont}
                onChange={(e) => setSettings({ ...settings, readableFont: e.target.checked })}
                className="w-5 h-5 accent-blue-600"
              />
            </label>

            {/* Pause Animations */}
            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-stone-700">עצור אנימציות</span>
              </div>
              <input
                type="checkbox"
                checked={settings.pauseAnimations}
                onChange={(e) => setSettings({ ...settings, pauseAnimations: e.target.checked })}
                className="w-5 h-5 accent-blue-600"
              />
            </label>

            {/* Grayscale */}
            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-stone-700">מצב אפור</span>
              </div>
              <input
                type="checkbox"
                checked={settings.grayscale}
                onChange={(e) => setSettings({ ...settings, grayscale: e.target.checked })}
                className="w-5 h-5 accent-blue-600"
              />
            </label>

            {/* Large Cursor */}
            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-medium text-stone-700">סמן עכבר גדול</span>
              </div>
              <input
                type="checkbox"
                checked={settings.largeCursor}
                onChange={(e) => setSettings({ ...settings, largeCursor: e.target.checked })}
                className="w-5 h-5 accent-blue-600"
              />
            </label>

            {/* Reset Button */}
            <button
              onClick={resetSettings}
              className="w-full mt-4 py-2 px-4 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg font-medium transition-colors"
            >
              איפוס הגדרות
            </button>
          </div>
        </div>
      )}
    </>
  );
}
