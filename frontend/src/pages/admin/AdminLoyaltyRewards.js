import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Gift, Wine, ShoppingBag, Compass, Home } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'bevande', label: '🍾 Bevande', icon: Wine },
  { value: 'gastronomia', label: '🧺 Gastronomia', icon: ShoppingBag },
  { value: 'esperienze', label: '🎯 Esperienze', icon: Compass },
  { value: 'soggiorni', label: '🏠 Soggiorni', icon: Home },
];

export default function AdminLoyaltyRewards() {
  const { token } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    punti_richiesti: 30,
    immagine_url: '',
    categoria: 'bevande',
    disponibile: true,
    ordine: 0
  });

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await axios.get(`${API}/admin/loyalty-rewards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRewards(response.data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReward) {
        await axios.put(`${API}/admin/loyalty-rewards/${editingReward.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Premio aggiornato!');
      } else {
        await axios.post(`${API}/admin/loyalty-rewards`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Premio creato!');
      }
      setDialogOpen(false);
      resetForm();
      fetchRewards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo premio?')) return;
    try {
      await axios.delete(`${API}/admin/loyalty-rewards/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Premio eliminato!');
      fetchRewards();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (reward) => {
    setEditingReward(reward);
    setFormData({
      nome: reward.nome,
      descrizione: reward.descrizione,
      punti_richiesti: reward.punti_richiesti,
      immagine_url: reward.immagine_url || '',
      categoria: reward.categoria || 'bevande',
      disponibile: reward.disponibile !== false,
      ordine: reward.ordine || 0
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingReward(null);
    setFormData({
      nome: '',
      descrizione: '',
      punti_richiesti: 30,
      immagine_url: '',
      categoria: 'bevande',
      disponibile: true,
      ordine: 0
    });
  };

  const getCategoryLabel = (categoria) => {
    const found = CATEGORIES.find(c => c.value === categoria);
    return found ? found.label : categoria;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-cinzel text-[#1A202C]">Gestione Premi Fedeltà</h1>
            <p className="text-[#4A5568] font-manrope text-sm mt-1">
              Gestisci i premi del programma fedeltà
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#C5A059] hover:bg-[#B08D45]"
                onClick={resetForm}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Premio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-cinzel">
                  {editingReward ? 'Modifica Premio' : 'Nuovo Premio'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome Premio *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    placeholder="Es. Bottiglia di Spumante"
                  />
                </div>
                <div>
                  <Label>Descrizione *</Label>
                  <Textarea
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    required
                    rows={2}
                    placeholder="Descrivi il premio..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Punti Richiesti *</Label>
                    <Input
                      type="number"
                      value={formData.punti_richiesti}
                      onChange={(e) => setFormData({ ...formData, punti_richiesti: parseInt(e.target.value) || 0 })}
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>URL Immagine (opzionale)</Label>
                  <Input
                    value={formData.immagine_url}
                    onChange={(e) => setFormData({ ...formData, immagine_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ordine</Label>
                    <Input
                      type="number"
                      value={formData.ordine}
                      onChange={(e) => setFormData({ ...formData, ordine: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="disponibile"
                      checked={formData.disponibile}
                      onChange={(e) => setFormData({ ...formData, disponibile: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="disponibile" className="mb-0">Disponibile</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                    {editingReward ? 'Aggiorna' : 'Crea'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059] mx-auto"></div>
          </div>
        ) : rewards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-[#4A5568]">Nessun premio creato</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <Card key={reward.id} className={!reward.disponibile ? 'opacity-60' : ''}>
                <CardContent className="py-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {reward.categoria === 'bevande' && '🍾'}
                        {reward.categoria === 'gastronomia' && '🧺'}
                        {reward.categoria === 'esperienze' && '🎯'}
                        {reward.categoria === 'soggiorni' && '🏠'}
                        {!reward.categoria && '🎁'}
                      </span>
                      <span className="text-xs bg-[#C5A059]/20 text-[#C5A059] px-2 py-0.5 rounded">
                        {getCategoryLabel(reward.categoria)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(reward)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(reward.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">
                    {reward.nome}
                    {!reward.disponibile && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        Non disponibile
                      </span>
                    )}
                  </h3>
                  <p className="font-manrope text-sm text-[#4A5568] mb-4 line-clamp-2">
                    {reward.descrizione}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="font-manrope text-sm text-[#4A5568]">Punti richiesti</span>
                    <span className="font-cinzel text-2xl text-[#C5A059]">{reward.punti_richiesti}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
