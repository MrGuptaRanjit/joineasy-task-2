import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import ProfessorDashboard from './pages/ProfessorDashboard';
import CourseDetails from './pages/CourseDetails';
import CoursesList from './pages/CoursesList';
import AssignmentDetails from './pages/AssignmentDetails';
import AssignmentsList from './pages/AssignmentsList';
import SubmissionsMonitor from './pages/SubmissionsMonitor';

function HomeRedirect() {
  const { isAuthenticated, isProfessor, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Navigate to={isProfessor ? '/professor/dashboard' : '/student/dashboard'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Root redirect */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Authenticated Application Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Student Views */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Professor Views */}
        <Route
          path="/professor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['PROFESSOR']}>
              <ProfessorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assignments/:id/monitor"
          element={
            <ProtectedRoute allowedRoles={['PROFESSOR']}>
              <SubmissionsMonitor />
            </ProtectedRoute>
          }
        />

        {/* Shared Academic Views */}
        <Route path="/courses" element={<CoursesList />} />
        <Route path="/courses/:id" element={<CourseDetails />} />
        <Route path="/assignments" element={<AssignmentsList />} />
        <Route path="/assignments/:id" element={<AssignmentDetails />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
