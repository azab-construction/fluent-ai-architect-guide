import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Index from "./pages/Index";
import Integrations from "./pages/Integrations";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import WhatsApp from "./pages/WhatsApp";
import Azure from "./pages/Azure";
import AzureSettings from "./pages/AzureSettings";
import AzureContextPage from "./pages/azure/AzureContextPage";
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
import FinanceModule from "./pages/finance/FinanceModule";
import ContractsGenerator from "./pages/tools/ContractsGenerator";
import SmartReports from "./pages/tools/SmartReports";
import TaskBoard from "./pages/tools/TaskBoard";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();
const UserOnly = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>;
const AdminOnly = ({ children }: { children: React.ReactNode }) => <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<UserOnly><Index /></UserOnly>} />
              <Route path="/integrations" element={<AdminOnly><Integrations /></AdminOnly>} />
              <Route path="/analytics" element={<AdminOnly><Analytics /></AdminOnly>} />
              <Route path="/settings" element={<AdminOnly><Settings /></AdminOnly>} />
              <Route path="/whatsapp" element={<AdminOnly><WhatsApp /></AdminOnly>} />
              <Route path="/azure" element={<AdminOnly><Azure /></AdminOnly>} />
              <Route path="/azure/settings" element={<AdminOnly><AzureSettings /></AdminOnly>} />
              <Route path="/azure/vision" element={<AdminOnly><AzureContextPage contextId="vision" /></AdminOnly>} />
              <Route path="/azure/finance" element={<AdminOnly><AzureContextPage contextId="finance" /></AdminOnly>} />
              <Route path="/azure/agents/maintenance" element={<AdminOnly><AzureContextPage contextId="maintenance-agent" /></AdminOnly>} />
              <Route path="/azure/agents/production" element={<AdminOnly><AzureContextPage contextId="production-agent" /></AdminOnly>} />
              <Route path="/azure/speech" element={<AdminOnly><AzureContextPage contextId="speech-voice" /></AdminOnly>} />
              <Route path="/services/vision" element={<UserOnly><VisionOCR /></UserOnly>} />
              <Route path="/services/docint" element={<UserOnly><DocumentIntelligence /></UserOnly>} />
              <Route path="/services/ai-processing" element={<UserOnly><AIProcessing /></UserOnly>} />
              <Route path="/services/search" element={<UserOnly><MaintenanceSearch /></UserOnly>} />
              <Route path="/services/agent" element={<UserOnly><QAAgent /></UserOnly>} />
              <Route path="/services/arch-erp" element={<AdminOnly><ArchERP /></AdminOnly>} />
              <Route path="/engineering" element={<UserOnly><EngineeringTools /></UserOnly>} />
              <Route path="/productivity" element={<UserOnly><ProductivityTools /></UserOnly>} />
              <Route path="/architecture" element={<AdminOnly><ArchitectureAnalysis /></AdminOnly>} />
              <Route path="/finance" element={<AdminOnly><FinanceAnalysis /></AdminOnly>} />
              <Route path="/finance/module" element={<AdminOnly><FinanceModule /></AdminOnly>} />
              <Route path="/tools/contracts" element={<AdminOnly><ContractsGenerator /></AdminOnly>} />
              <Route path="/tools/reports" element={<AdminOnly><SmartReports /></AdminOnly>} />
              <Route path="/tools/tasks" element={<UserOnly><TaskBoard /></UserOnly>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
