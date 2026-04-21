import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Product, Movement } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  Loader2, 
  Calendar, 
  DollarSign, 
  Package, 
  ArrowUpRight, 
  Search,
  Filter,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  format, 
  subDays, 
  isSameDay, 
  parseISO, 
  isWithinInterval, 
  startOfDay, 
  endOfDay,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeContext';
import { cn } from '../lib/utils';

export default function Reports() {
  const { theme } = useTheme();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      setLoading(false);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const unsubMovements = onSnapshot(collection(db, 'movements'), (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movement)));
    });

    return () => {
      unsubSales();
      unsubProducts();
      unsubMovements();
    };
  }, []);

  const filteredSales = sales.filter(s => {
    const saleDate = parseISO(s.date);
    return isWithinInterval(saleDate, {
      start: startOfDay(parseISO(dateRange.start)),
      end: endOfDay(parseISO(dateRange.end))
    });
  });

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalValue, 0);
  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const getRevenueChartData = () => {
    if (period === 'daily') {
      const days = eachDayOfInterval({
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end)
      });

      return days.map(day => {
        const daySales = filteredSales.filter(s => isSameDay(parseISO(s.date), day));
        return {
          name: format(day, 'dd/MM'),
          value: daySales.reduce((acc, s) => acc + s.totalValue, 0)
        };
      });
    } else {
      const months: Record<string, number> = {};
      filteredSales.forEach(s => {
        const key = format(parseISO(s.date), 'MM/yyyy');
        months[key] = (months[key] || 0) + s.totalValue;
      });
      return Object.entries(months).map(([name, value]) => ({ name, value }));
    }
  };

  const topProductsData = filteredSales.reduce((acc: any[], sale) => {
    const existing = acc.find(item => item.name === sale.productName);
    if (existing) {
      existing.value += sale.quantity;
      existing.revenue += sale.totalValue;
    } else {
      acc.push({ name: sale.productName, value: sale.quantity, revenue: sale.totalValue });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 5);

  const movementChartData = movements
    .filter(m => isWithinInterval(parseISO(m.date), {
      start: startOfDay(parseISO(dateRange.start)),
      end: endOfDay(parseISO(dateRange.end))
    }))
    .reduce((acc: any[], m) => {
      const existing = acc.find(item => item.name === format(parseISO(m.date), 'dd/MM'));
      if (existing) {
        if (m.type === 'entry') existing.entries += m.quantity;
        else existing.exits += m.quantity;
      } else {
        acc.push({
          name: format(parseISO(m.date), 'dd/MM'),
          entries: m.type === 'entry' ? m.quantity : 0,
          exits: m.type === 'exit' ? m.quantity : 0
        });
      }
      return acc;
    }, []).slice(-15);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <BarChart3 className="w-12 h-12 text-accent" />
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-12 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-serif font-bold tracking-tight">Relatórios & Inteligência</h1>
          <p className="text-muted-foreground mt-2 font-medium">Análise aprofundada de performance e movimentações</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card p-6 rounded-3xl shadow-xl shadow-foreground/[0.02] border border-border/50 flex flex-wrap gap-6 items-end"
        >
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Período Inicial</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" size={14} />
              <Input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="pl-10 h-10 bg-muted/30 border-border/50 rounded-xl w-44"
              />
            </div>
          </div>
          <div className="hidden md:flex flex-col justify-center h-10">
            <ArrowRight size={18} className="text-muted-foreground/30" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Período Final</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" size={14} />
              <Input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="pl-10 h-10 bg-muted/30 border-border/50 rounded-xl w-44"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Consolidação</Label>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="h-10 bg-muted/30 border-border/50 rounded-xl w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportSummaryCard 
          title="Faturamento Bruto" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          subValue={`${totalOrders} transações validadas`}
          icon={DollarSign}
          delay={0}
        />
        <ReportSummaryCard 
          title="Ticket Médio" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgOrderValue)}
          subValue="Média aritmética por pedido"
          icon={TrendingUp}
          delay={0.1}
        />
        <ReportSummaryCard 
          title="Volume de Vendas" 
          value={filteredSales.reduce((acc, s) => acc + s.quantity, 0).toString()}
          subValue="Peças físicas faturadas"
          icon={ShoppingBag}
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div>
                <CardTitle className="text-xl font-serif">Fluxo Financeiro</CardTitle>
                <CardDescription>Evolução da receita no tempo</CardDescription>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:rotate-12 transition-transform duration-500">
                <Activity size={24} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getRevenueChartData()}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500}}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500}}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                      formatter={(v: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), 'Faturamento']}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div>
                <CardTitle className="text-xl font-serif">Curva ABC de Produtos</CardTitle>
                <CardDescription>Top itens por volume faturado</CardDescription>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform duration-300">
                <Layers size={24} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      width={140}
                      tick={{fill: 'var(--foreground)', fontSize: 11, fontWeight: 600}}
                    />
                    <Tooltip 
                      cursor={{fill: 'var(--accent)', opacity: 0.05}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="value" fill="var(--foreground)" radius={[0, 8, 8, 0]} barSize={24}>
                      {topProductsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent)' : 'var(--primary)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-2">
          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div>
                <CardTitle className="text-xl font-serif">Fluxo de Inventário</CardTitle>
                <CardDescription>Relação entre entradas e saídas de peças</CardDescription>
              </div>
              <div className="flex gap-2">
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Entradas</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Saídas</span>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movementChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="entries" name="Entradas" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="exits" name="Saídas" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function ReportSummaryCard({ title, value, subValue, icon: Icon, delay }: any) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, duration: 0.5 }}>
      <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
        <CardContent className="p-8 flex items-center gap-8 relative">
          <div className="p-5 rounded-3xl bg-accent/10 text-accent group-hover:scale-110 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-500 shadow-lg shadow-accent/5">
            <Icon size={32} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">{title}</p>
            <h3 className="text-3xl font-sans font-bold text-foreground leading-tight">{value}</h3>
            <p className="text-xs text-accent font-bold mt-1 tracking-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {subValue}
            </p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Icon size={80} strokeWidth={1} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
