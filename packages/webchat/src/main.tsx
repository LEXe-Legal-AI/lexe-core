import { StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App';
import { LoginPage, CallbackPage } from './components/auth';
import { useAuthStore } from './stores/authStore';

// Import i18n configuration
import './i18n';

// Import global styles
import './styles/globals.css';

// Initialize theme synchronously before React renders to prevent flash
function initializeThemeBeforeRender() {
  try {
    const stored = localStorage.getItem('leo-ui-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const theme = parsed?.state?.theme || 'dark';
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      // Default to dark mode
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch {
    // Default to dark mode on error
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// Run before React renders
initializeThemeBeforeRender();

// Loading fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-leo-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading LEO Webchat...</p>
      </div>
    </div>
  );
}

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();

  // Initialize auth on mount to check for existing tokens
  useEffect(() => {
    // Only init if not already loading and not authenticated
    if (!isLoading && !isAuthenticated) {
      initAuth();
    }
  }, []); // Run once on mount

  if (isLoading) {
    return <LoadingFallback />;
  }

  // Require authentication - redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// App Router
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        {/* Magic link verification route */}
        <Route path="/auth/verify" element={<CallbackPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Mount application
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <AppRouter />
    </Suspense>
  </StrictMode>
);
