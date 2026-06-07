import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import LeafDiagnosis from "./pages/LeafDiagnosis.tsx";
import AgroAssist from "./pages/AgroAssist.tsx";
import Auth from "./pages/Auth.tsx";
import WeatherForecast from "./pages/WeatherForecast.tsx";
import AdminSubscribers from "./pages/AdminSubscribers.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminSettings from "./pages/AdminSettings.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminRoute from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
