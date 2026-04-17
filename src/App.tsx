import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster } from './components/ui/sonner';
import { AppPermission } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import ProductDetails from './pages/ProductDetails';
import ProductForm from './pages/ProductForm';
import Sales from './pages/Sales';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Layout from './components/Layout';

function ProtectedRoute({ 
  children, 
  requiredPermission 
}: { 
  children: React.ReactNode;
  requiredPermission?: AppPermission;
}) {
  const { user, profile, loading, hasPermission } = useAuth();
  const location = useLocation();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // Wait for profile to load if user is logged in
  const identifier = user.email?.toLowerCase().trim() || '';
  const isPrimary = identifier === 'nara.alexandre.lucas@gmail.com' || 
                    identifier === 'nara.alexandre.lucas';

  if (!profile && !isPrimary) {
     return <div className="flex items-center justify-center h-screen">Sua conta não possui perfil.</div>;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            
            <Route path="produtos" element={
              <ProtectedRoute requiredPermission="view_products">
                <ProductList />
              </ProtectedRoute>
            } />
            
            <Route path="produtos/novo" element={
              <ProtectedRoute requiredPermission="create_products">
                <ProductForm />
              </ProtectedRoute>
            } />
            
            <Route path="produtos/:id" element={
              <ProtectedRoute requiredPermission="view_products">
                <ProductDetails />
              </ProtectedRoute>
            } />
            
            <Route path="produtos/:id/editar" element={
              <ProtectedRoute requiredPermission="edit_products">
                <ProductForm />
              </ProtectedRoute>
            } />
            
            <Route path="vendas" element={
              <ProtectedRoute requiredPermission="view_reports">
                <Sales />
              </ProtectedRoute>
            } />
            
            <Route path="estoque" element={
              <ProtectedRoute requiredPermission="stock_movement">
                <Stock />
              </ProtectedRoute>
            } />
            
            <Route path="relatorios" element={
              <ProtectedRoute requiredPermission="view_reports">
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="usuarios" element={
              <ProtectedRoute requiredPermission="manage_users">
                <Users />
              </ProtectedRoute>
            } />
            
            <Route path="configuracoes" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
