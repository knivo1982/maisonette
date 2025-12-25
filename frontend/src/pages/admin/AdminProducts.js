import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Wine, Euro } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'vino', label: 'Vini' },
  { value: 'formaggi', label: 'Formaggi' },
  { value: 'olio', label: 'Olio' },
  { value: 'liquori', label: 'Liquori' },
  { value: 'specialita', label: 'Specialità' },
  { value: 'souvenir', label: 'Souvenir' }
];

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    categoria: '',
    prezzo: '',
    immagine_url: '',
    disponibile: true
  });

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/admin/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      prezzo: parseFloat(formData.prezzo)
    };

    try {
      if (editingProduct) {
        await axios.put(`${API}/admin/products/${editingProduct.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Prodotto aggiornato!');
      } else {
        await axios.post(`${API}/admin/products`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Prodotto creato!');
      }
      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo prodotto?')) return;
    try {
      await axios.delete(`${API}/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Prodotto eliminato!');
      fetchProducts();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setFormData({
      nome: product.nome,
      descrizione: product.descrizione || '',
      categoria: product.categoria,
      prezzo: product.prezzo.toString(),
      immagine_url: product.immagine_url || '',
      disponibile: product.disponibile
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      nome: '',
      descrizione: '',
      categoria: '',
      prezzo: '',
      immagine_url: '',
      disponibile: true
    });
  };

  return (
    <AdminLayout title="Gestione Prodotti">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {products.length} prodotti totali
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white" data-testid="add-product-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Prodotto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-cinzel">
                {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="font-manrope">Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label className="font-manrope">Descrizione</Label>
                <Textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-manrope">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-manrope">Prezzo (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prezzo}
                    onChange={(e) => setFormData({...formData, prezzo: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="font-manrope">URL Immagine</Label>
                <Input
                  value={formData.immagine_url}
                  onChange={(e) => setFormData({...formData, immagine_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-sm">
                <Label className="font-manrope">Disponibile</Label>
                <Switch
                  checked={formData.disponibile}
                  onCheckedChange={(checked) => setFormData({...formData, disponibile: checked})}
                />
              </div>
              <Button type="submit" className="w-full bg-[#C5A059] hover:bg-[#B08D45]">
                {editingProduct ? 'Salva Modifiche' : 'Crea Prodotto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <Wine className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessun prodotto. Clicca "Nuovo Prodotto" per iniziare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id} className="border-[#E2E8F0]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${product.disponibile ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded uppercase">
                        {CATEGORIES.find(c => c.value === product.categoria)?.label || product.categoria}
                      </span>
                      <h3 className="font-cinzel text-lg text-[#1A202C]">{product.nome}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#4A5568]">
                      <Euro className="w-4 h-4 text-[#C5A059]" />
                      <span>{product.prezzo.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
