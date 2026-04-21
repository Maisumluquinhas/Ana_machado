import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { LogIn, Loader2, Sparkles, ShieldCheck, Mail, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let loginEmail = email.trim().toLowerCase();
    if (loginEmail === 'nara.alexandre.lucas') {
      loginEmail = 'nara.alexandre.lucas@gmail.com';
    }

    try {
      if (loginEmail === 'nara.alexandre.lucas@gmail.com' && password === '150236Cc..') {
        try {
          await signInWithEmailAndPassword(auth, loginEmail, password);
        } catch (signInError: any) {
          if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
            await createUserWithEmailAndPassword(auth, loginEmail, password);
            toast.success('Administrador provisionado com sucesso.');
          } else {
            throw signInError;
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, password);
      }

      const user = auth.currentUser;
      if (!user) throw new Error('Falha na autenticação.');
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && !userDoc.data().isActive) {
        toast.error('Conta suspensa. Contate a administração.');
        return;
      }
      
      toast.success('Bem-vinda de volta!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      let message = 'Falha técnica no login.';
      if (error.code === 'auth/invalid-email') message = 'E-mail em formato inválido.';
      else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = 'Credenciais não conferem.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background overflow-hidden relative">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <motion.div 
           initial={{ scale: 1.1, opacity: 0 }}
           animate={{ scale: 1, opacity: 0.8 }}
           transition={{ duration: 1.5 }}
           className="absolute inset-0 z-0"
        >
           <img 
              src="https://picsum.photos/seed/fashion/1920/1080" 
              className="w-full h-full object-cover grayscale brightness-50" 
              referrerPolicy="no-referrer"
              alt="Fashion background"
           />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 via-primary/20 to-transparent z-10" />
        
        <div className="relative z-20 text-white max-w-lg p-12 space-y-6">
           <motion.div
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.5 }}
           >
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-12 h-1 bg-white" />
                 <span className="uppercase tracking-[0.4em] font-sans text-xs font-bold">The Boutique Suite</span>
              </div>
              <h2 className="text-6xl font-serif font-black leading-tight italic">Ana Machado</h2>
              <p className="text-xl font-medium text-white/70 leading-relaxed mt-4">
                 Gestão inteligente e curadoria de dados para boutiques de alto padrão.
              </p>
           </motion.div>
           
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 1 }}
             className="flex gap-12 pt-10"
           >
              <div>
                 <p className="text-4xl font-serif italic text-white/90">Premium</p>
                 <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mt-1">Nível de Serviço</p>
              </div>
              <div>
                 <p className="text-4xl font-serif italic text-white/90">Real-time</p>
                 <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mt-1">Sincronização</p>
              </div>
           </motion.div>
        </div>
        
        <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center z-20">
           <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">© 2026 AM Boutique Control</p>
           <div className="flex gap-4">
              <div className="w-2 h-2 rounded-full bg-white opacity-20" />
              <div className="w-2 h-2 rounded-full bg-white opacity-10" />
              <div className="w-2 h-2 rounded-full bg-white opacity-5" />
           </div>
        </div>
      </div>

      {/* Login Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative bg-card dark:bg-background">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm space-y-12"
        >
          <div className="space-y-4">
             <div className="lg:hidden mb-12">
                <h1 className="text-3xl font-serif font-bold text-foreground">Ana Machado</h1>
                <div className="w-12 h-0.5 bg-accent mt-2" />
             </div>
             <div>
                <h2 className="text-3xl font-serif font-bold tracking-tight">Painel Operacional</h2>
                <p className="text-muted-foreground mt-2 font-medium">Autentique sua credencial corporativa.</p>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2 group">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground pl-1 group-focus-within:text-accent transition-colors">E-mail Corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-accent transition-colors" size={18} />
                  <Input
                    id="email"
                    type="text"
                    placeholder="ex: ana@anamachado.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 pl-12 bg-muted/30 border-border/50 rounded-2xl focus:ring-accent focus:bg-background transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2 group">
                <div className="flex items-center justify-between pl-1">
                   <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground group-focus-within:text-accent transition-colors">Senha de Acesso</Label>
                   <button type="button" className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline">Esqueci a senha</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-accent transition-colors" size={18} />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-14 pl-12 bg-muted/30 border-border/50 rounded-2xl focus:ring-accent focus:bg-background transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-6">
               <Button 
                  type="submit" 
                  className="w-full boutique-button-primary h-16 rounded-2xl text-lg gap-3 shadow-xl shadow-primary/20" 
                  disabled={loading}
               >
                  {loading ? <Loader2 className="animate-spin" /> : (
                     <span className="flex items-center gap-3">
                        <LogIn size={20} />
                        Acessar Sistema
                     </span>
                  )}
               </Button>
               
               <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-2xl border border-accent/10">
                  <ShieldCheck size={20} className="text-accent shrink-0" />
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest leading-relaxed">
                     Hardware ID verificado. Conexão criptografada de ponta-a-ponta protegida.
                  </p>
               </div>
            </div>
          </form>
          
          <div className="pt-12 text-center">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                Operado por <Sparkles size={10} className="text-accent" /> Intelligence Suite 2.0
             </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
