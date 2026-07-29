import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "./components/ProtectedRoute";
import RequirePermission from "./components/RequirePermission";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Overview";
import AddEntry from "./pages/AddEntry";
import CaseDetail from "./pages/CaseDetail";
import CaseLog from "./pages/CaseLog";
import BenchFlow from "./pages/BenchFlow";
import Microscopy from "./pages/Microscopy";
import SignOutPage from "./pages/SignOut";
import QueryPage from "./pages/Query";
import RequestPage from "./pages/Request";
import SettingsPage from "./pages/Settings";
import ReportPage from "./pages/Report";
import QualityControlPage from "./pages/QualityControl";
import ReportDetail from "./pages/ReportDetail";
import Maintenance from "./pages/Maintenance";
import MaintenanceDetail from "./pages/MaintenanceDetail";
import ReagentPage from "./pages/Reagent";
import ImmunoReagentPage from "./pages/ImmunoReagent";
import ImmunoManual from "./pages/ImmunoManual";
import LabSupplyPage from "./pages/LabSupply";
import ExamPage from "./pages/Exam";
import StainData from "./pages/StainData";
import DelayedCases from "./pages/DelayedCases";
import FlaggedCases from "./pages/FlaggedCases";
import Roster from "./pages/Roster";
import MiscPage from "./pages/Misc";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import HistoSlideMovement from "./pages/HistoSlideMovement";
import AttendancePage from "./pages/Attendance";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Exam and attendance links support public candidate/attendee access — no login needed. */}
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/exam/link" element={<ExamPage />} />
          {/* Public attendance links: registration and personal marking — no Histobox account required. */}
          <Route path="/attendance/register/:id" element={<AttendancePage />} />
          <Route path="/attendance/mark/:accessLink" element={<AttendancePage />} />
          <Route path="/attendance/link" element={<AttendancePage />} />

          <Route path="/" element={<P><RequirePermission permission="view_overview"><Dashboard /></RequirePermission></P>} />
          <Route path="/cases" element={<P><RequirePermission permission="view_overview"><Cases /></RequirePermission></P>} />
          <Route path="/add-entry" element={<P><AddEntry /></P>} />
          <Route path="/case/:id" element={<P><CaseDetail /></P>} />
          <Route path="/case/:id/log" element={<P><CaseLog /></P>} />
          <Route path="/bench/:step" element={<P><BenchFlow /></P>} />
          <Route path="/microscopy" element={<P><Microscopy /></P>} />
          <Route path="/slide-movement" element={<P><HistoSlideMovement /></P>} />
          <Route path="/signout" element={<P><SignOutPage /></P>} />
          <Route path="/query" element={<P><QueryPage /></P>} />
          <Route path="/request" element={<P><RequestPage /></P>} />
          <Route path="/settings" element={<P><SettingsPage /></P>} />
          <Route path="/quality-control" element={<P><RequirePermission permission="view_qc"><QualityControlPage /></RequirePermission></P>} />
          <Route path="/report" element={<P><ReportPage /></P>} />
          <Route path="/report/:id" element={<P><ReportDetail /></P>} />
          <Route path="/maintenance" element={<P><Maintenance /></P>} />
          <Route path="/maintenance/:id" element={<P><MaintenanceDetail /></P>} />
          <Route path="/reagent" element={<P><ReagentPage /></P>} />
          <Route path="/immuno-reagent" element={<P><ImmunoReagentPage /></P>} />
          <Route path="/immuno-manual" element={<P><ImmunoManual /></P>} />
          <Route path="/lab-supply" element={<P><LabSupplyPage /></P>} />
          <Route path="/stain-data/:category" element={<P><StainData /></P>} />
          <Route path="/delayed-cases" element={<P><DelayedCases /></P>} />
          <Route path="/flagged-cases" element={<P><FlaggedCases /></P>} />
          <Route path="/attendance" element={<P><RequirePermission permission="view_attendance"><AttendancePage /></RequirePermission></P>} />
          <Route path="/roster" element={<P><Roster /></P>} />
          <Route path="/misc" element={<P><RequirePermission permission="view_overview"><MiscPage /></RequirePermission></P>} />
          <Route path="/profile" element={<P><Profile /></P>} />
          <Route path="/access-control" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
