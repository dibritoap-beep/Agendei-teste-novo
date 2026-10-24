#!/bin/bash
THEME=$1

# Backup if not exists
if [ ! -f App.tsx.orig ]; then
  cp App.tsx App.tsx.orig
  cp components/VoiceAssistant.tsx components/VoiceAssistant.tsx.orig
  cp index.css index.css.orig
fi

# Reset to original first
cp App.tsx.orig App.tsx
cp components/VoiceAssistant.tsx.orig components/VoiceAssistant.tsx
cp index.css.orig index.css

if [ "$THEME" == "obsidian" ]; then
  echo "Applying Cosmic Obsidian..."
  # App.tsx
  sed -i 's/#0A1931/#09090B/g' App.tsx
  sed -i 's/#0A1526/#09090B/g' App.tsx
  sed -i 's/#1A2B4C/#18181B/g' App.tsx
  sed -i 's/#112240/#27272A/g' App.tsx
  sed -i 's/#233559/#3F3F46/g' App.tsx
  sed -i 's/#FDD835/#06B6D4/g' App.tsx
  sed -i 's/#D4AF37/#0891B2/g' App.tsx
  
  # VoiceAssistant.tsx
  sed -i 's/#FFD700/#06B6D4/g' components/VoiceAssistant.tsx
  sed -i 's/#D4AF37/#0891B2/g' components/VoiceAssistant.tsx
  sed -i 's/#0F52BA/#3B82F6/g' components/VoiceAssistant.tsx

  # index.css variables if any (mostly tailwind config, maybe body bg)
  sed -i 's/#0A1526/#09090B/g' index.css
  
elif [ "$THEME" == "forest" ]; then
  echo "Applying Forest Executive..."
  sed -i 's/#0A1931/#061E1A/g' App.tsx
  sed -i 's/#0A1526/#061E1A/g' App.tsx
  sed -i 's/#1A2B4C/#0F2C27/g' App.tsx
  sed -i 's/#112240/#143D36/g' App.tsx
  sed -i 's/#233559/#1B423B/g' App.tsx
  sed -i 's/#FDD835/#4ADE80/g' App.tsx
  sed -i 's/#D4AF37/#22C55E/g' App.tsx
  
  sed -i 's/#FFD700/#4ADE80/g' components/VoiceAssistant.tsx
  sed -i 's/#D4AF37/#22C55E/g' components/VoiceAssistant.tsx
  sed -i 's/#0F52BA/#15803D/g' components/VoiceAssistant.tsx
  
  sed -i 's/#0A1526/#061E1A/g' index.css

elif [ "$THEME" == "wine" ]; then
  echo "Applying Midnight Wine..."
  sed -i 's/#0A1931/#1A0B13/g' App.tsx
  sed -i 's/#0A1526/#1A0B13/g' App.tsx
  sed -i 's/#1A2B4C/#2D1322/g' App.tsx
  sed -i 's/#112240/#3B182C/g' App.tsx
  sed -i 's/#233559/#442234/g' App.tsx
  sed -i 's/#FDD835/#E0A9A5/g' App.tsx
  sed -i 's/#D4AF37/#BE8C88/g' App.tsx
  
  sed -i 's/#FFD700/#E0A9A5/g' components/VoiceAssistant.tsx
  sed -i 's/#D4AF37/#BE8C88/g' components/VoiceAssistant.tsx
  sed -i 's/#0F52BA/#9F1239/g' components/VoiceAssistant.tsx
  
  sed -i 's/#0A1526/#1A0B13/g' index.css
  
elif [ "$THEME" == "original" ]; then
  echo "Reverted to Original..."
else
  echo "Unknown theme!"
fi
