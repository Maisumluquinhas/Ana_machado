import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc, increment, writeBatch, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Variation, Movement } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Plus, Minus, History, Trash2, Package, Image as ImageIcon, Loader2, DollarSign, Activity, Tag, ChevronRight, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductDetails() {
  const { hasPermission } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddVarOpen, setIsAddVarOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedVar, setSelectedVar] = useState<Variation | null>(null);
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('entry');
  
  // Form states
  const [newVar, setNewVar] = useState({ color: '', size: '', quantity: 0 });
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      const docRef = doc(db, 'products', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setProduct({ id: snapshot.id, ...snapshot.data() } as Product);
      } else {
        toast.error('Produto não encontrado.');
        navigate('/produtos');
      }
    };

    fetchProduct();

    const unsubVars = onSnapshot(collection(db, 'products', id, 'variations'), (snapshot) => {
      setVariations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Variation)));
      setLoading(false);
    });

    const qMovements = query(
      collection(db, 'movements'), 
      orderBy('date', 'desc'),
      limit(20)
    );
    const unsubMovements = onSnapshot(qMovements, (snapshot) => {
      const allMovements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movement));
      setMovements(allMovements.filter(m => m.productId === id));
    });

    return () => {
      unsubVars();
      unsubMovements();
    };
  }, [id, navigate]);

  const handleAddVariation = async () => {
    if (!newVar.color || !newVar.size) {
      toast.error('Preencha cor e tamanho.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'products', id!, 'variations'), {
        productId: id,
        ...newVar,
        quantity: Number(newVar.quantity)
      });
      toast.success('Variação cadastrada!');
      setIsAddVarOpen(false);
      setNewVar({ color: '', size: '', quantity: 0 });
    } catch (error) {
      toast.error('Erro ao adicionar variação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMovement = async () => {
    if (!selectedVar || moveQty <= 0) return;
    
    if (movementType === 'exit' && selectedVar.quantity < moveQty) {
      toast.error('Estoque insuficiente!');
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      const movementRef = doc(collection(db, 'movements'));
      batch.set(movementRef, {
        productId: id,
        variationId: selectedVar.id,
        type: movementType,
        quantity: moveQty,
        date: new Date().toISOString(),
        reason: moveReason,
        variationInfo: `${selectedVar.color} / ${selectedVar.size}`
      });

      const varRef = doc(db, 'products', id!, 'variations', selectedVar.id);
      batch.update(varRef, {
        quantity: increment(movementType === 'entry' ? moveQty : -moveQty)
      });

      await batch.commit();
      toast.success('Movimentação registrada com sucesso!');
      setIsMovementOpen(false);
      setMoveQty(1);
      setMoveReason('');
    } catch (error) {
      toast.error('Erro ao atualizar estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    if (!confirm(`Confirmar exclusão definitiva de "${product.name}"?`)) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading('Excluindo do catálogo...');
    
    try {
      const varSnapshot = await getDocs(collection(db, 'products', id!, 'variations'));
      const batch = writeBatch(db);
      
      varSnapshot.forEach(vDoc => { batch.delete(vDoc.ref); });
      batch.delete(doc(db, 'products', id!));
      
      await batch.commit();
      toast.success('Produto removido.', { id: toastId });
      navigate('/produtos');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariation = async (varId: string) => {
    if (!confirm('Excluir esta variação específica?')) return;
    try {
      await deleteDoc(doc(db, 'products', id!, 'variations', varId));
      toast.success('Variação removida.');
    } catch (error) {
      toast.error('Erro operacional.');
    }
  };

  if (loading || !product) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-10 h-10 text-accent animate-spin" />
    </div>
  );

  const totalStock = variations.reduce((acc, v) => acc + v.quantity, 0);

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={() => navigate('/produtos')} className="rounded-2xl w-12 h-12 bg-card border border-border/50 text-accent group shadow-sm hover:bg-accent hover:text-accent-foreground">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-serif font-bold tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Tag size={12} className="text-accent" />
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">{product.category} • REF: {product.sku || 'NÃO DEFINIDO'}</p>
            </div>
          </motion.div>
        </div>
        <div className="flex gap-3">
          {hasPermission('edit_products') && (
            <Link to={`/produtos/${id}/editar`}>
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-border/50 text-foreground font-bold gap-2 hover:bg-muted/50">
                <Edit size={18} />
                Editar Catálogo
              </Button>
            </Link>
          )}
          {hasPermission('excluir_products') && (
            <Button 
              variant="ghost" 
              className="h-12 px-6 rounded-2xl text-destructive hover:bg-destructive/10 font-bold gap-2"
              onClick={handleDeleteProduct}
              disabled={isSubmitting}
            >
              <Trash2 size={18} />
              Remover
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden group">
            <div className="h-48 bg-muted/30 relative flex items-center justify-center overflow-hidden">
               {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
               ) : (
                  <Package className="text-muted-foreground/20 w-16 h-16" strokeWidth={1} />
               )}
               <div className="absolute top-4 right-4">
                  <Badge className="bg-accent/90 backdrop-blur-md text-accent-foreground border-none font-bold shadow-lg">In Premium List</Badge>
               </div>
            </div>
            <CardContent className="p-8 space-y-4">
               <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Preço de Etiqueta</p>
                  <p className="text-4xl font-sans font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </p>
               </div>
               
               <div className="pt-6 border-t border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Estoque Consolidado</p>
                  <div className="flex items-end justify-between">
                     <p className="text-3xl font-bold">{totalStock} <span className="text-lg font-medium text-muted-foreground">peças</span></p>
                     <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        totalStock < 5 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                     )}>
                        <Activity size={12} />
                        {totalStock < 5 ? 'Crítico' : 'Saudável'}
                     </div>
                  </div>
               </div>

               {product.description && (
                  <div className="pt-6 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-serif italic">Curadoria & Detalhes</p>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{product.description}</p>
                  </div>
               )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-serif">Fluxo de Giro</CardTitle>
              <CardDescription>Histórico de movimentação local</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {movements.length === 0 ? (
                <div className="py-10 text-center opacity-30">
                   <History size={32} className="mx-auto mb-2" />
                   <p className="text-xs font-bold uppercase tracking-widest">Sem registros</p>
                </div>
              ) : (
                movements.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-4 relative">
                    {idx !== movements.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-px bg-border/50" />}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0",
                      m.type === 'entry' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                      {m.type === 'entry' ? <Plus size={16} /> : <Minus size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-none mb-1">
                        {(m as any).variationInfo || 'Variação'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold tracking-tight">
                        {format(new Date(m.date), "dd MMM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                       <p className={cn("text-xs font-black", m.type === 'entry' ? "text-green-500" : "text-red-500")}>
                          {m.type === 'entry' ? '+' : '-'}{m.quantity}
                       </p>
                       <p className="text-[9px] font-bold text-muted-foreground uppercase">{m.type === 'entry' ? 'Entrada' : 'Saída'}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-8 pt-8 px-8">
              <div>
                <CardTitle className="text-2xl font-serif">Almanaque de Variações</CardTitle>
                <CardDescription>Gestão granular de cores, tamanhos e disponibilidade</CardDescription>
              </div>
              {hasPermission('edit_products') && (
                <Dialog open={isAddVarOpen} onOpenChange={setIsAddVarOpen}>
                  <DialogTrigger asChild>
                    <Button className="boutique-button-primary gap-2 h-12 px-6 rounded-2xl shadow-lg">
                      <Plus size={18} />
                      Nova Variação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
                     <div className="bg-accent p-8 text-accent-foreground">
                        <DialogTitle className="text-3xl font-serif">Adicionar Variação</DialogTitle>
                        <DialogDescription className="text-accent-foreground/70 mt-2 font-medium">Configure cor e tamanho para o estoque.</DialogDescription>
                     </div>
                     <div className="p-8 space-y-6 bg-card">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Cor</Label>
                              <Input placeholder="Ex: Off-White" value={newVar.color} onChange={(e) => setNewVar({...newVar, color: e.target.value})} className="h-12 bg-muted/30 border-border/50 rounded-xl" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Tamanho</Label>
                              <Input placeholder="Ex: P/M/G" value={newVar.size} onChange={(e) => setNewVar({...newVar, size: e.target.value})} className="h-12 bg-muted/30 border-border/50 rounded-xl" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Estoque Inicial</Label>
                           <Input type="number" value={newVar.quantity} onChange={(e) => setNewVar({...newVar, quantity: parseInt(e.target.value) || 0})} className="h-12 bg-muted/30 border-border/50 rounded-xl" />
                        </div>
                        <DialogFooter className="pt-4">
                           <Button onClick={handleAddVariation} className="w-full boutique-button-primary h-14 rounded-2xl" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sincronizar Variação'}
                           </Button>
                        </DialogFooter>
                     </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {variations.length === 0 ? (
                <div className="text-center py-24 bg-muted/20 border-2 border-dashed border-border/50 rounded-3xl">
                  <Package className="mx-auto text-muted-foreground/20 mb-4" size={64} strokeWidth={1} />
                  <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Sem variações ativas no sistema</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coloração / Atributo</TableHead>
                        <TableHead className="py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Modelagem / Tamanho</TableHead>
                        <TableHead className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Disponibilidade</TableHead>
                        <TableHead className="pr-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gestão Ativa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variations.map((v) => (
                        <TableRow key={v.id} className="hover:bg-accent/[0.02] border-b border-border/30">
                          <TableCell className="px-6 py-5 font-bold text-sm">{v.color}</TableCell>
                          <TableCell className="py-5 font-bold text-sm">{v.size}</TableCell>
                          <TableCell className="py-5 text-center">
                            <Badge variant="outline" className={cn(
                              "px-3 py-1 rounded-lg border-2 font-bold",
                              v.quantity < 3 ? "bg-red-500/5 text-red-500 border-red-500/20" : "bg-green-500/5 text-green-500 border-green-500/20"
                            )}>
                              {v.quantity} peças
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6 py-5 text-right">
                             <div className="flex justify-end gap-1">
                                {hasPermission('stock_movement') && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="w-9 h-9 rounded-xl text-green-500 hover:bg-green-500/10"
                                      onClick={() => { setSelectedVar(v); setMovementType('entry'); setIsMovementOpen(true); }}
                                    >
                                      <Plus size={16} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="w-9 h-9 rounded-xl text-destructive hover:bg-destructive/10"
                                      onClick={() => { setSelectedVar(v); setMovementType('exit'); setIsMovementOpen(true); }}
                                    >
                                      <Minus size={16} />
                                    </Button>
                                  </>
                                )}
                                {hasPermission('edit_products') && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-9 h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteVariation(v.id)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                )}
                             </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Movement Modal */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
          <div className={cn(
            "p-8 text-white relative overflow-hidden",
            movementType === 'entry' ? "bg-accent" : "bg-destructive"
          )}>
            <DialogTitle className="text-3xl font-serif">Manejo de Estoque</DialogTitle>
            <DialogDescription className="text-white/70 mt-2 font-medium">
              {selectedVar?.color} / {selectedVar?.size}
            </DialogDescription>
            <Activity className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
            <button onClick={() => setIsMovementOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20"><X size={16} /></button>
          </div>
          <div className="p-8 space-y-6 bg-card">
            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estoque Atual</p>
                    <p className="text-2xl font-black">{selectedVar?.quantity || 0} un</p>
                  </div>
                  <ChevronRight className="text-muted-foreground/30" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Novo Total</p>
                    <p className={cn("text-2xl font-black", movementType === 'entry' ? "text-accent" : "text-destructive")}>
                       {movementType === 'entry' ? (selectedVar?.quantity || 0) + moveQty : (selectedVar?.quantity || 0) - moveQty} un
                    </p>
                  </div>
               </div>

               <div className="space-y-2">
                 <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Quantidade</Label>
                 <Input 
                   type="number" 
                   min="1"
                   value={moveQty}
                   onChange={(e) => setMoveQty(parseInt(e.target.value) || 1)}
                   className="h-14 bg-muted/30 border-border/50 rounded-2xl text-center font-black text-2xl"
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Justificativa</Label>
                 <Input 
                   placeholder="Ex: Nota Fiscal 344, Devolução..." 
                   value={moveReason}
                   onChange={(e) => setMoveReason(e.target.value)}
                   className="h-12 bg-muted/30 border-border/50 rounded-xl"
                 />
               </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleMovement} 
                className={cn(
                  "w-full h-14 rounded-2xl shadow-xl font-bold uppercase tracking-widest",
                  movementType === 'entry' ? "boutique-button-primary" : "bg-destructive text-white hover:bg-destructive/90"
                )}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Processar Manual'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
