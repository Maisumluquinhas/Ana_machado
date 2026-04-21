import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, increment, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Product, Variation } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { ShoppingBag, Plus, Search, Calendar, User, Package, Loader2, Trash2, Eye, Info, X, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { motion, AnimatePresence } from 'motion/react';

export default function Sales() {
  const { isAdmin, hasPermission } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

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
        clientId: '', 
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

      if (variation) {
        const varRef = doc(db, 'products', product.id, 'variations', variation.id);
        batch.update(varRef, {
          quantity: increment(-saleData.quantity)
        });
      }

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

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      const saleRef = doc(db, 'sales', saleToDelete.id);
      batch.delete(saleRef);

      if (saleToDelete.variationId) {
        const varRef = doc(db, 'products', saleToDelete.productId, 'variations', saleToDelete.variationId);
        batch.update(varRef, {
          quantity: increment(saleToDelete.quantity)
        });
      }

      const movementRef = doc(collection(db, 'movements'));
      batch.set(movementRef, {
        productId: saleToDelete.productId,
        variationId: saleToDelete.variationId || '',
        type: 'entry',
        quantity: saleToDelete.quantity,
        date: new Date().toISOString(),
        reason: `Estorno de venda deletada para ${saleToDelete.clientName}`,
        variationInfo: saleToDelete.variationInfo
      });

      await batch.commit();
      toast.success('Venda excluída e estoque revertido!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir venda.');
    } finally {
      setIsSubmitting(false);
      setIsDeleteAlertOpen(false);
      setSaleToDelete(null);
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
      <Loader2 className="w-10 h-10 text-accent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-serif font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground mt-2 font-medium">Relatório completo de transações e fluxo financeiro</p>
        </motion.div>

        <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
          <DialogTrigger asChild>
            <Button className="boutique-button-primary gap-2 h-14 px-8 rounded-2xl shadow-xl shadow-primary/10">
              <Plus size={20} />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-primary p-8 text-primary-foreground">
              <DialogTitle className="text-3xl font-serif">Registrar Venda</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 mt-2">Finalize o atendimento com elegância.</DialogDescription>
            </div>
            <form onSubmit={handleNewSale} className="p-8 space-y-6 bg-card">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Cliente</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    id="clientName" 
                    required 
                    placeholder="Nome completo do consumidor"
                    value={saleData.clientName}
                    onChange={(e) => setSaleData({...saleData, clientName: e.target.value})}
                    className="pl-12 h-12 bg-muted/30 border-border/50 focus:ring-accent rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Produto</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="h-12 bg-muted/30 border-border/50 rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Variação</Label>
                  <Select 
                    value={selectedVariationId} 
                    onValueChange={setSelectedVariationId}
                    disabled={!selectedProductId || variations.length === 0}
                  >
                    <SelectTrigger className="h-12 bg-muted/30 border-border/50 rounded-xl">
                      <SelectValue placeholder="Cor/Tam" />
                    </SelectTrigger>
                    <SelectContent>
                      {variations.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.color} / {v.size} ({v.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Quantidade</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    min="1"
                    required
                    value={saleData.quantity}
                    onChange={(e) => setSaleData({...saleData, quantity: parseInt(e.target.value) || 1})}
                    className="h-12 bg-muted/30 border-border/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Preço Unitário</Label>
                  <div className="h-12 flex items-center px-4 bg-muted/50 rounded-xl border border-border/30 text-foreground font-bold">
                    {selectedProductId ? 
                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(products.find(p => p.id === selectedProductId)?.price || 0) 
                      : 'R$ 0,00'
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observation" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Observações Internas</Label>
                <Input 
                  id="observation" 
                  placeholder="Formas de pagamento, descontos, etc."
                  value={saleData.observation}
                  onChange={(e) => setSaleData({...saleData, observation: e.target.value})}
                  className="h-12 bg-muted/30 border-border/50 rounded-xl"
                />
              </div>

              <div className="pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Total Líquido</p>
                  <p className="text-3xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      (products.find(p => p.id === selectedProductId)?.price || 0) * saleData.quantity
                    )}
                  </p>
                </div>
                <Button type="submit" className="w-full md:w-auto boutique-button-primary px-10 h-14 rounded-2xl" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Venda'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
        <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Pesquisar por cliente ou produto..."
                className="pl-12 h-12 bg-muted/20 border-border/30 rounded-2xl focus:ring-accent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                  <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data da Venda</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cliente</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Peça Selecionada</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Quant.</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Pago</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredSales.map((sale, idx) => (
                    <motion.tr 
                      key={sale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-accent/[0.03] transition-colors border-b border-border/30"
                    >
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-2.5 text-muted-foreground font-medium text-sm">
                          <Calendar size={14} className="text-accent" />
                          {format(parseISO(sale.date), "dd MMM, yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                            <User size={14} />
                          </div>
                          <span className="font-bold text-sm">{sale.clientName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <Package size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{sale.productName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{sale.variationInfo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <Badge variant="secondary" className="rounded-md font-bold px-2 py-0.5">{sale.quantity}x</Badge>
                      </TableCell>
                      <TableCell className="py-5">
                        <p className="font-bold text-accent text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.totalValue)}
                        </p>
                      </TableCell>
                      <TableCell className="pr-8 py-5 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-9 h-9 rounded-xl text-accent hover:bg-accent/10"
                            onClick={() => { setSelectedSale(sale); setIsDetailsOpen(true); }}
                          >
                            <Eye size={16} />
                          </Button>
                          {(isAdmin || hasPermission('delete_sale')) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-9 h-9 rounded-xl text-destructive hover:bg-destructive/10"
                              onClick={() => { setSaleToDelete(sale); setIsDeleteAlertOpen(true); }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                        <ShoppingBag size={64} strokeWidth={1} />
                        <p className="text-xl font-serif">Nenhuma venda encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
          {selectedSale && (
            <div className="bg-card">
              <div className="bg-accent p-8 text-accent-foreground relative overflow-hidden">
                <DialogTitle className="text-3xl font-serif">Cupom de Venda</DialogTitle>
                <DialogDescription className="text-accent-foreground/70 mt-2 font-medium">Registro #ID-{selectedSale.id.slice(-6).toUpperCase()}</DialogDescription>
                <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none">Consumidor</p>
                    <p className="text-lg font-bold">{selectedSale.clientName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none">Realizada em</p>
                    <p className="text-sm font-bold">
                      {format(parseISO(selectedSale.date), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-muted/40 rounded-3xl border border-border/50 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-card rounded-2xl border border-border/50 flex items-center justify-center shadow-sm text-accent">
                      <Package size={28} />
                    </div>
                    <div className="flex-1">
                      <p className="font-serif text-xl font-bold">{selectedSale.productName}</p>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">{selectedSale.variationInfo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mb-1">Métrica</p>
                      <p className="font-bold text-sm">{selectedSale.quantity} unidades</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mb-1">Preço Un.</p>
                      <p className="font-bold text-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.unitPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-accent font-bold uppercase tracking-tighter mb-1">Subtotal</p>
                      <p className="font-bold text-sm text-accent">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.totalValue)}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedSale.observation && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-accent font-bold uppercase tracking-widest flex items-center gap-1.5 pl-1">
                      <Info size={12} /> Nota de Venda
                    </p>
                    <div className="p-5 bg-accent/5 rounded-2xl text-sm italic font-medium border border-accent/10">
                      "{selectedSale.observation}"
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setIsDetailsOpen(false)} 
                  className="w-full h-14 boutique-button-secondary rounded-2xl shadow-sm"
                >
                  Concluir Visualização
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4 self-center">
              <Trash2 size={32} />
            </div>
            <AlertDialogTitle className="text-2xl font-serif text-center">Confirmar Exclusão?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground py-2 font-medium">
              A venda para <span className="text-foreground font-bold">{saleToDelete?.clientName}</span> será removida. 
              <br />
              <span className="bg-red-500/10 text-destructive px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block mt-4 mx-auto w-fit">O estoque será estornado automaticamente</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:flex-row flex-col">
            <AlertDialogCancel variant="outline" size="default" className="w-full sm:w-auto h-12 rounded-xl mt-0 font-bold border-border/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSale}
              className="w-full sm:w-auto h-12 bg-destructive border-destructive hover:bg-destructive/90 text-white rounded-xl font-bold shadow-lg shadow-destructive/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Excluir Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
