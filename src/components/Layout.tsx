import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, LogOut, Menu, X, ShoppingBag, BarChart3, Settings, Boxes, Users } from 'lucide-react';
import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { AppPermission } from '../types';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, hasPermission, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Produtos', icon: Package, path: '/produtos', permission: 'view_products' as AppPermission },
    { label: 'Vendas', icon: ShoppingBag, path: '/vendas', permission: 'view_reports' as AppPermission },
    { label: 'Estoque', icon: Boxes, path: '/estoque', permission: 'stock_movement' as AppPermission },
    { label: 'Relatórios', icon: BarChart3, path: '/relatorios', permission: 'view_reports' as AppPermission },
    { label: 'Usuários', icon: Users, path: '/usuarios', permission: 'manage_users' as AppPermission },
    { label: 'Configurações', icon: Settings, path: '/configuracoes' },
  ].filter(item => !item.permission || hasPermission(item.permission));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8f9fa]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-boutique-rose/50 shadow-sm z-20">
        <div className="p-8">
          <h1 className="text-2xl font-serif font-bold text-boutique-dark tracking-tight">
            Ana Machado
            <span className="block text-xs font-sans font-normal text-boutique-gold uppercase tracking-[0.2em] mt-1">Boutique</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-boutique-dark text-white shadow-lg shadow-boutique-dark/10"
                    : "text-gray-500 hover:bg-boutique-rose/50 hover:text-boutique-dark"
                )}
              >
                <item.icon size={20} className={cn(isActive ? "text-white" : "text-gray-400 group-hover:text-boutique-gold")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-boutique-rose/30 rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-boutique-gold uppercase tracking-wider mb-1">Usuário</p>
            <p className="text-sm font-medium text-boutique-dark truncate">{auth.currentUser?.email}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-500 hover:text-destructive hover:bg-destructive/5 rounded-xl py-6"
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            <span className="font-medium">Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-boutique-rose sticky top-0 z-30">
        <h1 className="text-xl font-serif font-bold text-boutique-dark">Ana Machado</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-full">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white p-6 flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-serif font-bold text-boutique-dark">Ana Machado</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-full">
              <X />
            </Button>
          </div>
          <nav className="flex-1 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-6 py-5 rounded-2xl text-lg transition-all",
                  location.pathname === item.path
                    ? "bg-boutique-dark text-white shadow-xl"
                    : "text-gray-500 bg-gray-50"
                )}
              >
                <item.icon size={24} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          <Button
            variant="outline"
            className="mt-auto w-full py-8 border-boutique-rose text-boutique-dark rounded-2xl text-lg"
            onClick={handleSignOut}
          >
            Sair do Sistema
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-10 max-w-7xl mx-auto w-full min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
