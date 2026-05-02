import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[2rem] text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-rose-900 uppercase">Ops! Algo deu errado.</h2>
          <p className="text-sm text-rose-700 font-medium max-w-xs mx-auto italic">
            Este módulo encontrou uma falha inesperada. Tente recarregar a seção.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest mx-auto hover:bg-rose-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Recarregar PDV
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}