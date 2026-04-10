import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Variation, Movement } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Boxes, Plus, Minus, History, Package, Loader2, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

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
      
      // 1. Record movement
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

      // 2. Update variation stock
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
      <Loader2 className="w-10 h-10 text-boutique-gold animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-serif font-bold text-boutique-dark">Gestão de Estoque</h2>
        <p className="text-gray-500 mt-1">Ajuste manual de estoque e controle de entradas/saídas.</p>
      </div>

      <Card className="boutique-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 pb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por nome ou SKU..."
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
                  <TableHead className="pl-6 py-4">Produto</TableHead>
                  <TableHead>Variações / Estoque</TableHead>
                  <TableHead className="text-right pr-6">Ações Rápidas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-boutique-rose/5 transition-colors border-b border-gray-50">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package className="text-gray-300" size={20} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-boutique-dark">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.sku || 'Sem SKU'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {product.variations.map(v => (
                          <Badge 
                            key={v.id} 
                            variant="outline" 
                            className={cn(
                              "px-3 py-1 rounded-lg border-boutique-rose/50",
                              v.quantity < 3 ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-boutique-dark"
                            )}
                          >
                            {v.color} {v.size}: <span className="font-bold ml-1">{v.quantity}</span>
                          </Badge>
                        ))}
                        {product.variations.length === 0 && (
                          <span className="text-xs text-gray-400 italic">Sem variações cadastradas</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Dialog open={isMovementOpen && selectedProduct?.id === product.id} onOpenChange={(open) => {
                          if (!open) setIsMovementOpen(false);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-boutique-rose text-boutique-dark"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsMovementOpen(true);
                              }}
                            >
                              Ajustar Estoque
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[400px] rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-serif">Ajuste de Estoque</DialogTitle>
                              <DialogDescription>{product.name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              <div className="space-y-2">
                                <Label>Variação *</Label>
                                <Select onValueChange={(val) => setSelectedVar(product.variations.find(v => v.id === val) || null)}>
                                  <SelectTrigger className="rounded-xl border-gray-200">
                                    <SelectValue placeholder="Selecione a variação" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {product.variations.map(v => (
                                      <SelectItem key={v.id} value={v.id}>{v.color} / {v.size} ({v.quantity} un)</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <Button 
                                  type="button"
                                  variant={movementType === 'entry' ? 'default' : 'outline'}
                                  className={cn(
                                    "rounded-xl h-12 gap-2",
                                    movementType === 'entry' ? "bg-green-600 hover:bg-green-700" : "border-green-100 text-green-600"
                                  )}
                                  onClick={() => setMovementType('entry')}
                                >
                                  <Plus size={18} /> Entrada
                                </Button>
                                <Button 
                                  type="button"
                                  variant={movementType === 'exit' ? 'default' : 'outline'}
                                  className={cn(
                                    "rounded-xl h-12 gap-2",
                                    movementType === 'exit' ? "bg-red-600 hover:bg-red-700" : "border-red-100 text-red-600"
                                  )}
                                  onClick={() => setMovementType('exit')}
                                >
                                  <Minus size={18} /> Saída
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="moveQty">Quantidade *</Label>
                                <Input 
                                  id="moveQty" 
                                  type="number" 
                                  min="1"
                                  value={moveQty}
                                  onChange={(e) => setMoveQty(parseInt(e.target.value) || 1)}
                                  className="rounded-xl border-gray-200"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="reason">Motivo / Observação</Label>
                                <Input 
                                  id="reason" 
                                  placeholder="Ex: Reposição de estoque"
                                  value={moveReason}
                                  onChange={(e) => setMoveReason(e.target.value)}
                                  className="rounded-xl border-gray-200"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setIsMovementOpen(false)}>Cancelar</Button>
                              <Button onClick={handleMovement} className="boutique-button-primary px-8" disabled={isSubmitting || !selectedVar}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Ajuste'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
