#!/bin/bash
# Reverte para o original como combinado
cp App.tsx.orig App.tsx
cp components/VoiceAssistant.tsx.orig components/VoiceAssistant.tsx

# Fundos para branco e tons muito claros de cinza (slate)
sed -i 's/bg-\[#1A2B4C\]/bg-white shadow-sm border border-slate-100/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/bg-\[#0A1931\]/bg-white/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/bg-\[#0A1526\]/bg-slate-50 border border-slate-100/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/bg-\[#112240\]/bg-slate-50/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/bg-\[#233559\]/bg-slate-100/g' App.tsx components/VoiceAssistant.tsx

# Efeitos de Hover
sed -i 's/hover:bg-\[#233559\]/hover:bg-slate-100/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/hover:bg-\[#1A2B4C\]/hover:bg-slate-50/g' App.tsx components/VoiceAssistant.tsx

# Cores de Texto (para escuro, já que o fundo agora é claro)
sed -i 's/text-white\/60/text-slate-500/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/text-white\/80/text-slate-600/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/text-white/text-slate-800/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/text-gray-300/text-slate-600/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/text-gray-400/text-slate-500/g' App.tsx components/VoiceAssistant.tsx

# Corrigir textos em botões primários para branco
sed -i 's/text-\[#1A2B4C\]/text-white/g' App.tsx components/VoiceAssistant.tsx

# Converter os amarelos para um tom de Âmbar para dar contraste no branco
sed -i 's/text-\[#FDD835\]/text-amber-600/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/border-\[#FDD835\]/border-amber-600/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/bg-\[#FDD835\]/bg-amber-500/g' App.tsx components/VoiceAssistant.tsx

# Bordas
sed -i 's/border-\[#233559\]/border-slate-200/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/border-white\/10/border-slate-200/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/border-white\/5/border-slate-100/g' App.tsx components/VoiceAssistant.tsx
sed -i 's/border-white\/20/border-slate-300/g' App.tsx components/VoiceAssistant.tsx
