import { createRootRoute, createRoute, createRouter, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import React, { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { useKeepAlive } from './hooks/useKeepAlive';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import Results from './pages/Results';
import Timetable from './pages/Timetable';
import Substitute from './pages/Substitute';
import SubstituteManagement from './pages/admin/SubstituteManagement';
import Students from './pages/admin/Students';
import Promotion from './pages/Promotion';
import Register from './pages/Register';
import PendingTeachers from './pages/admin/PendingTeachers';
import AllTeachers from './pages/admin/AllTeachers';
import ClassManagement from './pages/admin/ClassManagement';
import ClassSubjectMapping from './pages/admin/ClassSubjectMapping';
import Profile from './pages/teacher/Profile';
import ResultsEntry from './pages/teacher/ResultsEntry'; // Teacher's result entry page

// Root Route
const Root = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Basic route protection
    const publicPaths = ['/login', '/register'];
    if (!isAuthenticated && !publicPaths.includes(location.pathname)) {
      navigate({ to: '/login' });
    } else if (isAuthenticated && publicPaths.includes(location.pathname)) {
      navigate({ to: '/dashboard' });
    } else if (isAuthenticated && location.pathname === '/') {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return <Outlet />;
};

const rootRoute = createRootRoute({
  component: Root,
});

// Public login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

// Public register route
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: Register,
});

// Dashboard Layout wrapper
const DashboardLayout = () => {
  useKeepAlive(); // ping backend every 14 min to keep it awake while the app is open

  return (
    <div className="flex h-screen bg-[#F6F8FC] dark:bg-[#080B12] text-[#0F172A] dark:text-[#F8FAFC] overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const dashboardLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'dashboard-layout',
  component: DashboardLayout,
});

// Redirect from '/' to '/dashboard'
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null,
});

// Dashboard pages
const dashboardHomeRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/dashboard',
  component: DashboardHome,
});

// ADMIN: Results Review (uses the existing Results component - rename later if needed)
const resultsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/admin/results',
  component: Results, // This should be the Admin Results Review page
});

// TEACHER: Results Entry
const resultsEntryRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/teacher/results-entry',
  component: ResultsEntry, // Teacher's result entry page
});

const timetableRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/timetable',
  component: Timetable,
});

const substituteRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/substitute',
  component: Substitute,
});

const substituteManagementRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/admin/substitute',
  component: SubstituteManagement,
});

// Teacher-only substitute route
const teacherSubstituteRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/teacher/substitute',
  component: Substitute,
});

const studentsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/admin/students',
  component: Students,
});

const promotionRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/promotion',
  component: Promotion,
});

const pendingTeachersRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/admin/teachers/pending',
  component: PendingTeachers,
});

const allTeachersRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/admin/teachers',
  component: AllTeachers,
});

const classManagementRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/admin/class-management',
  component: ClassManagement,
});

const teacherProfileRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/teacher/profile',
  component: Profile,
});

const classSubjectMappingRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/admin/class-subject-mapping',
  component: ClassSubjectMapping,
});

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardLayoutRoute.addChildren([
    dashboardHomeRoute,
    resultsRoute,              // Admin: /admin/results
    resultsEntryRoute,         // Teacher: /teacher/results-entry
    timetableRoute,
    substituteRoute,
    substituteManagementRoute,
    teacherSubstituteRoute,
    studentsRoute,
    promotionRoute,
    pendingTeachersRoute,
    allTeachersRoute,
    classManagementRoute,
    teacherProfileRoute,
    classSubjectMappingRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}