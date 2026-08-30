import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import AdminRoute from "./components/AdminRoute";

// Lazy load route pages for performance and fast initial load
const Index = lazy(() => import("./pages/Index.tsx"));
const LeafDiagnosis = lazy(() => import("./pages/LeafDiagnosis.tsx"));
const AgroAssist = lazy(() => import("./pages/AgroAssist.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const WeatherForecast = lazy(() => import("./pages/WeatherForecast.tsx"));
const AdminSubscribers = lazy(() => import("./pages/AdminSubscribers.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const AdminSettings = lazy(() => import("./pages/AdminSettings.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-headline">Loading AgroVision...</p>
    </div>
  </div>
);

import ErrorBoundary from "./components/ErrorBoundary";

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/leaf-diagnosis" element={<LeafDiagnosis />} />
                <Route path="/agro-assist" element={<AgroAssist />} />
                <Route path="/weather-forecast" element={<WeatherForecast />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
                <Route path="/admin/subscribers" element={<AdminRoute><AdminSubscribers /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
