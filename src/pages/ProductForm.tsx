import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES, Product } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, Package, Loader2, Tag, DollarSign, FileText, LayoutGrid, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0],
    price: '',
    sku: '',
    description: ''
  });

  const [variations, setVariations] = useState<{ color: string; size: string; quantity: number }[]>([]);

  useEffect(() => {
    if (isEditing) {
      const fetchProduct = async () => {
        try {
          const docRef = doc(db, 'products', id);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            const data = snapshot.data() as Product;
            setFormData({
              name: data.name,
              category: data.category,
              price: data.price.toString(),
              sku: data.sku || '',
              description: data.description || ''
            });
          }
        } catch (error) {
          toast.error('Erro ao carregar produto.');
        } finally {
          setInitialLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        const productData = {
          ...formData,
          price: Number(formData.price),
          updatedAt: Timestamp.now()
        };

        await updateDoc(doc(db, 'products', id), productData);
        toast.success('Produto atualizado com sucesso!');
        navigate(`/produtos/${id}`);
      } else {
        const batch = writeBatch(db);
        const productRef = doc(collection(db, 'products'));
        
        const productData = {
          ...formData,
          price: Number(formData.price),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        batch.set(productRef, productData);

        variations.forEach(v => {
          const varRef = doc(collection(db, 'products', productRef.id, 'variations'));
          batch.set(varRef, {
            ...v,
            productId: productRef.id
          });
        });

        await batch.commit();
        toast.success('Produto cadastrado com sucesso!');
        navigate('/produtos');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  const addVariation = () => {
    setVariations([...variations, { color: '', size: '', quantity: 0 }]);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, field: string, value: any) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    setVariations(updated);
  };

  if (initialLoading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Loader2 className="w-12 h-12 text-accent" />
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-2xl w-12 h-12 bg-card border border-border/50 text-accent group shadow-sm">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-serif font-bold tracking-tight">
              {isEditing ? 'Ajuste de Catálogo' : 'Inserção no Catálogo'}
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">Curadoria e catalogação de peças premium</p>
          </motion.div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
            <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-8">
              <div className="flex items-center gap-3">
                <FileText className="text-accent" size={20} />
                <CardTitle className="text-xl font-serif">Especificações Técnicas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Nome da Peça</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Vestido de Seda Pura"
                    className="h-14 bg-muted/30 border-border/50 rounded-2xl focus:ring-accent transition-all font-medium text-lg px-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Referência / SKU</Label>
                  <div className="relative">
                     <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
                     <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="REF-0000"
                        className="h-14 pl-12 bg-muted/30 border-border/50 rounded-2xl focus:ring-accent transition-all font-mono"
                     />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Categoria de Estilo</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-14 bg-muted/30 border-border/50 rounded-2xl px-6">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Preço Sugerido</Label>
                  <div className="relative">
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">R$</span>
                     <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        placeholder="0,00"
                        className="h-14 pl-14 bg-muted/30 border-border/50 rounded-2xl focus:ring-accent transition-all font-black text-xl"
                     />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Notas de Curadoria</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o caimento, tecido e detalhes exclusivos..."
                  className="min-h-[160px] bg-muted/30 border-border/50 rounded-2xl focus:ring-accent transition-all p-6 text-base leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {!isEditing && (
            <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden">
              <CardHeader className="bg-card/50 backdrop-blur-sm border-b border-border/50 p-8 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="text-accent" size={20} />
                  <div>
                     <CardTitle className="text-xl font-serif">Mappeamento de Grade</CardTitle>
                     <CardDescription className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Estoque inicial configurado por variação</CardDescription>
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={addVariation} className="text-accent hover:bg-accent/10 h-10 px-4 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest">
                  <Plus size={16} />
                  Adicionar Item
                </Button>
              </CardHeader>
              <CardContent className="p-8">
                <AnimatePresence mode="popLayout">
                  {variations.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="text-center py-16 border-2 border-dashed border-border/50 rounded-3xl"
                    >
                      <Package className="mx-auto text-muted-foreground/20 mb-4" size={48} strokeWidth={1} />
                      <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest italic">Aguardando definição da grade</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-6">
                      {variations.map((v, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-muted/20 border border-border/50 rounded-2xl relative group"
                        >
                          <div className="space-y-2">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cor</Label>
                            <Input placeholder="Ex: Lavanda" value={v.color} onChange={(e) => updateVariation(index, 'color', e.target.value)} className="bg-background border-border/50 rounded-xl" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tamanho</Label>
                            <Input placeholder="Ex: M" value={v.size} onChange={(e) => updateVariation(index, 'size', e.target.value)} className="bg-background border-border/50 rounded-xl" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Volume</Label>
                            <Input type="number" value={v.quantity} onChange={(e) => updateVariation(index, 'quantity', parseInt(e.target.value) || 0)} className="bg-background border-border/50 rounded-xl font-bold" />
                          </div>
                          <div className="flex items-end justify-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeVariation(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl w-11 h-11 shrink-0">
                              <Trash2 size={20} />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
           <Card className="border-none shadow-xl shadow-foreground/[0.02] overflow-hidden sticky top-8">
              <CardHeader className="bg-accent text-accent-foreground p-8">
                 <CardTitle className="text-2xl font-serif">Publicação</CardTitle>
                 <CardDescription className="text-accent-foreground/70 font-medium mt-1">Revise os dados antes de consolidar no catálogo.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6 bg-card">
                 <div className="space-y-4">
                    <div className="flex justify-between text-sm py-2 border-b border-border/30">
                       <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Total Grade</span>
                       <span className="font-bold">{variations.length} tipos</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-border/30">
                       <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Volume Inicial</span>
                       <span className="font-bold">{variations.reduce((acc, v) => acc + v.quantity, 0)} un</span>
                    </div>
                    <div className="flex justify-between text-sm py-2">
                       <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Status Inicial</span>
                       <span className="text-green-500 font-bold uppercase text-[10px] tracking-widest">Disponível</span>
                    </div>
                 </div>

                 <div className="pt-6 space-y-3">
                    <Button type="submit" className="w-full boutique-button-primary h-16 rounded-2xl shadow-xl shadow-primary/20 text-lg gap-3" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                          <Check size={24} />
                          {isEditing ? 'Salvar Mudanças' : 'Finalizar Registro'}
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                      Descartar Alterações
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </div>
      </form>
    </div>
  );
}
