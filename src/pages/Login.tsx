import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Conta criada com sucesso!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Login realizado com sucesso!');
      }
      navigate('/');
    } catch (error: any) {
      console.error(error);
      let message = isSignUp ? 'Erro ao criar conta.' : 'Erro ao fazer login.';
      
      if (error.code === 'auth/operation-not-allowed') {
        message = 'O login por e-mail e senha não está ativado no Console do Firebase.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso.';
      } else if (error.code === 'auth/weak-password') {
        message = 'A senha é muito fraca (mínimo 6 caracteres).';
      } else if (error.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
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
            <CardTitle className="text-2xl">{isSignUp ? 'Criar Nova Conta' : 'Acesso ao Sistema'}</CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Preencha os dados abaixo para se registrar.' 
                : 'Entre com seu e-mail e senha para gerenciar o estoque.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
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
                {loading ? 'Processando...' : (isSignUp ? 'Registrar' : 'Entrar')}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="text-boutique-gold hover:text-boutique-dark"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Crie uma agora'}
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
