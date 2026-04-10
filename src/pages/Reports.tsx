import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart3, TrendingUp, Users, ShoppingBag, Loader2 } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-serif font-bold text-boutique-dark">Relatórios e Análises</h2>
        <p className="text-gray-500 mt-1">Acompanhe o desempenho da sua boutique em detalhes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportCard 
          title="Vendas por Vendedor" 
          description="Desempenho individual da equipe."
          icon={Users}
        />
        <ReportCard 
          title="Produtos Mais Rentáveis" 
          description="Quais peças trazem mais lucro."
          icon={TrendingUp}
        />
        <ReportCard 
          title="Giro de Estoque" 
          description="Velocidade de saída dos produtos."
          icon={ShoppingBag}
        />
      </div>

      <Card className="boutique-card border-none shadow-sm">
        <CardContent className="h-[400px] flex flex-col items-center justify-center text-center p-12">
          <BarChart3 size={64} className="text-boutique-gold/20 mb-4" />
          <h3 className="text-xl font-serif font-bold text-boutique-dark mb-2">Relatórios Avançados</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Esta funcionalidade está sendo preparada para oferecer insights profundos sobre suas vendas e estoque. 
            Em breve você poderá exportar dados em PDF e Excel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportCard({ title, description, icon: Icon }: any) {
  return (
    <Card className="boutique-card border-none shadow-sm hover:shadow-md transition-all cursor-pointer group">
      <CardHeader>
        <div className="p-3 bg-boutique-rose/20 rounded-2xl w-fit mb-2 group-hover:scale-110 transition-transform">
          <Icon size={24} className="text-boutique-dark" />
        </div>
        <CardTitle className="text-lg font-serif">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
