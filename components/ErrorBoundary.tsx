import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: '#0A1931', minHeight: '100vh' }}>
          <h1 style={{ color: '#FFD700' }}>Ops! Algo deu errado.</h1>
          <p>O aplicativo encontrou um erro inesperado e não pôde ser carregado.</p>
          <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => {
              localStorage.removeItem('agendavoz_appointments');
              localStorage.removeItem('agendavoz_reports');
              localStorage.removeItem('agendavoz_notified_reminders');
              window.location.reload();
            }}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#FFD700', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Limpar Dados e Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
