import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDocs, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Variation, CATEGORIES } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Filter, ChevronRight, Edit2, Check, X, Trash2, ShoppingBag, Package, Tag, ArrowUpRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductList() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<(Product & { totalStock: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; price: number; category: string }>({ name: '', price: 0, category: '' });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      const productsWithStock = await Promise.all(productsData.map(async (product) => {
        const varSnapshot = await getDocs(collection(db, 'products', product.id, 'variations'));
        const totalStock = varSnapshot.docs.reduce((acc, doc) => acc + (doc.data() as Variation).quantity, 0);
        return { ...product, totalStock };
      }));

      setProducts(productsWithStock);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleStartEdit = (product: Product) => {
    setEditingId(product.id);
    setEditValues({ name: product.name, price: product.price, category: product.category });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        name: editValues.name,
        price: Number(editValues.price),
        category: editValues.category
      });
      setEditingId(null);
      toast.success('Produto atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar produto.');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return;
    
    const toastId = toast.loading('Excluindo produto...');
    
    try {
      const varSnapshot = await getDocs(collection(db, 'products', product.id, 'variations'));
      const batch = writeBatch(db);
      
      varSnapshot.forEach(vDoc => {
        batch.delete(vDoc.ref);
      });

      batch.delete(doc(db, 'products', product.id));
      await batch.commit();
      
      toast.success('Produto excluído com sucesso!', { id: toastId });
    } catch (error: any) {
      toast.error(`Erro ao excluir produto: ${error.message || 'Erro desconhecido'}`, { id: toastId });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Package className="w-12 h-12 text-accent" />
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-serif font-bold tracking-tight">Catálogo de Peças</h1>
          <p className="text-muted-foreground mt-2 font-medium">Gestão centralizada de inventário e coleções</p>
        </motion.div>
        
        {hasPermission('create_products') && (
          <Link to="/produtos/novo">
            <Button className="boutique-button-primary gap-2 h-14 px-8 rounded-2xl shadow-xl shadow-primary/10 transition-all hover:scale-[1.02]">
              <Plus size={20} />
              Cadastrar Nova Peça
            </Button>
          </Link>
        )}
      </header>

      <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
        <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Pesquisar por nome ou SKU..."
                className="pl-12 h-12 bg-muted/20 border-border/30 rounded-2xl focus:ring-accent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[240px] h-12 bg-muted/20 border-border/30 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-accent" />
                  <SelectValue placeholder="Categoria" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                  <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coleção / Peça</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categorização</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor de Venda</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Volume em Estoque</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
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
                        {editingId === product.id ? (
                          <div className="relative">
                            <Input 
                              value={editValues.name} 
                              onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                              className="h-10 bg-muted/50 border-accent/50 rounded-lg text-sm"
                            />
                            <div className="text-[10px] mt-1 font-mono text-muted-foreground uppercase">{product.sku || 'Sem SKU'}</div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors shrink-0">
                              <Package size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-foreground">{product.name}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{product.sku || 'REF: NÃO INFORMADO'}</p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-5">
                        {editingId === product.id ? (
                          <Select 
                            value={editValues.category} 
                            onValueChange={(val) => setEditValues({...editValues, category: val})}
                          >
                            <SelectTrigger className="h-10 w-[180px] bg-muted/50 border-accent/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Tag size={12} className="text-accent" />
                            <span className="text-sm font-medium">{product.category}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-5 font-bold">
                        {editingId === product.id ? (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                            <Input 
                              type="number"
                              value={editValues.price} 
                              onChange={(e) => setEditValues({...editValues, price: Number(e.target.value)})}
                              className="h-10 pl-8 w-32 bg-muted/50 border-accent/50"
                            />
                          </div>
                        ) : (
                          <span className="text-accent text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <Badge variant="outline" className={cn(
                          "px-3 py-1 text-[11px] font-bold rounded-lg border-2",
                          product.totalStock < 5 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                        )}>
                          {product.totalStock} peças
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingId === product.id ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-green-500 hover:bg-green-500/10" onClick={() => handleSaveEdit(product.id)}>
                                <Check size={18} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => setEditingId(null)}>
                                <X size={18} />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {hasPermission('edit_products') && (
                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10" onClick={() => handleStartEdit(product)}>
                                  <Edit2 size={16} />
                                </Button>
                              )}
                              {hasPermission('excluir_products') && (
                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(product)}>
                                  <Trash2 size={16} />
                                </Button>
                              )}
                              <Link to={`/produtos/${product.id}`}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-accent hover:bg-accent/10">
                                  <ArrowUpRight size={18} />
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                        <ShoppingBag size={64} strokeWidth={1} />
                        <p className="text-xl font-serif">Nenhum produto em estoque</p>
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
