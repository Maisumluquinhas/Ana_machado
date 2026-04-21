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
  
  if (!profile) {
     return <div className="flex items-center justify-center h-screen text-center p-4">
       <div>
         <h2 className="text-xl font-serif font-bold mb-2">Conta não encontrada</h2>
         <p className="text-muted-foreground">Sua conta não possui um perfil registrado no sistema.</p>
       </div>
     </div>;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

import { ThemeProvider } from './components/ThemeContext';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
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
                <ProtectedRoute requiredPermission="view_sales">
                  <Sales />
                </ProtectedRoute>
              } />
              
              <Route path="estoque" element={
                <ProtectedRoute requiredPermission="view_stock">
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
              
              <Route path="configuracoes" element={
                <ProtectedRoute requiredPermission="manage_settings">
                  <Settings />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </AuthProvider>
  );
}
