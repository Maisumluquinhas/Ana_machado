import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  LogOut, 
  Menu, 
  X, 
  ShoppingBag, 
  BarChart3, 
  Settings, 
  Boxes, 
  Users, 
  ChevronRight, 
  User,
  UsersRound,
  CalendarDays,
  ShieldAlert
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { AppPermission } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, settings } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/', exact: true, permission: 'view_dashboard' as AppPermission },
    { label: 'Produtos', icon: Package, path: '/produtos', permission: 'view_products' as AppPermission },
    { label: 'Vendas', icon: ShoppingBag, path: '/vendas', permission: 'view_sales' as AppPermission },
    { label: 'Estoque', icon: Boxes, path: '/estoque', permission: 'view_stock' as AppPermission },
    { label: 'Relatórios', icon: BarChart3, path: '/relatorios', permission: 'view_reports' as AppPermission },
    { label: 'Usuários', icon: ShieldAlert, path: '/usuarios', permission: 'manage_users' as AppPermission },
    { label: 'Configurações', icon: Settings, path: '/configuracoes', permission: 'manage_settings' as AppPermission },
  ].filter(item => !item.permission || hasPermission(item.permission));

  const getActiveItem = () => {
    return [...navItems].reverse().find(item => {
      if (item.exact) return location.pathname === item.path;
      return location.pathname.startsWith(item.path);
    });
  };

  const activeItem = getActiveItem();

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="fixed left-0 top-0 bottom-0 hidden lg:flex flex-col w-72 bg-card border-r border-border transition-all duration-300 z-50">
        <div className="p-8 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">
              {settings?.name || 'Ana Machado'}
              <span className="block text-[10px] font-sans font-bold text-accent uppercase tracking-[0.3em] mt-1">Boutique</span>
            </h1>
          </motion.div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item, index) => {
            const isActive = activeItem?.path === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                      : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={cn(isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent group-hover:scale-110 transition-all duration-300")} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {isActive && (
                    <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-accent rounded-full" />
                  )}
                  {!isActive && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-4px] group-hover:translate-x-0 transition-transform duration-300" />}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-border/50">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 mb-4 border border-border/30">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Logado como</p>
              <p className="text-sm font-medium truncate">{auth.currentUser?.email?.split('@')[0]}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 relative min-h-screen">
        {/* Top Navbar */}
        <header className={cn(
          "sticky top-0 right-0 left-0 lg:left-72 z-40 transition-all duration-300 px-6 h-20 flex items-center justify-between",
          scrolled || isMobileMenuOpen ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm" : "bg-transparent"
        )}>
          <div className="lg:hidden flex items-center gap-4">
             <h1 className="text-xl font-serif font-bold tracking-tight">{settings?.name || 'Ana Machado'}</h1>
          </div>
          
          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              {activeItem?.label || 'Boutique'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="lg:hidden rounded-xl bg-muted/50"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <X size={20} />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Menu size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-background pt-24 px-6 flex flex-col pb-10"
            >
              <nav className="grid grid-cols-1 gap-3">
                {navItems.map((item, index) => {
                  const isActive = activeItem?.path === item.path;
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 px-6 py-5 rounded-2xl text-lg font-medium transition-all active:scale-95",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                            : "bg-muted/50 text-muted-foreground border border-border/50"
                        )}
                      >
                        <item.icon size={22} />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
              <Button
                variant="outline"
                className="mt-auto w-full py-8 border-border text-foreground hover:bg-destructive/10 hover:text-destructive rounded-3xl text-lg font-medium transition-all"
                onClick={handleSignOut}
              >
                Finalizar Sessão
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-x-hidden pt-4 lg:pt-8 bg-background/50">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
