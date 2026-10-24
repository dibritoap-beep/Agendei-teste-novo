#!/bin/bash
cp App.tsx.backup App.tsx
cp index.css.orig index.css

cat << 'INNER_EOF' > index.html
<!DOCTYPE html><html lang="pt-BR"><head>  <style>body { }</style>    <meta charset="UTF-8">    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">    <meta name="theme-color" content="#0A1931">    <meta name="description" content="Agendei - Assistente de Voz Inteligente">    <meta name="apple-mobile-web-app-capable" content="yes">    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">    <meta name="apple-mobile-web-app-title" content="Agendei">    <link rel="icon" type="image/x-icon" href="/favicon.ico">    <link rel="icon" type="image/svg+xml" href="/logo.svg">    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">    <link rel="manifest" href="/manifest.webmanifest">    <link rel="manifest" href="/manifest.json">    <title>Agendei | Executive</title>    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">    <style>        :root {            --exec-navy: #0A1931;            --exec-sapphire: #0F52BA;            --exec-gold: #FFD700;            --bg-light: #0A1931;            --glass-bg: rgba(17, 34, 64, 0.75);            --glass-border: rgba(255, 215, 0, 0.2);        }        body {             font-family: 'Plus Jakarta Sans', sans-serif;             background: var(--bg-light);            color: #FFFFFF;            min-height: 100vh;            overflow-x: hidden;        }        #root {            height: 100%;            -webkit-overflow-scrolling: touch;        }        .mesh-bg {            position: fixed;            top: 0;            left: 0;            width: 100%;            height: 100%;            z-index: -1;            background:                 radial-gradient(circle at 0% 0%, rgba(255, 215, 0, 0.15) 0%, transparent 40%),                radial-gradient(circle at 100% 100%, rgba(15, 82, 186, 0.2) 0%, transparent 40%),                radial-gradient(circle at 50% 50%, rgba(17, 34, 64, 0.8) 0%, transparent 60%),                var(--bg-light);        }        /* Abstract Background Overlay */        .brazil-map-overlay {            position: fixed;            top: 50%;            left: 50%;            transform: translate(-50%, -50%);            width: 80%;            height: 80%;            z-index: -1;            opacity: 0.05;            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><path fill="%23FFD700" d="M120,80 C150,50 250,40 350,70 C400,90 450,150 430,220 C410,290 440,350 400,420 C360,490 280,480 200,450 C120,420 80,380 50,320 C20,260 50,180 120,80 Z" /></svg>');            background-repeat: no-repeat;            background-position: center;            background-size: contain;            filter: blur(20px);        }        .glass-panel {            background: var(--glass-bg);            backdrop-filter: blur(20px);            -webkit-backdrop-filter: blur(20px);            border: 1px solid var(--glass-border);            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);        }        .logo-executive {            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);            -webkit-background-clip: text;            -webkit-text-fill-color: transparent;            font-weight: 900;        }        .btn-press:active { transform: scale(0.95); }                .custom-scrollbar::-webkit-scrollbar { width: 4px; }        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.3); border-radius: 10px; }        @keyframes pulse-gold {            0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }            70% { box-shadow: 0 0 0 15px rgba(255, 215, 0, 0); }            100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }        }        .voice-pulse { animation: pulse-gold 2s infinite; }    </style></head><body>    <div class="mesh-bg"></div>    <div class="brazil-map-overlay"></div>    <div id="root"></div>    <script type="module" src="/index.tsx"></script></body></html>
INNER_EOF

cat << 'INNER_EOF' > index.tsx
console.log("Iniciando Agendei...");
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import MirrorView from './src/components/MirrorView';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';
import './index.css';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado pelo Boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: 'white', background: '#0A1931', height: '100vh', textAlign: 'center' }}>
          <h1 style={{ color: '#FFD700' }}>Erro de Renderização</h1>
          <p>Ocorreu um problema ao exibir os dados.</p>
          <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '20px', padding: '12px 24px', background: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Resetar App (Limpar Tudo)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Elemento root não encontrado.");
}
// Global error handling
const isBenignViteError = (message: string, stack?: string) => {
  const msgLower = (message || '').toLowerCase();
  const stackLower = (stack || '').toLowerCase();
  return (
    msgLower.includes('websocket') ||
    stackLower.includes('websocket') ||
    msgLower.includes('vite') ||
    stackLower.includes('vite') ||
    msgLower.includes('hmr') ||
    stackLower.includes('hmr') ||
    msgLower.includes('failed to connect') ||
    msgLower.includes('closed without opened')
  );
};
const showFatalError = (message: string, stack?: string) => {
  if (isBenignViteError(message, stack)) return;
  if (document.getElementById('fatal-error-overlay')) return;
  const errDiv = document.createElement('div');
  errDiv.id = 'fatal-error-overlay';
  errDiv.innerHTML = `
    <div style="color:red; background:#0A1931; padding:20px; z-index:9999; position:fixed; top:0; left:0; width:100%; height:100%; overflow:auto; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
      <h1 style="color:#FFD700; font-size:24px; margin-bottom:10px;">⚠️ O App não pôde iniciar</h1>
      <p style="color:#ccc; margin-bottom:20px;">Isso pode ser resolvido limpando o cache ou os dados locais.</p>
      <pre style="color:white; white-space:pre-wrap; font-size:11px; background:rgba(0,0,0,0.5); padding:15px; border-radius:8px; max-width:90%; text-align:left; border: 1px solid rgba(255,215,0,0.2);">${stack || message}</pre>
      <div style="margin-top:30px; display:flex; gap:15px;">
        <button onclick="window.location.reload()" style="padding:14px 28px; background:transparent; color:white; border:2px solid #FFD700; border-radius:12px; font-weight:black; cursor:pointer; text-transform:uppercase; letter-spacing:1px;">Recarregar</button>
        <button onclick="localStorage.clear(); window.location.reload();" style="padding:14px 28px; background:#FFD700; color:black; border:none; border-radius:12px; font-weight:black; cursor:pointer; text-transform:uppercase; letter-spacing:1px; box-shadow: 0 4px 15px rgba(255,215,0,0.3);">Recuperar App</button>
      </div>
    </div>
  `;
  document.body.appendChild(errDiv);
};
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  const stack = event.error?.stack || '';
  if (isBenignViteError(msg, stack)) {
    console.warn("Ignorando erro benigno do Vite WebSocket:", msg);
    return;
  }
  console.error("Erro Global:", event.error);
  showFatalError(msg, stack);
});
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = event.reason?.stack || String(event.reason || '');
  if (isBenignViteError(reasonStr, reasonStr)) {
    console.warn("Ignorando rejeição benigna do Vite WebSocket:", reasonStr);
    return;
  }
  console.error("Rejeição não tratada:", event.reason);
  showFatalError("Falha Assíncrona", reasonStr);
});
// Mounting
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/mirror/:mirrorId" element={<MirrorView />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
// Watchdog: If app doesn't mount in 5s, show recovery
window.onload = () => {
  setTimeout(() => {
    if (rootElement.children.length === 0) {
       console.warn("Watchdog iniciado: App parece travado.");
       showFatalError("O aplicativo está demorando muito para carregar.", "Watchdog Timeout");
    }
  }, 6000);
};
// Service Worker Registration
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nova versão disponível do Agendei. Deseja atualizar agora?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App pronto para uso offline!");
  },
});
INNER_EOF

cat << 'INNER_EOF' > vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      envPrefix: ['VITE_', 'GEMINI_API_KEY', 'API_KEY'],
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['logo.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'apple-touch-icon.png', 'favicon.png', 'favicon.ico', 'icon-512-maskable.png'],
          manifest: {
            name: "Agendei - Assistente de Voz",
            short_name: "Agendei",
            description: "Agenda Inteligente e Transcrição de Reuniões",
            theme_color: "#0A1931",
            background_color: "#0A1931",
            display: "standalone",
            orientation: "portrait",
            icons: [
              {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
              },
              {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
              },
              {
                src: "/icon-512-maskable.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
INNER_EOF

