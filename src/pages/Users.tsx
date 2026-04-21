import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, AppPermission } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  Mail, 
  Shield, 
  Settings2, 
  Loader2,
  Lock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Activity,
  ShieldCheck,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const PERMISSIONS: { id: AppPermission; label: string }[] = [
  { id: 'view_products', label: 'Visualizar Produtos' },
  { id: 'create_products', label: 'Criar Produtos' },
  { id: 'edit_products', label: 'Editar Produtos' },
  { id: 'excluir_products', label: 'Excluir Produtos' },
  { id: 'stock_movement', label: 'Movimentar Estoque' },
  { id: 'delete_sale', label: 'Excluir Vendas' },
  { id: 'view_reports', label: 'Visualizar Relatórios' },
  { id: 'manage_users', label: 'Gerenciar Usuários' },
];

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    permissions: ['view_products'] as AppPermission[]
  });

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    let tempApp;
    try {
      const tempAppName = `temp-app-${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      const userCredential = await createUserWithEmailAndPassword(tempAuth, newUser.email, newUser.password);
      const uid = userCredential.user.uid;

      const now = new Date().toISOString();
      const profile: UserProfile = {
        uid,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.role === 'admin' ? PERMISSIONS.map(p => p.id) : newUser.permissions,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'users', uid), profile);
      await signOut(tempAuth);
      
      toast.success('Usuário criado com sucesso!');
      setIsAddUserOpen(false);
      setNewUser({ email: '', password: '', role: 'user', permissions: ['view_products'] });
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message);
    } finally {
      if (tempApp) await deleteApp(tempApp);
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isActive: !user.isActive,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Usuário ${!user.isActive ? 'ativado' : 'desativado'}!`);
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        role: editingUser.role,
        permissions: editingUser.role === 'admin' ? PERMISSIONS.map(p => p.id) : editingUser.permissions,
        updatedAt: new Date().toISOString()
      });
      toast.success('Permissões atualizadas!');
      setIsEditUserOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar permissões.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <UsersIcon className="w-12 h-12 text-accent" />
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-serif font-bold tracking-tight">Time & Governança</h1>
          <p className="text-muted-foreground mt-2 font-medium">Controle de acessos e hierarquia administrativa</p>
        </motion.div>
        
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="boutique-button-primary gap-2 h-14 px-8 rounded-2xl shadow-xl shadow-primary/10">
              <UserPlus size={20} />
              Criar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-primary p-8 text-primary-foreground">
              <DialogTitle className="text-3xl font-serif">Nova Credencial</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 mt-2">Conceda acesso a um novo membro do time.</DialogDescription>
            </div>
            <form onSubmit={handleAddUser} className="p-8 space-y-6 bg-card">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">E-mail Corporativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      id="email" 
                      type="email"
                      required 
                      placeholder="ana@anamachado.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="pl-12 h-12 bg-muted/30 border-border/50 focus:ring-accent rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Senha Temporária</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      id="password" 
                      type="password"
                      required 
                      placeholder="Mínimo 6 caracteres"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="pl-12 h-12 bg-muted/30 border-border/50 focus:ring-accent rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Nível de Autoridade</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(v: 'admin' | 'user') => setNewUser({...newUser, role: v})}
                  >
                    <SelectTrigger className="h-12 bg-muted/30 border-border/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Colaborador (Permissões Custom)</SelectItem>
                      <SelectItem value="admin">Administrador (Total Control)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newUser.role === 'user' && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <Label className="text-[11px] font-bold text-foreground">Permissões de Atuação</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-6 rounded-3xl border border-border/30">
                      {PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-3 group cursor-pointer">
                          <Checkbox 
                            id={`perm-${perm.id}`} 
                            checked={newUser.permissions.includes(perm.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewUser({...newUser, permissions: [...newUser.permissions, perm.id]});
                              } else {
                                setNewUser({...newUser, permissions: newUser.permissions.filter(p => p !== perm.id)});
                              }
                            }}
                            className="rounded-md border-muted-foreground/30 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          <Label 
                            htmlFor={`perm-${perm.id}`}
                            className="text-xs font-medium cursor-pointer group-hover:text-accent transition-colors"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full boutique-button-primary h-14 rounded-2xl" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalizar Cadastro'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
        <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-6 md:p-8">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Pesquisar por e-mail profissional..."
              className="pl-12 h-12 bg-muted/20 border-border/30 rounded-2xl focus:ring-accent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                  <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Perfil Corporativo</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Governança</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Escopo de Atuação</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Configurações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredUsers.map((user, idx) => (
                    <motion.tr 
                      key={user.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-accent/[0.03] transition-colors border-b border-border/30"
                    >
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center text-white font-serif font-bold text-lg shadow-inner",
                            user.role === 'admin' ? "bg-primary" : "bg-accent"
                          )}>
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{user.email}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Ingresso: {new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2">
                           {user.role === 'admin' ? <ShieldCheck size={14} className="text-primary" /> : <User size={14} className="text-muted-foreground" />}
                           <span className={cn(
                             "text-[10px] font-bold uppercase tracking-widest",
                             user.role === 'admin' ? "text-primary" : "text-muted-foreground"
                           )}>
                             {user.role === 'admin' ? 'Administrador' : 'Gestor/User'}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {user.role === 'admin' ? (
                            <Badge variant="secondary" className="bg-primary/5 text-[10px] font-bold border-primary/20 text-primary uppercase">Soberano</Badge>
                          ) : (
                            <>
                              {user.permissions.slice(0, 2).map(p => (
                                <Badge key={p} variant="outline" className="bg-accent/5 text-[9px] font-bold border-accent/20 text-accent uppercase px-2 py-0">
                                  {PERMISSIONS.find(per => per.id === p)?.label.split(' ')[0]}
                                </Badge>
                              ))}
                              {user.permissions.length > 2 && (
                                <Badge variant="ghost" className="text-[9px] font-bold text-muted-foreground">+{user.permissions.length - 2}</Badge>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleUpdateStatus(user)}
                          className={cn(
                            "mx-auto flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all",
                            user.isActive 
                              ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" 
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          )}
                        >
                          {user.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {user.isActive ? 'Ativo' : 'Pausado'}
                        </motion.button>
                      </TableCell>
                      <TableCell className="pr-8 py-5 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-10 h-10 rounded-2xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setEditingUser(user);
                            setIsEditUserOpen(true);
                          }}
                        >
                          <Settings2 size={18} />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-accent p-8 text-accent-foreground relative">
            <DialogTitle className="text-3xl font-serif">Ajuste de Credencial</DialogTitle>
            <DialogDescription className="text-accent-foreground/70 mt-2">Atualize o escopo de atuação do usuário.</DialogDescription>
            <Shield className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
          </div>
          <form onSubmit={handleUpdatePermissions} className="p-8 space-y-8 bg-card">
            {editingUser && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-6 bg-muted/30 rounded-3xl border border-border/50">
                  <div className="w-14 h-14 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center font-serif font-bold text-2xl shadow-lg border border-accent">
                    {editingUser.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">{editingUser.email}</p>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                      editingUser.isActive ? "text-green-500" : "text-muted-foreground"
                    )}>
                      <Activity size={10} /> {editingUser.isActive ? 'Operação Ativa' : 'Acesso Suspenso'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Autoridade no Sistema</Label>
                  <Select 
                    value={editingUser.role} 
                    onValueChange={(v: 'admin' | 'user') => setEditingUser({...editingUser, role: v})}
                  >
                    <SelectTrigger className="h-12 bg-muted/30 border-border/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Colaborador Especialista</SelectItem>
                      <SelectItem value="admin">Administrador Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingUser.role === 'user' && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <Label className="text-[11px] font-bold text-foreground">Escopo de Atuação</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-6 rounded-3xl border border-border/30">
                      {PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-3 group cursor-pointer">
                          <Checkbox 
                            id={`edit-perm-${perm.id}`} 
                            checked={editingUser.permissions.includes(perm.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditingUser({...editingUser, permissions: [...editingUser.permissions, perm.id]});
                              } else {
                                setEditingUser({...editingUser, permissions: editingUser.permissions.filter(p => p !== perm.id)});
                              }
                            }}
                            className="rounded-md border-muted-foreground/30 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          <Label 
                            htmlFor={`edit-perm-${perm.id}`}
                            className="text-xs font-medium cursor-pointer group-hover:text-accent transition-colors"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4 border-l-4 border-accent pl-4 ml-1">
              <Button type="submit" className="w-full boutique-button-primary h-14 rounded-2xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sincronizar Permissões'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
