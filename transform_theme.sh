#!/bin/bash
cp App.tsx.orig App.tsx
cp components/VoiceAssistant.tsx.orig components/VoiceAssistant.tsx

for f in App.tsx components/VoiceAssistant.tsx; do
  # Backgrounds
  sed -i 's/bg-\[#0A1931\]/bg-\[var(--bg-panel)\]/g' $f
  sed -i 's/bg-\[#0A1526\]/bg-\[var(--bg-panel-alt)\]/g' $f
  sed -i 's/bg-\[#1A2B4C\]/bg-\[var(--bg-card)\]/g' $f
  sed -i 's/bg-\[#112240\]/bg-\[var(--bg-card-alt)\]/g' $f
  sed -i 's/bg-\[#233559\]/bg-\[var(--bg-hover)\]/g' $f
  sed -i 's/bg-\[#FDD835\]/bg-\[var(--brand)\]/g' $f
  sed -i 's/bg-\[#EF5350\]/bg-red-500/g' $f

  # Hover Backgrounds
  sed -i 's/hover:bg-\[#1A2B4C\]/hover:bg-\[var(--bg-card)\]/g' $f
  sed -i 's/hover:bg-\[#233559\]/hover:bg-\[var(--bg-hover)\]/g' $f
  sed -i 's/hover:bg-\[#FDD835\]/hover:bg-\[var(--brand)\]/g' $f
  sed -i 's/hover:bg-\[#EF5350\]\/20/hover:bg-red-500\/20/g' $f

  # Borders
  sed -i 's/border-\[#233559\]/border-\[var(--border-color)\]/g' $f
  sed -i 's/border-\[#FDD835\]/border-\[var(--brand)\]/g' $f
  sed -i 's/border-white\/5/border-\[var(--border-subtle)\]/g' $f
  sed -i 's/border-white\/10/border-\[var(--border-subtle)\]/g' $f
  sed -i 's/border-white\/20/border-\[var(--border-strong)\]/g' $f
  sed -i 's/border-\[#0F52BA\]\/30/border-\[var(--brand)\]\/30/g' $f
  sed -i 's/border-\[#0F52BA\]\/50/border-\[var(--brand)\]\/50/g' $f

  # Text Colors
  sed -i 's/text-\[#FDD835\]/text-\[var(--brand)\]/g' $f
  sed -i 's/text-\[#1A2B4C\]/text-\[var(--text-inv)\]/g' $f
  sed -i 's/text-\[#EF5350\]/text-red-500/g' $f
  
  # Be careful with text-white vs text-white/60
  sed -i 's/text-white\/60/text-\[var(--text-muted)\]/g' $f
  sed -i 's/text-white\/80/text-\[var(--text-muted)\]/g' $f
  sed -i 's/text-gray-300/text-\[var(--text-muted)\]/g' $f
  sed -i 's/text-gray-400/text-\[var(--text-muted)\]/g' $f
  sed -i 's/text-gray-200/text-\[var(--text-main)\]/g' $f
  sed -i 's/text-white/text-\[var(--text-main)\]/g' $f

  # Fills (for SVGs like logos)
  sed -i 's/fill="white"/fill="var(--text-main)"/g' $f
  sed -i 's/fill="#FDD835"/fill="var(--brand)"/g' $f
  sed -i 's/stroke="white"/stroke="var(--text-main)"/g' $f
  
done

# Update fonts and uppercase as before
for f in App.tsx components/VoiceAssistant.tsx; do
  sed -i 's/font-black/font-semibold/g' $f
  sed -i 's/font-bold/font-semibold/g' $f
  sed -i 's/tracking-widest/tracking-wide/g' $f
  sed -i 's/tracking-\[0.2em\]/tracking-wide/g' $f
done
