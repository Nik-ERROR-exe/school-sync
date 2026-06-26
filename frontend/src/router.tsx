import { createRootRoute, createRoute, createRouter, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import React, { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import Results from './pages/Results';
import Timetable from './pages/Timetable';
import Substitute from './pages/Substitute';
import Promotion from './pages/Promotion';
import Settings from './pages/Settings';
import Register from './pages/Register';
import PendingTeachers from './pages/admin/PendingTeachers';
import AllTeachers from './pages/admin/AllTeachers';
import Profile from './pages/teacher/Profile';

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
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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

const resultsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/results',
  component: Results,
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

const promotionRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/promotion',
  component: Promotion,
});

const settingsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/settings',
  component: Settings,
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

const teacherProfileRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/teacher/profile',
  component: Profile,
});

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardLayoutRoute.addChildren([
    dashboardHomeRoute,
    resultsRoute,
    timetableRoute,
    substituteRoute,
    promotionRoute,
    settingsRoute,
    pendingTeachersRoute,
    allTeachersRoute,
    teacherProfileRoute,
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
