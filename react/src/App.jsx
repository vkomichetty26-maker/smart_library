import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import LibrarianDashboard from './pages/LibrarianDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { getSession } from './utils/auth';

function DashboardRedirect() {
  const session = getSession();
  if (!session) return <Navigate to="/login" />;
  return <Navigate to={`/dashboard/${session.role}`} />;
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />

          <Route path="/dashboard/admin" element={
            <PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>
          } />
          <Route path="/dashboard/librarian" element={
            <PrivateRoute role="librarian"><LibrarianDashboard /></PrivateRoute>
          } />
          <Route path="/dashboard/faculty" element={
            <PrivateRoute role="faculty"><FacultyDashboard /></PrivateRoute>
          } />
          <Route path="/dashboard/student" element={
            <PrivateRoute role="student"><StudentDashboard /></PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
