import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import type { ReactNode } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { PreferencesProvider, usePreferences } from './contexts/PreferencesContext'
import { ProtectedRoute, GuestRoute, AdminRoute, ManagerRoute } from './components/ProtectedRoute'
import { DashboardShell } from './components/layout/DashboardLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import DeskPage from './pages/DeskPage'
import DebriefPage from './pages/DebriefPage'
import SettingsPage from './pages/SettingsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ManagerDashboardPage from './pages/ManagerDashboardPage'
import ManagerTasksPage from './pages/ManagerTasksPage'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

function ThemedToaster() {
  const { resolvedTheme } = usePreferences()
  return (
    <Toaster
      theme={resolvedTheme}
      position="top-right"
      richColors
      style={{ zIndex: 99999 }}
    />
  )
}

function AppProviders() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <NotificationProvider>
          <Outlet />
          <ThemedToaster />
        </NotificationProvider>
      </PreferencesProvider>
    </AuthProvider>
  )
}

function DashboardPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  )
}

const router = createBrowserRouter([
  {
    element: <AppProviders />,
    children: [
      { path: '/login', element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: '/register', element: <GuestRoute><RegisterPage /></GuestRoute> },
      { path: '/forgot-password', element: <GuestRoute><ForgotPasswordPage /></GuestRoute> },
      { path: '/reset-password', element: <GuestRoute><ResetPasswordPage /></GuestRoute> },
      { path: '/', element: <DashboardPage><HomePage /></DashboardPage> },
      { path: '/settings', element: <DashboardPage><SettingsPage /></DashboardPage> },
      { path: '/debrief/:sessionId', element: <DashboardPage><DebriefPage /></DashboardPage> },
      {
        path: '/manager',
        element: (
          <DashboardPage>
            <ManagerRoute><ManagerDashboardPage /></ManagerRoute>
          </DashboardPage>
        ),
      },
      {
        path: '/manager/tasks',
        element: (
          <DashboardPage>
            <ManagerRoute><ManagerTasksPage /></ManagerRoute>
          </DashboardPage>
        ),
      },
      {
        path: '/admin',
        element: (
          <DashboardPage>
            <AdminRoute><AdminDashboardPage /></AdminRoute>
          </DashboardPage>
        ),
      },
      { path: '/desk', element: <ProtectedRoute><DeskPage /></ProtectedRoute> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  const content = <RouterProvider router={router} />

  if (GOOGLE_CLIENT_ID) {
    return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
  }
  return content
}
