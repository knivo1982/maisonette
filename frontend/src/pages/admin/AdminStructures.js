import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, MapPin, Phone, Clock, Navigation } from 'lucide-react';

import { API } from '../../lib/api';

const TYPES = [
  { value: 'farmacia', label: 'Farmacia' },
  { value: 'banca', label: 'Banca' },
  { value: 'atm', label: 'ATM' },
  { value: 'museo', label: 'Museo' },
  { value: 'parco', label: 'Parco' },
  { value: 'ristorante', label: 'Ristorante' },
  { value: 'spiaggia', label: 'Spiaggia' },
  { value: 'altro', label: 'Altro' }
];

const CATEGORIES = [
  { value: 'cultura', label: 'Cultura' },
  { value: 'natura', label: 'Natura' },
  { value: 'gastronomia', label: 'Gastronomia' },
  { value: 'servizi', label: 'Servizi' },
  { value: 'shopping', label: 'Shopping' }
];

export default function AdminStructures() {
  const { token } = useAuth();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    categoria: '',
    indirizzo: '',
    telefono: '',
    orari: '',
    descrizione: '',
    latitudine: '',
    longitudine: '',
    distanza: '',
    immagine_url: ''
  });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      const response = await axios.get(`${API}/structures`);
      setStructures(response.data);
    } catch (error) {
      console.error('Error fetching structures:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateCoordinates = async () => {
    try {
      const response = await axios.post(`${API}/admin/structures/populate-coordinates`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${response.data.message}`);
      fetchStructures();
    } catch (error) {
      toast.error('Errore durante il popolamento delle coordinate');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        latitudine: formData.latitudine ? parseFloat(formData.latitudine) : null,
        longitudine: formData.longitudine ? parseFloat(formData.longitudine) : null
      };
      
      if (editingStructure) {
        await axios.put(`${API}/admin/structures/${editingStructure.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Struttura aggiornata!');
      } else {
        await axios.post(`${API}/admin/structures`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Struttura creata!');
      }
      setDialogOpen(false);
      resetForm();
      fetchStructures();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa struttura?')) return;
    try {
      await axios.delete(`${API}/admin/structures/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Struttura eliminata!');
      fetchStructures();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (structure) => {
    setEditingStructure(structure);
    setFormData({
      nome: structure.nome || '',
      tipo: structure.tipo || '',
      categoria: structure.categoria || '',
      indirizzo: structure.indirizzo || '',
      telefono: structure.telefono || '',
      orari: structure.orari || '',
      descrizione: structure.descrizione || '',
      latitudine: structure.latitudine?.toString() || '',
      longitudine: structure.longitudine?.toString() || '',
      distanza: structure.distanza || '',
      immagine_url: structure.immagine_url || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStructure(null);
    setFormData({
      nome: '',
      tipo: '',
      categoria: '',
      indirizzo: '',
      telefono: '',
      orari: '',
      descrizione: '',
      latitudine: '',
      longitudine: '',
      distanza: '',
      immagine_url: ''
    });
  };

  return (
    <AdminLayout title="Gestione Territorio">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {structures.length} punti di interesse
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Punto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-cinzel">
                {editingStructure ? 'Modifica' : 'Nuovo Punto di Interesse'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  placeholder="Es. Museo Archeologico"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria (per mappa)</Label>
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
              </div>

              <div>
                <Label>Indirizzo</Label>
                <Input
                  value={formData.indirizzo}
                  onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
                  placeholder="Via Roma 1, Paestum"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefono</Label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    placeholder="0828 123456"
                  />
                </div>
                <div>
                  <Label>Orari</Label>
                  <Input
                    value={formData.orari}
                    onChange={(e) => setFormData({...formData, orari: e.target.value})}
                    placeholder="Lun-Ven 9:00-18:00"
                  />
                </div>
              </div>

              <div>
                <Label>Descrizione</Label>
                <Textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitudine}
                    onChange={(e) => setFormData({...formData, latitudine: e.target.value})}
                    placeholder="40.4208"
                  />
                </div>
                <div>
                  <Label>Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitudine}
                    onChange={(e) => setFormData({...formData, longitudine: e.target.value})}
                    placeholder="15.0058"
                  />
                </div>
              </div>
              <p className="text-xs text-[#718096] -mt-2">
                Trova le coordinate su Google Maps (tasto destro → "Cosa c'è qui?")
              </p>

              <div>
                <Label>Distanza dalla Maisonette</Label>
                <Input
                  value={formData.distanza}
                  onChange={(e) => setFormData({...formData, distanza: e.target.value})}
                  placeholder="5 min a piedi"
                />
              </div>

              <div>
                <Label>URL Immagine</Label>
                <Input
                  value={formData.immagine_url}
                  onChange={(e) => setFormData({...formData, immagine_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <Button type="submit" className="w-full bg-[#C5A059] hover:bg-[#B08D45]">
                {editingStructure ? 'Salva Modifiche' : 'Crea Punto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
        </div>
      ) : structures.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessun punto di interesse. Clicca "Nuovo Punto" per iniziare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {structures.map((structure) => (
            <Card key={structure.id} className="border-[#E2E8F0]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded uppercase">
                        {TYPES.find(t => t.value === structure.tipo)?.label || structure.tipo}
                      </span>
                      {structure.categoria && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">
                          {CATEGORIES.find(c => c.value === structure.categoria)?.label || structure.categoria}
                        </span>
                      )}
                      {structure.latitudine && structure.longitudine && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                          📍 Su mappa
                        </span>
                      )}
                    </div>
                    <h3 className="font-cinzel text-lg text-[#1A202C] mb-1">{structure.nome}</h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-[#4A5568]">
                      {structure.indirizzo && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {structure.indirizzo}
                        </span>
                      )}
                      {structure.telefono && (
                        <a href={`tel:${structure.telefono}`} className="flex items-center gap-1 text-[#C5A059] hover:underline">
                          <Phone className="w-4 h-4" />
                          {structure.telefono}
                        </a>
                      )}
                      {structure.orari && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {structure.orari}
                        </span>
                      )}
                    </div>
                    
                    {structure.descrizione && (
                      <p className="text-sm text-[#718096] mt-2 line-clamp-2">{structure.descrizione}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openEditDialog(structure)}
                      className="border-[#C5A059] text-[#C5A059]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(structure.id)}
                      className="border-red-400 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
