import React from 'react';
import { AppProvider } from './context/AppContext';

export default function App({ children }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}