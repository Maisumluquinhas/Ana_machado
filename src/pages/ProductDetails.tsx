import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc, increment, writeBatch, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
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
import { ArrowLeft, Edit, Plus, Minus, History, Trash2, Package, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

export default function ProductDetails() {
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
      limit(10)
    );
    const unsubMovements = onSnapshot(qMovements, (snapshot) => {
      // Filter movements for this product client-side for simplicity in this demo
      // In production, use a proper query with productId
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
      toast.success('Variação adicionada!');
      setIsAddVarOpen(false);
      setNewVar({ color: '', size: '', quantity: 0 });
    } catch (error) {
      console.error(error);
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
      
      // 1. Record movement
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

      // 2. Update variation stock
      const varRef = doc(db, 'products', id!, 'variations', selectedVar.id);
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

  const handleDeleteProduct = async () => {
    if (!product) return;
    if (!confirm(`Tem certeza que deseja excluir "${product.name}" e todas as suas variações?`)) return;
    
    setIsSubmitting(true);
    try {
      // 1. Delete image from storage if exists
      if (product.imagePath) {
        try {
          const imageRef = ref(storage, product.imagePath);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }

      // 2. Delete variations
      const varSnapshot = await getDocs(collection(db, 'products', id!, 'variations'));
      const batch = writeBatch(db);
      varSnapshot.forEach(vDoc => {
        batch.delete(vDoc.ref);
      });

      // 3. Delete product
      batch.delete(doc(db, 'products', id!));
      
      await batch.commit();
      toast.success('Produto excluído com sucesso!');
      navigate('/produtos');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariation = async (varId: string) => {
    if (!confirm('Tem certeza que deseja remover esta variação?')) return;
    
    try {
      await deleteDoc(doc(db, 'products', id!, 'variations', varId));
      toast.success('Variação removida.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover variação.');
    }
  };

  if (loading || !product) return <div className="flex items-center justify-center h-64">Carregando detalhes...</div>;

  const totalStock = variations.reduce((acc, v) => acc + v.quantity, 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/produtos')} className="rounded-full">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h2 className="text-3xl font-serif font-bold text-boutique-dark">{product.name}</h2>
            <p className="text-gray-500">{product.category} • {product.sku || 'Sem SKU'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/produtos/${id}/editar`}>
            <Button variant="outline" className="border-boutique-rose text-boutique-dark gap-2">
              <Edit size={18} />
              Editar Peça
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
            onClick={handleDeleteProduct}
            disabled={isSubmitting}
          >
            <Trash2 size={18} />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Info Card */}
        <Card className="boutique-card lg:col-span-1 h-fit">
          <div className="aspect-[3/4] bg-boutique-rose flex items-center justify-center overflow-hidden rounded-t-xl">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <ImageIcon className="text-boutique-gold/50" size={64} />
            )}
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Preço</p>
                <p className="text-2xl font-bold text-boutique-dark">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Estoque Total</p>
                <Badge className="text-lg px-3 py-1 bg-boutique-rose text-boutique-dark hover:bg-boutique-rose">
                  {totalStock} un
                </Badge>
              </div>
            </div>
            {product.description && (
              <div className="pt-4 border-t border-boutique-rose">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Descrição</p>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variations Management */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="boutique-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Variações e Estoque</CardTitle>
                <CardDescription>Controle de cores e tamanhos disponíveis.</CardDescription>
              </div>
              <Dialog open={isAddVarOpen} onOpenChange={setIsAddVarOpen}>
                <DialogTrigger asChild>
                  <Button className="boutique-button-primary gap-2">
                    <Plus size={18} />
                    Adicionar Variação
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Nova Variação</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="color" className="text-right">Cor</Label>
                      <Input 
                        id="color" 
                        className="col-span-3" 
                        placeholder="Ex: Preto" 
                        value={newVar.color}
                        onChange={(e) => setNewVar({...newVar, color: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="size" className="text-right">Tamanho</Label>
                      <Input 
                        id="size" 
                        className="col-span-3" 
                        placeholder="Ex: M" 
                        value={newVar.size}
                        onChange={(e) => setNewVar({...newVar, size: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="qty" className="text-right">Estoque Inicial</Label>
                      <Input 
                        id="qty" 
                        type="number" 
                        className="col-span-3" 
                        value={newVar.quantity}
                        onChange={(e) => setNewVar({...newVar, quantity: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAddVarOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAddVariation} className="boutique-button-primary" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {variations.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-boutique-rose rounded-xl">
                  <Package className="mx-auto text-boutique-gold/30 mb-2" size={48} />
                  <p className="text-gray-500">Nenhuma variação cadastrada.</p>
                  <p className="text-xs text-gray-400">Adicione cores e tamanhos para começar.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cor</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variations.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.color}</TableCell>
                        <TableCell>{v.size}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "px-3 py-1",
                            v.quantity < 3 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          )}>
                            {v.quantity} un
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => {
                              setSelectedVar(v);
                              setMovementType('entry');
                              setIsMovementOpen(true);
                            }}
                          >
                            <Plus size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedVar(v);
                              setMovementType('exit');
                              setIsMovementOpen(true);
                            }}
                          >
                            <Minus size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-400 hover:text-destructive"
                            onClick={() => handleDeleteVariation(v.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Movements */}
          <Card className="boutique-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <History size={20} className="text-boutique-gold" />
                Histórico Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-center py-4 text-gray-500 text-sm">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-4">
                  {movements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          m.type === 'entry' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {m.type === 'entry' ? <Plus size={14} /> : <Minus size={14} />}
                        </div>
                        <div>
                          <p className="font-medium text-boutique-dark">
                            {(m as any).variationInfo || 'Variação'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(m.date), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-bold",
                          m.type === 'entry' ? "text-green-600" : "text-red-600"
                        )}>
                          {m.type === 'entry' ? '+' : '-'}{m.quantity} un
                        </p>
                        {m.reason && <p className="text-[10px] text-gray-400 italic">{m.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Movement Modal */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {movementType === 'entry' ? 'Entrada de Estoque' : 'Saída de Estoque'}
            </DialogTitle>
            <DialogDescription>
              {selectedVar?.color} / {selectedVar?.size}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="moveQty" className="text-right">Quantidade</Label>
              <Input 
                id="moveQty" 
                type="number" 
                min="1"
                className="col-span-3" 
                value={moveQty}
                onChange={(e) => setMoveQty(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">Motivo</Label>
              <Input 
                id="reason" 
                className="col-span-3" 
                placeholder="Ex: Venda, Reposição..." 
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMovementOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleMovement} 
              className={cn(
                "px-8",
                movementType === 'entry' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
