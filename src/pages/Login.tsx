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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Normalize email for admin
    let loginEmail = email.trim().toLowerCase();
    if (loginEmail === 'nara.alexandre.lucas') {
      loginEmail = 'nara.alexandre.lucas@gmail.com';
    }

    try {
      // Special bootstrapping for the designated admin
      if (loginEmail === 'nara.alexandre.lucas@gmail.com' && password === '150236Cc..') {
        try {
          await signInWithEmailAndPassword(auth, loginEmail, password);
        } catch (signInError: any) {
          if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
            // Attempt to create the primary admin if it doesn't exist
            await createUserWithEmailAndPassword(auth, loginEmail, password);
            toast.success('Conta de administrador provisionada com sucesso!');
          } else {
            throw signInError;
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, password);
      }

      const user = auth.currentUser;
      if (!user) throw new Error('Falha na autenticação.');
      
      // Check if user is active
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && !userDoc.data().isActive) {
        toast.error('Sua conta está desativada. Entre em contato com o administrador.');
        return;
      }
      
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      let message = 'Erro ao fazer login.';
      
      if (error.code === 'auth/operation-not-allowed') {
        message = 'O login por e-mail e senha não está ativado no Console do Firebase.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'E-mail ou senha incorretos.';
      }
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-boutique-beige p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-boutique-dark mb-2">Ana Machado</h1>
          <p className="text-boutique-gold uppercase tracking-widest text-sm">Boutique • Gestão de Estoque</p>
        </div>
        
        <Card className="boutique-card">
          <CardHeader>
            <CardTitle className="text-2xl">Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com seu e-mail e senha para gerenciar o estoque.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail ou Usuário</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Seu login"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-boutique-rose focus:ring-boutique-gold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-boutique-rose focus:ring-boutique-gold"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full boutique-button-primary py-6 text-lg" 
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Entrar'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center mt-6 text-sm text-gray-500">
          © {new Date().getFullYear()} Ana Machado Boutique. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
