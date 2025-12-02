import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TeacherGuard } from "@/components/TeacherGuard";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/Layout/AppLayout";
import { CalendarProviders } from "@/providers/CalendarProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConditionalNotificationProvider } from "@/components/ConditionalNotificationProvider";
import { ModalManagerProvider } from "@/components/ui/app-dialog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SecretariaFeed from "./pages/SecretariaFeed";
import AlunoProfile from "@/pages/aluno/AlunoProfile";
import HistoricoPage from "./pages/HistoricoPage";
import ClassesPage from "./pages/ClassesPage";
import ClassDetailPage from "./pages/ClassDetailPage";
import ProgramsPage from "./pages/ProgramsPage";
import LevelsPage from "./pages/LevelsPage";
import SubjectsPage from "./pages/SubjectsPage";
import ModalitiesPage from "./pages/ModalitiesPage";
import StudentsPage from "./pages/StudentsPage";
import CartasPage from './pages/aluno/CartasPage';
import BatalhaPage from './pages/aluno/BatalhaPage';
// Removed ClassTemplatesPage import
import CatalogoPage from "./pages/CatalogoPage";
import { MANAGEMENT_ROLES, OPERATIONAL_ROLES } from "./utils/auth-helpers";
import TeachersPage from "./pages/TeachersPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import ProfessorClasses from "./pages/professor/ProfessorClasses";
import ProfessorClassDetail from "./pages/professor/ProfessorClassDetail";
import ProfessorActivities from "./pages/professor/ProfessorActivities";
import ProfessorFeed from "./pages/professor/ProfessorFeed";
import ActivityDetail from "./pages/professor/ActivityDetail";
import NovaAtividade from "./pages/professor/NovaAtividade";
import { ClassCalendarPage } from "./pages/ClassCalendarPage";
import AlunoFeed from "./pages/AlunoFeed";
import AlunoHome from "./pages/AlunoHome";
import AlunoActivityResult from "./pages/aluno/AlunoActivityResult";
import AlunoNexus from "./pages/AlunoNexus";
import AlunoCalendario from "./pages/AlunoCalendario";
import { MinhasAtividadesPage } from "./pages/aluno/MinhasAtividadesPage";
import StudentDashboard from "./pages/StudentDashboard";
import ProfessorCalendar from "./pages/ProfessorCalendar";
import SecretariaCalendar from "./pages/SecretariaCalendar";
import AlterarSenha from "./pages/Auth/AlterarSenha";
import PasswordResetsPage from "./pages/Secretaria/PasswordResets/index";
import { PostFallback } from "./pages/PostFallback";
import RewardsStore from "./pages/RewardsStore";
import RewardsManagement from "./pages/Secretaria/RewardsManagement";
import ChallengesManagement from "./pages/Secretaria/ChallengesManagement";
import SecretariasPage from "./pages/admin/SecretariasPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import EventosPage from "./pages/secretaria/EventosPage";
import FamilyRelationsPage from "./pages/admin/FamilyRelationsPage";
import SchoolsManagementPage from "./pages/admin/SchoolsManagementPage";
import CardImageUploadPage from "./pages/admin/CardImageUploadPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SchoolProvider>
          <ConditionalNotificationProvider>
            <ModalManagerProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Admin Dashboard - exclusive route for administrador role */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Admin - Gerenciar Secretarias */}
            <Route path="/admin/gerenciar-secretarias" element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <SecretariasPage />
              </ProtectedRoute>
            } />
            
            {/* Admin - Centro de Inteligência (Analytics) */}
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <AppLayout>
                  <AdminAnalyticsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Admin - Relações Familiares */}
            <Route path="/admin/relacoes-familiares" element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <AppLayout>
                  <FamilyRelationsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Admin - Gerenciar Escolas */}
            <Route path="/admin/gerenciar-escolas" element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <AppLayout>
                  <SchoolsManagementPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Admin - Upload de Imagens de Cartas */}
            <Route path="/admin/card-images" element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <CardImageUploadPage />
              </ProtectedRoute>
            } />
            
            {/* Professor Dashboard - separate route */}
            <Route path="/professor/dashboard" element={
              <ProtectedRoute allowedRoles={['professor']}>
                <AppLayout>
                  <ProfessorDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* Placeholder routes for other pages */}
            <Route path="/secretaria/feed" element={
              <RoleGuard allowedRoles={['secretaria']}>
                <AppLayout>
                  <SecretariaFeed />
                </AppLayout>
              </RoleGuard>
            } />
            {/* Calendar routes for different roles */}
            <Route path="/calendario" element={
              <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                <AppLayout>
                  <CalendarProviders>
                    <SecretariaCalendar />
                  </CalendarProviders>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/secretaria/calendario" element={
              <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                <AppLayout>
                  <CalendarProviders>
                    <SecretariaCalendar />
                  </CalendarProviders>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/professor/calendario" element={
              <ProtectedRoute allowedRoles={['professor']}>
                <AppLayout>
                  <CalendarProviders>
                    <ProfessorCalendar />
                  </CalendarProviders>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/aluno/nexus" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <AlunoNexus />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/aluno/perfil" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <AlunoProfile />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/aluno/calendario" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <CalendarProviders>
                    <AlunoCalendario />
                  </CalendarProviders>
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/aluno/cartas" element={
              <RoleGuard allowedRoles={['aluno']}>
                <CartasPage />
              </RoleGuard>
            } />
            <Route path="/aluno/batalha" element={
              <RoleGuard allowedRoles={['aluno']}>
                <BatalhaPage />
              </RoleGuard>
            } />
            {/* Legacy calendar redirects */}
            <Route path="/aluno/calendar" element={<Navigate to="/aluno/calendario" replace />} />
            <Route path="/aluno/cal" element={<Navigate to="/aluno/calendario" replace />} />
            <Route path="/novo-post" element={
              <ProtectedRoute>
                <AppLayout>
                  <div className="text-center p-8">
                    <h1 className="text-2xl font-bold gradient-text">Novo Post</h1>
                    <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
                  </div>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/secretaria/turmas" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <ClassesPage />
              </RoleGuard>
            } />
            <Route path="/secretaria/turmas/:id" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <ClassDetailPage />
              </RoleGuard>
            } />
            <Route path="/secretaria/cadastros/programas" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <ProgramsPage />
              </RoleGuard>
            } />
            <Route path="/secretaria/cadastros/niveis" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <LevelsPage />
              </RoleGuard>
            } />
            <Route path="/secretaria/cadastros/materias" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <SubjectsPage />
              </RoleGuard>
            } />
            <Route path="/secretaria/cadastros/modalidades" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <ModalitiesPage />
              </RoleGuard>
            } />
            <Route path="/secretaria/cadastros/catalogo" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <AppLayout>
                  <CatalogoPage />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/secretaria/cadastros/alunos" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <StudentsPage />
              </RoleGuard>
            } />
            <Route path="/secretaria/cadastros/professores" element={
              <RoleGuard allowedRoles={MANAGEMENT_ROLES}>
                <TeachersPage />
              </RoleGuard>
            } />
            {/* Redirect old class templates route to programs */}
            <Route path="/secretaria/modelos-turma" element={
              <Navigate to="/secretaria/cadastros/programas" replace />
            } />
            <Route path="/secretaria/historico" element={
              <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                <AppLayout>
                  <HistoricoPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/metricas" element={
              <ProtectedRoute>
                <AppLayout>
                  <div className="text-center p-8">
                    <h1 className="text-2xl font-bold gradient-text">Métricas</h1>
                    <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
                  </div>
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* Professor routes */}
            <Route path="/professor/feed" element={
              <TeacherGuard>
                <AppLayout>
                  <ProfessorFeed />
                </AppLayout>
              </TeacherGuard>
            } />
            <Route path="/professor/turmas" element={
              <TeacherGuard>
                <AppLayout>
                  <ProfessorClasses />
                </AppLayout>
              </TeacherGuard>
            } />
            <Route path="/professor/turma/:id" element={
              <TeacherGuard>
                <AppLayout>
                  <ProfessorClassDetail />
                </AppLayout>
              </TeacherGuard>
            } />
            <Route path="/professor/nova-atividade" element={<Navigate to="/professor/atividades/nova" replace />} />
            <Route path="/professor/atividades" element={
              <TeacherGuard>
                <AppLayout>
                  <ProfessorActivities />
                </AppLayout>
              </TeacherGuard>
            } />
            <Route path="/professor/atividades/nova" element={
              <TeacherGuard>
                <AppLayout>
                  <NovaAtividade />
                </AppLayout>
              </TeacherGuard>
            } />
            <Route path="/professor/turma/:classId/atividade/:postId" element={
              <TeacherGuard>
                <AppLayout>
                  <ActivityDetail />
                </AppLayout>
              </TeacherGuard>
            } />
            <Route path="/professor/turma/:classId/calendario" element={
              <TeacherGuard>
                <AppLayout>
                  <CalendarProviders>
                    <ClassCalendarPage />
                  </CalendarProviders>
                </AppLayout>
              </TeacherGuard>
            } />
            <Route path="/aluno/turma/:classId/calendario" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <CalendarProviders>
                    <ClassCalendarPage />
                  </CalendarProviders>
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/secretaria/turma/:classId/calendario" element={
              <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                <AppLayout>
                  <CalendarProviders>
                    <ClassCalendarPage />
                  </CalendarProviders>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/aluno/feed" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <AlunoFeed />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/aluno/dashboard" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <StudentDashboard />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/aluno" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <AlunoHome />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/aluno/loja-recompensas" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <RewardsStore />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/aluno/atividade/:postId/resultado" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <AlunoActivityResult />
                </AppLayout>
              </RoleGuard>
            } />
            <Route path="/minhas-atividades" element={
              <RoleGuard allowedRoles={['aluno']}>
                <AppLayout>
                  <MinhasAtividadesPage />
                </AppLayout>
              </RoleGuard>
            } />
            {/* Legacy routes for backward compatibility */}
            <Route path="/minhas-turmas" element={
              <ProtectedRoute>
                <AppLayout>
                  <ProfessorClasses />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/nova-atividade" element={<Navigate to="/professor/atividades/nova" replace />} />
            <Route path="/atividades" element={
              <ProtectedRoute>
                <AppLayout>
                  <div className="text-center p-8">
                    <h1 className="text-2xl font-bold gradient-text">Minhas Atividades</h1>
                    <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
                  </div>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/alterar-senha" element={
              <ProtectedRoute>
                <AlterarSenha />
              </ProtectedRoute>
            } />
            <Route path="/secretaria/seguranca/resets" element={
              <ProtectedRoute allowedRoles={['secretaria']}>
                <AppLayout>
                  <PasswordResetsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/secretaria/gerenciar-recompensas" element={
              <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                <AppLayout>
                  <RewardsManagement />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/secretaria/gerenciar-desafios" element={
              <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                <AppLayout>
                  <ChallengesManagement />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/secretaria/eventos" element={
              <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                <AppLayout>
                  <EventosPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* Fallback route for legacy post links */}
            <Route path="/post/:id" element={
              <ProtectedRoute>
                <PostFallback />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
            </ModalManagerProvider>
          </ConditionalNotificationProvider>
        </SchoolProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
