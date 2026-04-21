import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Variation, Movement, Sale } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  Boxes,
  Activity,
  Calendar,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { motion } from 'motion/react';
import { useTheme } from '../components/ThemeContext';

export default function Dashboard() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<(Product & { variation: string; quantity: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItemsInStock, setTotalItemsInStock] = useState(0);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), async (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);

      const lowStock: (Product & { variation: string; quantity: number })[] = [];
      let totalStock = 0;
      
      for (const product of productsData) {
        const varSnapshot = await getDocs(collection(db, 'products', product.id, 'variations'));
        varSnapshot.docs.forEach(vDoc => {
          const vData = vDoc.data() as Variation;
          totalStock += vData.quantity;
          if (vData.quantity < 3) {
            lowStock.push({ ...product, variation: `${vData.color} / ${vData.size}`, quantity: vData.quantity });
          }
        });
      }
      setLowStockItems(lowStock.slice(0, 5));
      setTotalItemsInStock(totalStock);
    });

    const unsubMovements = onSnapshot(
      query(collection(db, 'movements'), orderBy('date', 'desc'), limit(5)),
      (snapshot) => {
        setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movement)));
      }
    );

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubMovements();
      unsubSales();
    };
  }, []);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const daySales = sales.filter(s => isSameDay(parseISO(s.date), date));
    const totalValue = daySales.reduce((acc, s) => acc + s.totalValue, 0);
    return {
      name: format(date, 'dd/MM', { locale: ptBR }),
      vendas: totalValue,
    };
  }).reverse();

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalValue, 0);
  const totalSalesCount = sales.length;

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Activity className="w-12 h-12 text-accent" />
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-12 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-serif font-bold text-foreground">Olá, Ana Machado</h2>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Visão em tempo real da sua boutique hoje
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-card p-3 rounded-2xl shadow-sm border border-border/50"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] leading-none mb-1">Hoje</p>
            <p className="text-sm font-bold text-foreground">{format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
          </div>
        </motion.div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento Total" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          icon={DollarSign}
          trend="+12%"
          trendType="up"
          delay={0}
        />
        <StatCard 
          title="Peças em Estoque" 
          value={totalItemsInStock.toString()}
          icon={Boxes}
          trend="Total Físico"
          trendType="neutral"
          delay={0.1}
        />
        <StatCard 
          title="Pedidos Realizados" 
          value={totalSalesCount.toString()}
          icon={ShoppingBag}
          trend="+4 hoje"
          trendType="up"
          delay={0.2}
        />
        <StatCard 
          title="Baixo Estoque" 
          value={lowStockItems.length.toString()}
          icon={AlertTriangle}
          trend={lowStockItems.length > 0 ? "Ação Requerida" : "Normal"}
          trendType={lowStockItems.length > 0 ? "down" : "neutral"}
          delay={0.3}
        />
      </div>

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="border-none shadow-xl shadow-foreground/[0.03] overflow-hidden group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div>
                <CardTitle className="text-xl font-serif">Desempenho de Vendas</CardTitle>
                <CardDescription>Fluxo financeiro dos últimos 7 dias</CardDescription>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:rotate-12 transition-transform duration-500">
                <TrendingUp size={24} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7Days}>
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500}}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--foreground)'
                      }}
                      itemStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
                      cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="vendas" 
                      stroke="var(--accent)" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorVendas)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-8"
        >
          {/* Low Stock Highlight */}
          <Card className="border-none shadow-xl shadow-foreground/[0.03] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl font-serif">Reposição</CardTitle>
                <CardDescription>Alertas críticos</CardDescription>
              </div>
              <Link to="/estoque" className="p-2 rounded-xl bg-muted hover:bg-accent hover:text-accent-foreground transition-all duration-300">
                <ChevronRight size={18} />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockItems.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center">
                  <Activity className="text-green-500/30 mb-2" size={32} />
                  <p className="text-sm font-medium text-muted-foreground">Estoque saudável</p>
                </div>
              ) : (
                lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/30 group hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center text-red-500">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[120px]">{item.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.variation}</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="rounded-lg">{item.quantity} un</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-none shadow-xl shadow-foreground/[0.03] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-serif">Movimentação</CardTitle>
              <CardDescription>Histórico recente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {movements.map((m, idx) => (
                <div key={m.id} className="flex items-center gap-4 relative">
                  {idx !== movements.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-px bg-border/50" />}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0",
                    m.type === 'entry' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                  )}>
                    {m.type === 'entry' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-none mb-1">
                      {m.type === 'entry' ? 'Entrada registrada' : 'Saída registrada'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{products.find(p => p.id === m.productId)?.name || 'Produto'}</p>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(parseISO(m.date), "dd/MM")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendType, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-none shadow-xl shadow-foreground/[0.03] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
        <CardContent className="p-6 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-500 group-hover:bg-accent group-hover:text-accent-foreground">
              <Icon size={24} />
            </div>
            
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
              trendType === 'up' ? "bg-green-500/10 text-green-500" : 
              trendType === 'down' ? "bg-red-500/10 text-red-500" : 
              "bg-muted text-muted-foreground"
            )}>
              {trendType === 'up' ? <TrendingUp size={10} /> : trendType === 'down' ? <TrendingDown size={10} /> : <Activity size={10} />}
              {trend}
            </div>
          </div>
          
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">{title}</p>
            <h3 className="text-2xl font-sans font-bold text-foreground tracking-tight">{value}</h3>
          </div>
          
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-all duration-700" />
        </CardContent>
      </Card>
    </motion.div>
  );
}
