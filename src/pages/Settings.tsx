import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { cn } from '../lib/utils';

export default function Settings() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-serif font-bold text-boutique-dark">Configurações</h2>
        <p className="text-gray-500 mt-1">Personalize o sistema e gerencie sua conta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <SettingsNavButton icon={User} label="Perfil da Boutique" active />
          <SettingsNavButton icon={Bell} label="Notificações" />
          <SettingsNavButton icon={Shield} label="Segurança" />
          <SettingsNavButton icon={Palette} label="Aparência" />
          <SettingsNavButton icon={Globe} label="Integrações" />
        </aside>

        <div className="lg:col-span-2 space-y-6">
          <Card className="boutique-card border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Perfil da Boutique</CardTitle>
              <CardDescription>Informações básicas que aparecem nos relatórios e vendas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="boutiqueName">Nome da Boutique</Label>
                  <Input id="boutiqueName" defaultValue="Ana Machado Boutique" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ / CPF</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Contato</Label>
                <Input id="email" defaultValue="contato@anamachado.com.br" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" placeholder="Rua das Flores, 123 - Centro" className="rounded-xl" />
              </div>
              <div className="flex justify-end">
                <Button className="boutique-button-primary px-8 rounded-xl">Salvar Alterações</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="boutique-card border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Preferências do Sistema</CardTitle>
              <CardDescription>Configure como o sistema deve se comportar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificações de Estoque Baixo</Label>
                  <p className="text-sm text-gray-500">Receber avisos quando um produto tiver menos de 3 unidades.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Modo Escuro (Beta)</Label>
                  <p className="text-sm text-gray-500">Alterar a aparência do sistema para cores escuras.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingsNavButton({ icon: Icon, label, active }: any) {
  return (
    <Button 
      variant="ghost" 
      className={cn(
        "w-full justify-start gap-3 h-12 rounded-xl px-4",
        active ? "bg-boutique-rose/30 text-boutique-dark font-bold" : "text-gray-500"
      )}
    >
      <Icon size={20} />
      {label}
    </Button>
  );
}
