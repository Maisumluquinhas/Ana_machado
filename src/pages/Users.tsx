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
  Edit2, 
  Settings2, 
  Loader2,
  Lock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const PERMISSIONS: { id: AppPermission; label: string }[] = [
  { id: 'view_products', label: 'Visualizar Produtos' },
  { id: 'create_products', label: 'Criar Produtos' },
  { id: 'edit_products', label: 'Editar Produtos' },
  { id: 'excluir_products', label: 'Excluir Produtos' },
  { id: 'stock_movement', label: 'Movimentar Estoque' },
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
      // Create a secondary app instance to create user without signing out
      const tempAppName = `temp-app-${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      const userCredential = await createUserWithEmailAndPassword(tempAuth, newUser.email, newUser.password);
      const uid = userCredential.user.uid;

      // Create profile in Firestore using the main app
      const profile: UserProfile = {
        uid,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.role === 'admin' ? PERMISSIONS.map(p => p.id) : newUser.permissions,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), profile);
      
      // Sign out from temp auth and delete app
      await signOut(tempAuth);
      
      toast.success('Usuário criado com sucesso!');
      setIsAddUserOpen(false);
      setNewUser({ email: '', password: '', role: 'user', permissions: ['view_products'] });
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao criar usuário: ' + error.message);
    } finally {
      if (tempApp) await deleteApp(tempApp);
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isActive: !user.isActive
      });
      toast.success(`Usuário ${!user.isActive ? 'ativado' : 'desativado'} com sucesso.`);
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
        permissions: editingUser.role === 'admin' ? PERMISSIONS.map(p => p.id) : editingUser.permissions
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-boutique-dark">Gerenciamento de Usuários</h2>
          <p className="text-gray-500 mt-1">Controle quem acessa o sistema e quais são suas permissões.</p>
        </div>
        
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="boutique-button-primary gap-2 h-12 px-6 rounded-2xl shadow-lg shadow-boutique-dark/10">
              <UserPlus size={20} />
              Criar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Novo Usuário</DialogTitle>
              <DialogDescription>Crie uma conta para um novo membro da equipe.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input 
                      id="email" 
                      type="email"
                      required 
                      placeholder="email@boutique.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha Inicial *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input 
                      id="password" 
                      type="password"
                      required 
                      placeholder="Mínimo 6 caracteres"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(v: 'admin' | 'user') => setNewUser({...newUser, role: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário Comum</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newUser.role === 'user' && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-semibold text-gray-700">Permissões Específicas</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      {PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
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
                          />
                          <Label 
                            htmlFor={`perm-${perm.id}`}
                            className="text-xs font-medium cursor-pointer"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full boutique-button-primary h-12 rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="boutique-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 pb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por e-mail..."
              className="pl-12 h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-boutique-rose/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="pl-6 py-4">Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <Loader2 className="animate-spin mx-auto text-boutique-gold" size={32} />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <UsersIcon size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uid} className="hover:bg-boutique-rose/5 transition-colors border-b border-gray-50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                            user.role === 'admin' ? "bg-boutique-dark" : "bg-boutique-gold"
                          )}>
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-boutique-dark">{user.email}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Entrou em {new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "rounded-full px-3",
                          user.role === 'admin' ? "bg-boutique-dark text-white border-transparent" : "border-boutique-rose text-boutique-dark"
                        )}>
                          {user.role === 'admin' ? 'Admin' : 'Membro'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {user.role === 'admin' ? (
                            <Badge variant="ghost" className="bg-gray-100 text-[10px] text-gray-500">Acesso Total</Badge>
                          ) : user.permissions.slice(0, 2).map(p => (
                            <Badge key={p} variant="ghost" className="bg-boutique-rose/50 text-[10px] text-boutique-gold font-bold">
                              {PERMISSIONS.find(per => per.id === p)?.label}
                            </Badge>
                          ))}
                          {user.role !== 'admin' && user.permissions.length > 2 && (
                            <Badge variant="ghost" className="bg-gray-100 text-[10px] text-gray-500">+{user.permissions.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="ghost" className={cn(
                          "flex items-center gap-1 w-fit border-none font-bold",
                          user.isActive ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-100"
                        )}>
                          {user.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="bg-gray-50 text-boutique-dark hover:bg-boutique-rose rounded-xl"
                            onClick={() => {
                              setEditingUser(user);
                              setIsEditUserOpen(true);
                            }}
                          >
                            <Settings2 size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                              "rounded-xl",
                              user.isActive ? "text-boutique-gold hover:bg-boutique-rose/30" : "text-green-600 hover:bg-green-50"
                            )}
                            onClick={() => handleUpdateStatus(user)}
                            title={user.isActive ? 'Desativar' : 'Ativar'}
                          >
                            {user.isActive ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Permissions Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Editar Usuário</DialogTitle>
            <DialogDescription>Gerencie funções e permissões de acesso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePermissions} className="space-y-6 py-4">
            {editingUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-boutique-dark flex items-center justify-center text-white font-bold text-xl">
                    {editingUser.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-boutique-dark">{editingUser.email}</p>
                    <p className="text-xs text-gray-500">{editingUser.isActive ? 'Conta Ativa' : 'Conta Inativa'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select 
                    value={editingUser.role} 
                    onValueChange={(v: 'admin' | 'user') => setEditingUser({...editingUser, role: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário Comum</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingUser.role === 'user' && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-semibold text-gray-700">Permissões de Acesso</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      {PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
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
                          />
                          <Label 
                            htmlFor={`edit-perm-${perm.id}`}
                            className="text-xs font-medium cursor-pointer"
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

            <DialogFooter>
              <Button type="submit" className="w-full boutique-button-primary h-12 rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
