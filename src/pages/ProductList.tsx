import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Variation, CATEGORIES } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Filter, ChevronRight, Image as ImageIcon, Edit2, Check, X, Trash2, MoreHorizontal, ShoppingBag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

export default function ProductList() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<(Product & { totalStock: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; price: number; category: string }>({ name: '', price: 0, category: '' });
  const navigate = useNavigate();

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
      console.log(`Iniciando exclusão do produto: ${product.id} (${product.name})`);
      
      // 1. Delete variations
      console.log('Buscando variações para excluir...');
      const varSnapshot = await getDocs(collection(db, 'products', product.id, 'variations'));
      const batch = writeBatch(db);
      
      console.log(`Encontradas ${varSnapshot.size} variações.`);
      varSnapshot.forEach(vDoc => {
        batch.delete(vDoc.ref);
      });

      // 2. Delete product document
      console.log('Adicionando exclusão do produto ao batch.');
      batch.delete(doc(db, 'products', product.id));
      
      await batch.commit();
      console.log('Batch de exclusão executado com sucesso.');
      
      toast.success('Produto excluído com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('ERRO CRÍTICO NA EXCLUSÃO:', error);
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
      <div className="w-10 h-10 border-4 border-boutique-rose border-t-boutique-gold rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-boutique-dark">Estoque de Peças</h2>
          <p className="text-gray-500 mt-1">Gerencie seu catálogo e níveis de estoque.</p>
        </div>
        {hasPermission('create_products') && (
          <Link to="/produtos/novo">
            <Button className="boutique-button-primary gap-2 h-12 px-6 rounded-2xl shadow-lg shadow-boutique-dark/10">
              <Plus size={20} />
              Cadastrar Nova Peça
            </Button>
          </Link>
        )}
      </div>

      <Card className="boutique-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 pb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Buscar por nome ou SKU..."
                className="pl-12 h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-boutique-rose/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-12 bg-gray-50 border-none rounded-2xl">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <SelectValue placeholder="Categoria" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
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
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="pl-6 py-4 min-w-[200px]">Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="text-center">Estoque Total</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <ShoppingBag size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhum produto encontrado</p>
                        <p className="text-sm">Tente ajustar seus filtros ou busca.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="group hover:bg-boutique-rose/5 transition-colors border-b border-gray-50">
                      <TableCell className="pl-6 py-4">
                        {editingId === product.id ? (
                          <Input 
                            value={editValues.name} 
                            onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                            className="h-9 max-w-[200px]"
                          />
                        ) : (
                          <div>
                            <p className="font-bold text-boutique-dark">{product.name}</p>
                            <p className="text-xs text-gray-400 font-mono uppercase">{product.sku || 'Sem SKU'}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === product.id ? (
                          <Select 
                            value={editValues.category} 
                            onValueChange={(val) => setEditValues({...editValues, category: val})}
                          >
                            <SelectTrigger className="h-9 w-[150px] bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="bg-boutique-rose/30 text-boutique-dark hover:bg-boutique-rose/50 border-none px-3">
                            {product.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === product.id ? (
                          <Input 
                            type="number"
                            value={editValues.price} 
                            onChange={(e) => setEditValues({...editValues, price: Number(e.target.value)})}
                            className="h-9 w-24"
                          />
                        ) : (
                          <span className="font-semibold text-boutique-dark">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "px-3 py-1 text-sm font-bold",
                          product.totalStock < 5 ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                        )}>
                          {product.totalStock} un
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === product.id ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleSaveEdit(product.id)}>
                                <Check size={18} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setEditingId(null)}>
                                <X size={18} />
                              </Button>
                            </>
                          ) : (
                            <>
                              {hasPermission('edit_products') && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-boutique-gold opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleStartEdit(product)}>
                                  <Edit2 size={18} />
                                </Button>
                              )}
                              {hasPermission('excluir_products') && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(product)}>
                                  <Trash2 size={18} />
                                </Button>
                              )}
                              <Link to={`/produtos/${product.id}`}>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-boutique-gold hover:bg-boutique-rose/30 rounded-full">
                                  <ChevronRight size={20} />
                                </Button>
                              </Link>
                            </>
                          )}
                        </div>
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
