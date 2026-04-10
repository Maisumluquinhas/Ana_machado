import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc, increment, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Product, Variation } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { ShoppingBag, Plus, Search, Calendar, User, Package, Loader2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Sale Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [saleData, setSaleData] = useState({
    clientName: '',
    quantity: 1,
    observation: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(100));
    const unsubSales = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      setLoading(false);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    return () => {
      unsubSales();
      unsubProducts();
    };
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      const fetchVariations = async () => {
        const varSnapshot = await getDocs(collection(db, 'products', selectedProductId, 'variations'));
        setVariations(varSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Variation)));
      };
      fetchVariations();
    } else {
      setVariations([]);
      setSelectedVariationId('');
    }
  }, [selectedProductId]);

  const handleNewSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !saleData.clientName) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    const variation = variations.find(v => v.id === selectedVariationId);

    if (!product) return;

    // Check stock
    const currentStock = variation ? variation.quantity : 0; // If there are variations, one must be selected? 
    // Actually, if a product has variations, we should enforce selection.
    if (variations.length > 0 && !selectedVariationId) {
      toast.error('Selecione uma variação (cor/tamanho).');
      return;
    }

    if (variation && variation.quantity < saleData.quantity) {
      toast.error(`Estoque insuficiente! Disponível: ${variation.quantity}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const saleRef = doc(collection(db, 'sales'));
      const totalValue = product.price * saleData.quantity;

      const newSale: Omit<Sale, 'id'> = {
        clientId: '', // Could be implemented later
        clientName: saleData.clientName,
        date: new Date().toISOString(),
        productId: product.id,
        productName: product.name,
        variationId: selectedVariationId || '',
        variationInfo: variation ? `${variation.color} / ${variation.size}` : 'Tamanho Único',
        quantity: saleData.quantity,
        unitPrice: product.price,
        totalValue: totalValue,
        observation: saleData.observation
      };

      batch.set(saleRef, newSale);

      // Update stock
      if (variation) {
        const varRef = doc(db, 'products', product.id, 'variations', variation.id);
        batch.update(varRef, {
          quantity: increment(-saleData.quantity)
        });
      }

      // Record movement for history
      const movementRef = doc(collection(db, 'movements'));
      batch.set(movementRef, {
        productId: product.id,
        variationId: selectedVariationId || '',
        type: 'exit',
        quantity: saleData.quantity,
        date: new Date().toISOString(),
        reason: `Venda para ${saleData.clientName}`,
        variationInfo: variation ? `${variation.color} / ${variation.size}` : 'Tamanho Único'
      });

      await batch.commit();
      toast.success('Venda realizada com sucesso!');
      setIsNewSaleOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProductId('');
    setSelectedVariationId('');
    setSaleData({ clientName: '', quantity: 1, observation: '' });
  };

  const filteredSales = sales.filter(s => 
    s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-10 h-10 text-boutique-gold animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-boutique-dark">Vendas</h2>
          <p className="text-gray-500 mt-1">Gerencie as vendas da boutique e o fluxo de caixa.</p>
        </div>
        <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
          <DialogTrigger asChild>
            <Button className="boutique-button-primary gap-2 h-12 px-6 rounded-2xl shadow-lg shadow-boutique-dark/10">
              <Plus size={20} />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Registrar Nova Venda</DialogTitle>
              <DialogDescription>Preencha os dados da venda abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleNewSale} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input 
                  id="clientName" 
                  required 
                  placeholder="Ex: Maria Silva"
                  value={saleData.clientName}
                  onChange={(e) => setSaleData({...saleData, clientName: e.target.value})}
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Produto *</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variação (Cor/Tam) *</Label>
                  <Select 
                    value={selectedVariationId} 
                    onValueChange={setSelectedVariationId}
                    disabled={!selectedProductId || variations.length === 0}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue placeholder={variations.length > 0 ? "Selecione a variação" : "Sem variações"} />
                    </SelectTrigger>
                    <SelectContent>
                      {variations.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.color} / {v.size} ({v.quantity} em estoque)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    min="1"
                    required
                    value={saleData.quantity}
                    onChange={(e) => setSaleData({...saleData, quantity: parseInt(e.target.value) || 1})}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Unitário</Label>
                  <div className="h-10 flex items-center px-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-500 font-medium">
                    {selectedProductId ? 
                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(products.find(p => p.id === selectedProductId)?.price || 0) 
                      : 'R$ 0,00'
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observation">Observação</Label>
                <Input 
                  id="observation" 
                  placeholder="Ex: Pago no PIX"
                  value={saleData.observation}
                  onChange={(e) => setSaleData({...saleData, observation: e.target.value})}
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div className="pt-4 flex justify-between items-center bg-boutique-rose/10 p-4 rounded-2xl">
                <div>
                  <p className="text-xs text-boutique-gold uppercase font-bold tracking-wider">Total da Venda</p>
                  <p className="text-2xl font-bold text-boutique-dark">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      (products.find(p => p.id === selectedProductId)?.price || 0) * saleData.quantity
                    )}
                  </p>
                </div>
                <Button type="submit" className="boutique-button-primary px-8 h-12 rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalizar Venda'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="boutique-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 pb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por cliente ou produto..."
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
                  <TableHead className="pl-6 py-4">Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto / Variação</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <ShoppingBag size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhuma venda registrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-boutique-rose/5 transition-colors border-b border-gray-50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar size={14} />
                          {format(parseISO(sale.date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-boutique-dark">
                          <User size={14} className="text-boutique-gold" />
                          {sale.clientName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-boutique-dark">{sale.productName}</p>
                          <p className="text-xs text-gray-400">{sale.variationInfo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-boutique-rose text-boutique-dark">
                          {sale.quantity} un
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-boutique-dark">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.totalValue)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button variant="ghost" size="sm" className="text-boutique-gold hover:bg-boutique-rose/30">
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
