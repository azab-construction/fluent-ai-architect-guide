import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Integrations from "./pages/Integrations";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import WhatsApp from "./pages/WhatsApp";
import Azure from "./pages/Azure";
import AzureSettings from "./pages/AzureSettings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import VisionOCR from "./pages/services/VisionOCR";
import DocumentIntelligence from "./pages/services/DocumentIntelligence";
import AIProcessing from "./pages/services/AIProcessing";
import MaintenanceSearch from "./pages/services/MaintenanceSearch";
import QAAgent from "./pages/services/QAAgent";
import ArchERP from "./pages/services/ArchERP";
import EngineeringTools from "./pages/EngineeringTools";
import ProductivityTools from "./pages/ProductivityTools";
import ArchitectureAnalysis from "./pages/ArchitectureAnalysis";
import FinanceAnalysis from "./pages/FinanceAnalysis";
import ContractsGenerator from "./pages/tools/ContractsGenerator";
import SmartReports from "./pages/tools/SmartReports";
import TaskBoard from "./pages/tools/TaskBoard";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
          <Route path="/azure" element={<ProtectedRoute><Azure /></ProtectedRoute>} />
          <Route path="/azure/settings" element={<ProtectedRoute><AzureSettings /></ProtectedRoute>} />
          <Route path="/services/vision" element={<ProtectedRoute><VisionOCR /></ProtectedRoute>} />
          <Route path="/services/docint" element={<ProtectedRoute><DocumentIntelligence /></ProtectedRoute>} />
          <Route path="/services/ai-processing" element={<ProtectedRoute><AIProcessing /></ProtectedRoute>} />
          <Route path="/services/search" element={<ProtectedRoute><MaintenanceSearch /></ProtectedRoute>} />
          <Route path="/services/agent" element={<ProtectedRoute><QAAgent /></ProtectedRoute>} />
          <Route path="/services/arch-erp" element={<ProtectedRoute><ArchERP /></ProtectedRoute>} />
          <Route path="/engineering" element={<ProtectedRoute><EngineeringTools /></ProtectedRoute>} />
          <Route path="/productivity" element={<ProtectedRoute><ProductivityTools /></ProtectedRoute>} />
          <Route path="/architecture" element={<ProtectedRoute><ArchitectureAnalysis /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><FinanceAnalysis /></ProtectedRoute>} />
          <Route path="/tools/contracts" element={<ProtectedRoute><ContractsGenerator /></ProtectedRoute>} />
          <Route path="/tools/reports" element={<ProtectedRoute><SmartReports /></ProtectedRoute>} />
          <Route path="/tools/tasks" element={<ProtectedRoute><TaskBoard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
