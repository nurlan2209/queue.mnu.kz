// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Components
import Header from './components/Header/Header';

// Pages
import Login from './pages/Login/Login';
import StaffLogin from './pages/StaffLogin/StaffLogin';
import PublicQueueForm from './pages/PublicQueueForm/PublicQueueForm';
import AdmissionDashboard from './pages/AdmissionDashboard/AdmissionDashboard';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import QueueDisplay from './pages/QueueDisplay/QueueDisplay';
import DeskManager from './components/DeskManager/DeskManager';

// Styles
import './App.css';

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/staff" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admission') {
      return <Navigate to="/admission" />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin" />;
    }
  }
  
  return children;
};

function App() {
  const { isAuthenticated, user } = useAuth();
  
  // Проверяем текущий URL, чтобы определить, показывать ли Header
  const isDisplayPage = window.location.pathname === '/display';
  
  return (
    <div className="app">
      {/* Не показываем Header на странице /display */}
      {!isDisplayPage && <Header />}
      
      <main className={isDisplayPage ? "content-no-header" : "content"}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicQueueForm />} />
          
          <Route path="/staff" element={
            isAuthenticated ? 
              <Navigate to={
                user.role === 'admission' ? '/admission' : '/admin'
              } /> : 
              <StaffLogin />
          } />
          
          <Route path="/login" element={<Navigate to="/staff" />} />
          
          {/* Protected routes */}
          <Route path="/admission" element={
            <ProtectedRoute allowedRoles={['admission']}>
              <AdmissionDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/display" element={<QueueDisplay />} />
          <Route path="/admin/desks" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DeskManager />
            </ProtectedRoute>
          } />
          
          {/* Редирект со старого пути на новый */}
          <Route path="/queue" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;