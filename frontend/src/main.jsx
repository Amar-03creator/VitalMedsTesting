import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles/globals.css';

Amplify.configure({
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#1f2937',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
        },
        success: { iconTheme: { primary: '#0d9488', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
      }}
    />
    <App />
  </React.StrictMode>
);
