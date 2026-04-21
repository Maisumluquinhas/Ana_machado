import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs, doc, increment, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Variation, Movement } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Boxes, Plus, Minus, History, Package, Loader2, Search, Filter, ArrowUpRight, ArrowDownRight, Warehouse, Activity, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Stock() {
  const [products, setProducts] = useState<(Product & { variations: Variation[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedVar, setSelectedVar] = useState<Variation | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('entry');
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, async (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      const productsWithVars = await Promise.all(productsData.map(async (product) => {
        const varSnapshot = await getDocs(collection(db, 'products', product.id, 'variations'));
        const variations = varSnapshot.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() } as Variation));
        return { ...product, variations };
      }));

      setProducts(productsWithVars);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleMovement = async () => {
    if (!selectedVar || !selectedProduct || moveQty <= 0) return;
    
    if (movementType === 'exit' && selectedVar.quantity < moveQty) {
      toast.error('Estoque insuficiente!');
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      const movementRef = doc(collection(db, 'movements'));
      batch.set(movementRef, {
        productId: selectedProduct.id,
        variationId: selectedVar.id,
        type: movementType,
        quantity: moveQty,
        date: new Date().toISOString(),
        reason: moveReason,
        variationInfo: `${selectedVar.color} / ${selectedVar.size}`
      });

      const varRef = doc(db, 'products', selectedProduct.id, 'variations', selectedVar.id);
      batch.update(varRef, {
        quantity: increment(movementType === 'entry' ? moveQty : -moveQty)
      });

      await batch.commit();
      toast.success(`Estoque atualizado: ${movementType === 'entry' ? 'Entrada' : 'Saída'}`);
      setIsMovementOpen(false);
      setMoveQty(1);
      setMoveReason('');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Boxes className="w-12 h-12 text-accent" />
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-serif font-bold tracking-tight">Inventário Estratégico</h1>
          <p className="text-muted-foreground mt-2 font-medium">Controle de giro, entradas e ajustes de precisão</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-card p-3 rounded-2xl shadow-sm border border-border/50"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Warehouse size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] leading-none mb-1">Status</p>
            <p className="text-sm font-bold text-foreground">Sincronizado</p>
          </div>
        </motion.div>
      </header>

      <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
        <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-6 md:p-8">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Pesquisar por peça ou SKU..."
              className="pl-12 h-12 bg-muted/20 border-border/30 rounded-2xl focus:ring-accent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                  <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Produto / SKU</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Variações em Prateleira</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações Rápidas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredProducts.map((product, idx) => (
                    <motion.tr 
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-accent/[0.03] transition-colors border-b border-border/30"
                    >
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border border-border/50 shadow-inner group-hover:scale-105 transition-transform duration-300">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="text-muted-foreground/30" size={24} strokeWidth={1} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{product.name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{product.sku || 'NÃO CATALOGADO'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-wrap gap-2">
                          {product.variations.map(v => (
                            <Badge 
                              key={v.id} 
                              variant="outline" 
                              className={cn(
                                "px-3 py-1.5 rounded-xl border-dashed transition-all",
                                v.quantity < 3 
                                  ? "bg-red-500/5 text-red-500 border-red-500/30" 
                                  : "bg-muted/50 text-foreground border-border/50"
                              )}
                            >
                              <span className="font-bold uppercase text-[9px] mr-2 text-muted-foreground">{v.color} {v.size}</span>
                              <span className="font-black text-sm">{v.quantity}</span>
                            </Badge>
                          ))}
                          {product.variations.length === 0 && (
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest italic opacity-50">Sem variações ativas</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-8 py-5 text-right">
                        <Dialog open={isMovementOpen && selectedProduct?.id === product.id} onOpenChange={(open) => {
                          if (!open) setIsMovementOpen(false);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 px-5 rounded-xl text-accent hover:bg-accent/10 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsMovementOpen(true);
                              }}
                            >
                              <Activity size={16} className="mr-2" />
                              Ajustar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
                             <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
                                <DialogTitle className="text-3xl font-serif">Manejo de Estoque</DialogTitle>
                                <DialogDescription className="text-primary-foreground/70 mt-2 font-medium">{product.name}</DialogDescription>
                                <Warehouse className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
                             </div>
                             
                             <div className="p-8 space-y-6 bg-card">
                               <div className="space-y-2">
                                 <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Variação Específica</Label>
                                 <Select onValueChange={(val) => setSelectedVar(product.variations.find(v => v.id === val) || null)}>
                                   <SelectTrigger className="h-12 bg-muted/30 border-border/50 rounded-xl">
                                     <SelectValue placeholder="Selecione..." />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {product.variations.map(v => (
                                       <SelectItem key={v.id} value={v.id}>{v.color} / {v.size} ({v.quantity} un)</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                 <motion.button 
                                   whileTap={{ scale: 0.95 }}
                                   type="button"
                                   onClick={() => setMovementType('entry')}
                                   className={cn(
                                     "h-14 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border-2",
                                     movementType === 'entry' 
                                      ? "bg-accent/10 border-accent text-accent shadow-lg shadow-accent/5" 
                                      : "bg-muted/10 border-transparent text-muted-foreground"
                                   )}
                                 >
                                   <ArrowUpRight size={20} /> Entrada
                                 </motion.button>
                                 <motion.button 
                                   whileTap={{ scale: 0.95 }}
                                   type="button"
                                   onClick={() => setMovementType('exit')}
                                   className={cn(
                                     "h-14 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border-2",
                                     movementType === 'exit' 
                                      ? "bg-destructive/10 border-destructive text-destructive shadow-lg shadow-destructive/5" 
                                      : "bg-muted/10 border-transparent text-muted-foreground"
                                   )}
                                 >
                                   <ArrowDownRight size={20} /> Saída
                                 </motion.button>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                  <Label htmlFor="moveQty" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Volume</Label>
                                  <Input 
                                    id="moveQty" 
                                    type="number" 
                                    min="1"
                                    value={moveQty}
                                    onChange={(e) => setMoveQty(parseInt(e.target.value) || 1)}
                                    className="h-12 bg-muted/30 border-border/50 rounded-xl text-center font-black text-lg"
                                  />
                                 </div>
                                 <div className="space-y-2">
                                   <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Estoque Atual</Label>
                                   <div className="h-12 flex items-center justify-center bg-muted/50 rounded-xl border border-border/30 text-foreground font-black text-lg">
                                     {selectedVar ? selectedVar.quantity : '--'}
                                   </div>
                                 </div>
                               </div>

                               <div className="space-y-2">
                                 <Label htmlFor="reason" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Justificativa</Label>
                                 <Input 
                                   id="reason" 
                                   placeholder="Ex: Nota Fiscal 123, Ajuste de balanço..."
                                   value={moveReason}
                                   onChange={(e) => setMoveReason(e.target.value)}
                                   className="h-12 bg-muted/30 border-border/50 rounded-xl"
                                 />
                               </div>

                               <DialogFooter className="pt-6 border-t border-border/50">
                                 <Button 
                                    onClick={handleMovement} 
                                    className="w-full h-14 boutique-button-primary rounded-2xl shadow-xl shadow-primary/10" 
                                    disabled={isSubmitting || !selectedVar}
                                 >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : (
                                       <span className="flex items-center gap-2">
                                          <Check size={20} />
                                          Efetivar Atualização
                                       </span>
                                    )}
                                 </Button>
                               </DialogFooter>
                             </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-96 text-center">
                       <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                        <Warehouse size={64} strokeWidth={1} />
                        <p className="text-xl font-serif">Inventário vazio no momento</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
