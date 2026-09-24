import * as React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ToastProvider from './components/ToastProvider';
import SupabaseProvider from './components/SupabaseProvider';
import { supabase } from './lib/supabase';
import '@/index.css'; // Usando o alias de raiz do projeto

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Obter a sessão inicial do Supabase antes de renderizar
supabase.auth.getSession().then(({ data: { session } }) => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ToastProvider />
      <SupabaseProvider initialSession={session}>
        <App />
      </SupabaseProvider>
    </React.StrictMode>
  );
});