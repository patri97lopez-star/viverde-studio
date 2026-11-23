import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F0E7] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#303632]/15 rounded-xl p-8">
            <h2 className="font-display text-2xl font-semibold text-[#183D32] mb-2">
              Se ha producido un error en la sesión
            </h2>
            <p className="text-sm text-[#303632]/80 mb-4">
              {this.state.message || 'Ha ocurrido un error inesperado al procesar los datos.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-[#183D32] text-white text-sm font-medium rounded-lg hover:bg-[#122e25] transition-colors"
            >
              Recargar espacio de trabajo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
