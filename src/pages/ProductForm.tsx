import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { CATEGORIES, Product } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, Package, Loader2, Upload, X as CloseIcon } from 'lucide-react';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0],
    price: '',
    sku: '',
    description: '',
    imageUrl: '',
    imagePath: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
              description: data.description || '',
              imageUrl: data.imageUrl || '',
              imagePath: data.imagePath || ''
            });
            if (data.imageUrl) setImagePreview(data.imageUrl);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de imagem inválido. Use JPG, PNG ou WebP.');
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (productId: string): Promise<{ url: string; path: string }> => {
    if (!selectedFile) return { url: formData.imageUrl, path: formData.imagePath };

    // Delete old image if exists
    if (formData.imagePath) {
      try {
        const oldImageRef = ref(storage, formData.imagePath);
        await deleteObject(oldImageRef);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }

    const fileExtension = selectedFile.name.split('.').pop();
    const filePath = `products/${productId}/${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          toast.error('Erro no upload da imagem.');
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadURL, path: filePath });
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrl = formData.imageUrl;
      let finalImagePath = formData.imagePath;

      if (isEditing) {
        if (selectedFile) {
          const { url, path } = await uploadImage(id!);
          finalImageUrl = url;
          finalImagePath = path;
        }

        const productData = {
          ...formData,
          imageUrl: finalImageUrl,
          imagePath: finalImagePath,
          price: Number(formData.price),
          updatedAt: Timestamp.now()
        };

        await updateDoc(doc(db, 'products', id), productData);
        toast.success('Produto atualizado com sucesso!');
        navigate(`/produtos/${id}`);
      } else {
        const batch = writeBatch(db);
        const productRef = doc(collection(db, 'products'));
        
        if (selectedFile) {
          const { url, path } = await uploadImage(productRef.id);
          finalImageUrl = url;
          finalImagePath = path;
        }

        const productData = {
          ...formData,
          imageUrl: finalImageUrl,
          imagePath: finalImagePath,
          price: Number(formData.price),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        batch.set(productRef, productData);

        // Add initial variations if any
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
      setUploadProgress(null);
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
      <Loader2 className="w-10 h-10 text-boutique-gold animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-boutique-rose/30">
          <ArrowLeft size={24} />
        </Button>
        <div>
          <h2 className="text-3xl font-serif font-bold text-boutique-dark">
            {isEditing ? 'Editar Peça' : 'Nova Peça'}
          </h2>
          <p className="text-gray-500">Preencha os detalhes da peça para o catálogo.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <Card className="lg:col-span-2 boutique-card border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Peça</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Vestido Midi Floral"
                    className="h-12 rounded-xl border-gray-200 focus:ring-boutique-rose"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Código</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: VEST-001"
                    className="h-12 rounded-xl border-gray-200 focus:ring-boutique-rose"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-gray-200">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço de Venda (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    placeholder="0,00"
                    className="h-12 rounded-xl border-gray-200 focus:ring-boutique-rose"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes sobre o tecido, caimento, etc."
                  className="min-h-[120px] rounded-xl border-gray-200 focus:ring-boutique-rose"
                />
              </div>
            </CardContent>
          </Card>

          {/* Media Info */}
          <Card className="boutique-card border-none shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Mídia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div 
                className="aspect-[3/4] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:border-boutique-rose/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(null);
                          setSelectedFile(null);
                          setFormData({...formData, imageUrl: '', imagePath: ''});
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <Upload className="mx-auto text-gray-300 mb-2" size={48} />
                    <p className="text-xs text-gray-400 font-medium">Clique para selecionar uma foto</p>
                    <p className="text-[10px] text-gray-300 mt-1">JPG, PNG ou WebP (Máx 2MB)</p>
                  </div>
                )}
                
                {uploadProgress !== null && (
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center p-6">
                    <Loader2 className="w-8 h-8 text-boutique-gold animate-spin mb-2" />
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                      <div className="bg-boutique-gold h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="text-[10px] font-bold text-boutique-gold">{Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Ou use uma URL externa</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="rounded-xl border-gray-200"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Variations Section (Only on creation) */}
        {!isEditing && (
          <Card className="boutique-card border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-serif">Estoque Inicial</CardTitle>
                <CardDescription>Adicione as variações de cor e tamanho desta peça.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addVariation} className="border-boutique-rose text-boutique-dark gap-2 rounded-xl">
                <Plus size={18} />
                Adicionar Variação
              </Button>
            </CardHeader>
            <CardContent>
              {variations.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                  <p className="text-sm text-gray-400">Nenhuma variação adicionada ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variations.map((v, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl relative group animate-in zoom-in-95 duration-200">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400">Cor</Label>
                        <Input 
                          placeholder="Ex: Preto" 
                          value={v.color} 
                          onChange={(e) => updateVariation(index, 'color', e.target.value)}
                          className="bg-white border-none rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400">Tamanho</Label>
                        <Input 
                          placeholder="Ex: M" 
                          value={v.size} 
                          onChange={(e) => updateVariation(index, 'size', e.target.value)}
                          className="bg-white border-none rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400">Quantidade</Label>
                        <Input 
                          type="number" 
                          value={v.quantity} 
                          onChange={(e) => updateVariation(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="bg-white border-none rounded-xl"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeVariation(index)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 size={20} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="px-8 rounded-xl">
            Cancelar
          </Button>
          <Button type="submit" className="boutique-button-primary px-12 h-14 rounded-2xl shadow-xl shadow-boutique-dark/20" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={20} />}
            {isEditing ? 'Salvar Alterações' : 'Finalizar Cadastro'}
          </Button>
        </div>
      </form>
    </div>
  );
}
