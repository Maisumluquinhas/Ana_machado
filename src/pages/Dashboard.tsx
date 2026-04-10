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
  Loader2,
  Boxes,
  History
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';

export default function Dashboard() {
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

      // Fetch variations to check low stock and total items
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
      query(collection(db, 'movements'), orderBy('date', 'desc'), limit(10)),
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

  // Prepare chart data for sales over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const daySales = sales.filter(s => isSameDay(parseISO(s.date), date));
    const totalValue = daySales.reduce((acc, s) => acc + s.totalValue, 0);
    return {
      name: format(date, 'dd/MM', { locale: ptBR }),
      vendas: totalValue,
      date: date
    };
  }).reverse();

  // Prepare category data
  const categoryData = products.reduce((acc: any[], product) => {
    const existing = acc.find(item => item.name === product.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: product.category, value: 1 });
    }
    return acc;
  }, []);

  // Prepare top selling products
  const productSalesData = sales.reduce((acc: any[], sale) => {
    const existing = acc.find(item => item.name === sale.productName);
    if (existing) {
      existing.vendas += sale.quantity;
    } else {
      acc.push({ name: sale.productName, vendas: sale.quantity });
    }
    return acc;
  }, []).sort((a, b) => b.vendas - a.vendas).slice(0, 5);

  const COLORS = ['#2D3436', '#D4AF37', '#FADBD8', '#E5E7E9', '#AAB7B8'];

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalValue, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-10 h-10 text-boutique-gold animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-boutique-dark">Olá, Ana Machado</h2>
          <p className="text-gray-500 mt-1">Aqui está o que está acontecendo na sua boutique hoje.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-boutique-rose/20">
          <div className="px-4 py-2 bg-boutique-rose/30 rounded-xl">
            <p className="text-[10px] font-bold text-boutique-gold uppercase tracking-wider">Hoje</p>
            <p className="text-sm font-bold text-boutique-dark">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Vendas Totais" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          icon={DollarSign}
          trend="+12.5%"
          trendUp={true}
          color="bg-boutique-dark"
        />
        <StatCard 
          title="Peças em Estoque" 
          value={totalItemsInStock.toString()}
          icon={Boxes}
          trend="Itens físicos"
          trendUp={true}
          color="bg-boutique-gold"
        />
        <StatCard 
          title="Total de Vendas" 
          value={sales.length.toString()}
          icon={ShoppingBag}
          trend="+5 hoje"
          trendUp={true}
          color="bg-boutique-dark"
        />
        <StatCard 
          title="Estoque Baixo" 
          value={lowStockItems.length.toString()}
          icon={AlertTriangle}
          trend="Atenção"
          trendUp={false}
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 boutique-card border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-xl font-serif">Fluxo de Vendas</CardTitle>
              <CardDescription>Volume de vendas nos últimos 7 dias</CardDescription>
            </div>
            <TrendingUp className="text-boutique-gold" size={24} />
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7Days}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 12}}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Vendas']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#D4AF37" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorVendas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card className="boutique-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Categorias</CardTitle>
            <CardDescription>Distribuição de produtos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Selling Products */}
        <Card className="boutique-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Mais Vendidos</CardTitle>
            <CardDescription>Produtos com maior volume de saída</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productSalesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    width={100}
                    tick={{fill: '#2D3436', fontSize: 12, fontWeight: 500}}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="vendas" fill="#2D3436" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="boutique-card border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-serif">Alertas de Estoque</CardTitle>
              <CardDescription>Itens que precisam de reposição urgente</CardDescription>
            </div>
            <Link to="/estoque" className="text-xs font-bold text-boutique-gold hover:underline">Ver tudo</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package size={48} className="mx-auto mb-2 opacity-20" />
                  <p>Tudo em ordem com o estoque!</p>
                </div>
              ) : (
                lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={16} className="text-gray-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-boutique-dark">{item.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{item.variation}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{item.quantity} un</p>
                      <p className="text-[10px] text-gray-400">Restantes</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  return (
    <Card className="boutique-card border-none shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300", color)}>
            <Icon size={24} />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
            trendUp ? "text-green-600 bg-green-50" : "text-boutique-gold bg-boutique-rose/30"
          )}>
            {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-serif font-bold text-boutique-dark tracking-tight">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
