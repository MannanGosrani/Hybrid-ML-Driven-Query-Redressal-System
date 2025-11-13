import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DirectionProvider } from "@radix-ui/react-direction";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import WelcomePage from "./pages/WelcomePage";
import StudentSignIn from "./pages/auth/StudentSignIn";
import StudentSignUp from "./pages/auth/StudentSignUp";
import TeacherSignIn from "./pages/auth/TeacherSignIn";
import TeacherSignUp from "./pages/auth/TeacherSignUp";
import AdminSignIn from "./pages/auth/AdminSignIn";
import StudentDashboard from "./pages/student/StudentDashboard";
import CreateTicket from "./pages/student/CreateTicket";
import TicketDetail from "./pages/student/TicketDetail";
import AdminOverview from "./pages/admin/AdminOverview";
import AllTickets from "./pages/admin/AllTickets";
import Departments from "./pages/admin/Departments";
import Users from "./pages/admin/Users";
import Settings from "./pages/admin/Settings";
import DeptInbox from "./pages/dept/DeptInbox";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <DirectionProvider dir="ltr">
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/welcome" element={<WelcomePage />} />
            
            {/* Auth Routes */}
            <Route path="/auth/student/sign-in" element={<StudentSignIn />} />
            <Route path="/auth/student/sign-up" element={<StudentSignUp />} />
            <Route path="/auth/teacher/sign-in" element={<TeacherSignIn />} />
            <Route path="/auth/teacher/sign-up" element={<TeacherSignUp />} />
            <Route path="/auth/admin/sign-in" element={<AdminSignIn />} />
            
            {/* Student/Teacher Routes */}
            <Route 
              path="/dashboard/student" 
              element={
                <ProtectedRoute allowedRoles={['student', 'teacher']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tickets/new" 
              element={
                <ProtectedRoute allowedRoles={['student', 'teacher']}>
                  <CreateTicket />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tickets/:id" 
              element={
                <ProtectedRoute allowedRoles={['student', 'teacher', 'dept_admin', 'main_admin']}>
                  <TicketDetail />
                </ProtectedRoute>
              } 
            />
            
            {/* Department Admin Routes */}
            <Route 
              path="/dept/inbox" 
              element={
                <ProtectedRoute allowedRoles={['dept_admin']}>
                  <DeptInbox />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/overview" 
              element={
                <ProtectedRoute allowedRoles={['main_admin']}>
                  <AdminOverview />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/tickets" 
              element={
                <ProtectedRoute allowedRoles={['main_admin']}>
                  <AllTickets />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/departments" 
              element={
                <ProtectedRoute allowedRoles={['main_admin']}>
                  <Departments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute allowedRoles={['main_admin']}>
                  <Users />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute allowedRoles={['main_admin']}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </DirectionProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
