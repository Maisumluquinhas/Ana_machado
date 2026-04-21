import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Save, ChevronRight, Moon, Sun, Smartphone, CreditCard, Store } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useTheme } from '../components/ThemeContext';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-10 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-serif font-bold tracking-tight">Preferências Estruturais</h1>
        <p className="text-muted-foreground mt-2 font-medium">Configurações de identidade, segurança e interface</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <aside className="lg:col-span-1 space-y-2">
          <SettingsNavButton icon={Store} label="Perfil da Boutique" active />
          <SettingsNavButton icon={Bell} label="Notificações" />
          <SettingsNavButton icon={Shield} label="Segurança" />
          <SettingsNavButton icon={Palette} label="Aparência" />
          <SettingsNavButton icon={CreditCard} label="Faturamento" />
          <SettingsNavButton icon={Globe} label="Integrações" />
        </aside>

        <div className="lg:col-span-3 space-y-8">
          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
            <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-8">
              <div className="flex items-center gap-3">
                <Store className="text-accent" size={20} />
                <CardTitle className="text-2xl font-serif">Identidade da Boutique</CardTitle>
              </div>
              <CardDescription className="text-sm font-medium text-muted-foreground mt-1 lowercase first-letter:uppercase">Dados fundamentais para emissão de documentos e relatórios.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="boutiqueName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Nome Comercial</Label>
                  <Input id="boutiqueName" defaultValue="Ana Machado Boutique" className="h-12 bg-muted/30 border-border/50 rounded-xl focus:ring-accent font-bold" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Cadastro Fiscal (CNPJ/CPF)</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" className="h-12 bg-muted/30 border-border/50 rounded-xl focus:ring-accent font-mono" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">E-mail de Contato Principal</Label>
                    <Input id="email" defaultValue="contato@anamachado.com.br" className="h-12 bg-muted/30 border-border/50 rounded-xl focus:ring-accent" />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Telefone / WhatsApp</Label>
                    <Input id="phone" placeholder="(00) 00000-0000" className="h-12 bg-muted/30 border-border/50 rounded-xl focus:ring-accent font-mono" />
                 </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Endereço de Faturamento</Label>
                <Input id="address" placeholder="Rua das Flores, 123 - Centro, São Paulo - SP" className="h-12 bg-muted/30 border-border/50 rounded-xl focus:ring-accent" />
              </div>
              
              <div className="flex justify-end pt-4 border-t border-border/30">
                <Button className="boutique-button-primary h-12 px-10 rounded-2xl gap-2 font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                  <Save size={18} />
                  Salvar Mudanças
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
            <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-8">
              <div className="flex items-center gap-3">
                <Palette className="text-accent" size={20} />
                <CardTitle className="text-2xl font-serif">Personalização & Comportamento</CardTitle>
              </div>
              <CardDescription className="text-sm font-medium text-muted-foreground mt-1 lowercase first-letter:uppercase">Ajuste a interface para sua melhor experiência diária.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between p-6 bg-muted/20 border border-border/50 rounded-3xl group hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-bold flex items-center gap-2">
                    Visual Noturno
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  </Label>
                  <p className="text-sm text-muted-foreground font-medium">Troque entre temas claro e escuro para melhor conforto visual.</p>
                </div>
                <div className="flex items-center gap-3">
                   <Sun size={14} className={cn("transition-all", theme === 'light' ? "text-accent scale-125" : "text-muted-foreground opacity-30")} />
                   <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={toggleTheme}
                    className="data-[state=checked]:bg-accent"
                   />
                   <Moon size={14} className={cn("transition-all", theme === 'dark' ? "text-accent scale-125" : "text-muted-foreground opacity-30")} />
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-muted/20 border border-border/50 rounded-3xl group hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-bold">Alertas de Reposição</Label>
                  <p className="text-sm text-muted-foreground font-medium">Notificar quando o estoque de qualquer variação atingir menos de 3 unidades.</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-accent" />
              </div>

              <div className="flex items-center justify-between p-6 bg-muted/20 border border-border/50 rounded-3xl group hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-bold">Relatórios Automáticos</Label>
                  <p className="text-sm text-muted-foreground font-medium">Enviar um resumo do faturamento mensal por e-mail no último dia do mês.</p>
                </div>
                <Switch className="data-[state=checked]:bg-accent" />
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
        "w-full justify-between h-14 rounded-2xl px-6 transition-all group",
        active 
          ? "bg-accent/10 text-accent font-bold shadow-sm shadow-accent/5" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-4">
        <Icon size={20} className={cn("transition-colors", active ? "text-accent" : "text-muted-foreground/50 group-hover:text-foreground")} />
        <span className="text-sm tracking-tight">{label}</span>
      </div>
      <ChevronRight size={14} className={cn("transition-all", active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0")} />
    </Button>
  );
}
