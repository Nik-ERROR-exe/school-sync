import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import './index.css';
import './i18n'; // Injects i18next configs

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0F172A',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }} 
        />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
