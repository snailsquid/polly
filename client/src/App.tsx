import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import CreatePoll from '@/pages/CreatePoll';
import PollDetail from '@/pages/PollDetail';
import LivePoll from '@/pages/LivePoll';
import Results from '@/pages/Results';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  if (!userId) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { userId } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={userId ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/poll/new"
        element={
          <ProtectedRoute>
            <CreatePoll />
          </ProtectedRoute>
        }
      />
      <Route
        path="/poll/:id"
        element={
          <ProtectedRoute>
            <PollDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/poll/:id/live"
        element={
          <ProtectedRoute>
            <LivePoll />
          </ProtectedRoute>
        }
      />
      <Route
        path="/poll/:id/results"
        element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}