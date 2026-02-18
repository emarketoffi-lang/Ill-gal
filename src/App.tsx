import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Operations from "./pages/Operations";
import PropositionMissions from "./pages/PropositionMissions";
import Reunions from "./pages/Reunions";
import Rapports from "./pages/Rapports";
import Entretiens from "./pages/Entretiens";
import Echanges from "./pages/Echanges";
import Discussion from "./pages/Discussion";
import Dissolutions from "./pages/Dissolutions";
import Administration from "./pages/Administration";
import QGPage from "./pages/QG";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
              <Route path="/qg" element={<QGPage />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/proposition-missions" element={<PropositionMissions />} />
              <Route path="/reunions" element={<Reunions />} />
              <Route path="/rapports" element={<Rapports />} />
              <Route path="/entretiens" element={<Entretiens />} />
              <Route path="/echanges" element={<Echanges />} />
              <Route path="/discussion" element={<Discussion />} />
              <Route path="/dissolutions" element={<Dissolutions />} />
              <Route path="/administration" element={<Administration />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
