import React from 'react';
import { Palette, Check, Sparkles, RotateCcw } from 'lucide-react';
import { THEMES, ThemeId, ThemeConfig } from '../utils/theme';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
  compact = false,
}) => {
  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1A2B4C] border border-white/10 flex items-center justify-center text-[#FDD835]">
              <Palette size={16} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Realce de Cores</h4>
              <p className="text-[10px] text-white/50 uppercase">Personalize a identidade visual do AGENDEI</p>
            </div>
          </div>

          {currentTheme !== 'original' && (
            <button
              onClick={() => onSelectTheme('original')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
              title="Voltar ao tom original padrão"
            >
              <RotateCcw size={11} /> Voltar ao Original
            </button>
          )}
        </div>
      )}

      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-1 sm:grid-cols-2 gap-3'}`}>
        {THEMES.map((theme: ThemeConfig) => {
          const isSelected = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              className={`text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'border-[#FDD835] bg-[#112240] shadow-[0_0_20px_rgba(253,216,53,0.15)] ring-1 ring-[#FDD835]'
                  : 'border-white/5 bg-[#112240]/60 hover:bg-[#112240] hover:border-white/15'
              }`}
            >
              {/* Subtle top gradient using theme accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-opacity"
                style={{
                  background: `linear-gradient(90deg, ${theme.bgColor}, ${theme.secondaryColor}, ${theme.accentColor})`,
                  opacity: isSelected ? 1 : 0.4,
                }}
              />

              <div className="flex items-start justify-between gap-2 mt-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white uppercase tracking-wider truncate">
                      {theme.name}
                    </span>
                    <span
                      className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border"
                      style={{
                        borderColor: `${theme.accentColor}55`,
                        color: theme.accentColor,
                        backgroundColor: `${theme.accentColor}15`,
                      }}
                    >
                      {theme.badge}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-white/50 uppercase truncate mt-0.5">
                    {theme.tagline}
                  </p>
                </div>

                {isSelected ? (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-black shadow-md animate-in zoom-in-75 duration-200"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0 group-hover:border-white/40 transition-colors" />
                )}
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/5">
                <div className="flex items-center -space-x-1">
                  {theme.previewColors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: color }}
                      title={`Cor ${idx + 1}: ${color}`}
                    />
                  ))}
                </div>
                <span className="text-[8.5px] font-bold text-white/40 uppercase tracking-widest ml-1.5">
                  {isSelected ? 'Em uso' : 'Clique para aplicar'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
