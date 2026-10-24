console.log("Iniciando Agendei...");
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import MirrorView from './src/components/MirrorView';
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
