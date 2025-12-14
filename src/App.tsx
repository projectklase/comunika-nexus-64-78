import React, { Suspense, lazy } from "react";
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
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import { PlatformLayout } from "@/layouts/PlatformLayout";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { MANAGEMENT_ROLES, OPERATIONAL_ROLES } from "./utils/auth-helpers";

// Critical pages - loaded immediately (login, dashboard, main feeds)
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import PendingPayment from "./pages/PendingPayment";
import PaymentSuccess from "./pages/PaymentSuccess";

// Lazy loaded pages - loaded on demand
// Admin pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SecretariasPage = lazy(() => import("./pages/admin/SecretariasPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const FamilyRelationsPage = lazy(() => import("./pages/admin/FamilyRelationsPage"));
const SchoolsManagementPage = lazy(() => import("./pages/admin/SchoolsManagementPage"));
const AdminSubscriptionPage = lazy(() => import("./pages/admin/AdminSubscriptionPage"));

// Secretaria pages
const SecretariaFeed = lazy(() => import("./pages/SecretariaFeed"));
const SecretariaCalendar = lazy(() => import("./pages/SecretariaCalendar"));
const HistoricoPage = lazy(() => import("./pages/HistoricoPage"));
const ClassesPage = lazy(() => import("./pages/ClassesPage"));
const ClassDetailPage = lazy(() => import("./pages/ClassDetailPage"));
const ProgramsPage = lazy(() => import("./pages/ProgramsPage"));
const LevelsPage = lazy(() => import("./pages/LevelsPage"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));
const ModalitiesPage = lazy(() => import("./pages/ModalitiesPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const TeachersPage = lazy(() => import("./pages/TeachersPage"));
const CatalogoPage = lazy(() => import("./pages/CatalogoPage"));
const PasswordResetsPage = lazy(() => import("./pages/Secretaria/PasswordResets/index"));
const RewardsManagement = lazy(() => import("./pages/Secretaria/RewardsManagement"));
const ChallengesManagement = lazy(() => import("./pages/Secretaria/ChallengesManagement"));
const EventosPage = lazy(() => import("./pages/secretaria/EventosPage"));

// Professor pages
const ProfessorDashboard = lazy(() => import("./pages/professor/ProfessorDashboard"));
const ProfessorClasses = lazy(() => import("./pages/professor/ProfessorClasses"));
const ProfessorClassDetail = lazy(() => import("./pages/professor/ProfessorClassDetail"));
const ProfessorActivities = lazy(() => import("./pages/professor/ProfessorActivities"));
const ProfessorFeed = lazy(() => import("./pages/professor/ProfessorFeed"));
const ActivityDetail = lazy(() => import("./pages/professor/ActivityDetail"));
const NovaAtividade = lazy(() => import("./pages/professor/NovaAtividade"));
const ProfessorCalendar = lazy(() => import("./pages/ProfessorCalendar"));
const ClassCalendarPage = lazy(() => import("./pages/ClassCalendarPage").then(m => ({ default: m.ClassCalendarPage })));

// Aluno pages
const AlunoFeed = lazy(() => import("./pages/AlunoFeed"));
const AlunoHome = lazy(() => import("./pages/AlunoHome"));
const AlunoProfile = lazy(() => import("@/pages/aluno/AlunoProfile"));
const AlunoActivityResult = lazy(() => import("./pages/aluno/AlunoActivityResult"));
const AlunoNexus = lazy(() => import("./pages/AlunoNexus"));
const AlunoCalendario = lazy(() => import("./pages/AlunoCalendario"));
const MinhasAtividadesPage = lazy(() => import("./pages/aluno/MinhasAtividadesPage").then(m => ({ default: m.MinhasAtividadesPage })));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const RewardsStore = lazy(() => import("./pages/RewardsStore"));

// Heavy card game pages - always lazy
const CartasPage = lazy(() => import('./pages/aluno/CartasPage'));
const BatalhaPage = lazy(() => import('./pages/aluno/BatalhaPage'));

// Settings & misc
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AlterarSenha = lazy(() => import("./pages/Auth/AlterarSenha"));
const PostFallback = lazy(() => import("./pages/PostFallback").then(m => ({ default: m.PostFallback })));

// Platform pages (superadmin - rarely used)
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const PlatformSchools = lazy(() => import("./pages/platform/PlatformSchools"));
const PlatformSubscriptions = lazy(() => import("./pages/platform/PlatformSubscriptions"));
const PlatformAdmins = lazy(() => import("./pages/platform/PlatformAdmins"));
const PlatformSupport = lazy(() => import("./pages/platform/PlatformSupport"));
const PlatformAnalytics = lazy(() => import("./pages/platform/PlatformAnalytics"));
const PlatformCardEvents = lazy(() => import("./pages/platform/PlatformCardEvents"));
const PlatformAnnouncements = lazy(() => import("./pages/platform/PlatformAnnouncements"));

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
            <Suspense fallback={<PageLoadingSkeleton />}>
            <Routes>
          <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pending-payment" element={<PendingPayment />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
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
            
            {/* Admin - Assinatura */}
            <Route path="/admin/assinatura" element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <AdminSubscriptionPage />
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
            
            {/* Platform Super Admin Routes */}
            <Route path="/platform" element={
              <SuperAdminGuard>
                <PlatformLayout />
              </SuperAdminGuard>
            }>
              <Route index element={<PlatformDashboard />} />
              <Route path="schools" element={<PlatformSchools />} />
              <Route path="subscriptions" element={<PlatformSubscriptions />} />
              <Route path="admins" element={<PlatformAdmins />} />
              <Route path="announcements" element={<PlatformAnnouncements />} />
              <Route path="events" element={<PlatformCardEvents />} />
              <Route path="support" element={<PlatformSupport />} />
              <Route path="analytics" element={<PlatformAnalytics />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
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
