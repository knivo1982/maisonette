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
import { Plus, Edit, Trash2, MapPin, Sun, Cloud, CloudRain, Snowflake, Clock } from 'lucide-react';

import { API } from '../../lib/api';

const WEATHER_CONDITIONS = [
  { value: 'sunny', label: 'Soleggiato ☀️', icon: Sun },
  { value: 'cloudy', label: 'Nuvoloso ☁️', icon: Cloud },
  { value: 'rainy', label: 'Pioggia 🌧️', icon: CloudRain },
  { value: 'cold', label: 'Freddo ❄️', icon: Snowflake },
];

const CATEGORIES = [
  { value: 'spiaggia', label: '🏖️ Spiaggia' },
  { value: 'cultura', label: '🏛️ Cultura' },
  { value: 'natura', label: '🌿 Natura' },
  { value: 'gastronomia', label: '🍷 Gastronomia' },
  { value: 'relax', label: '💆 Relax' },
];

export default function AdminItineraries() {
  const { token } = useAuth();
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    condizione_meteo: 'sunny',
    categoria: 'cultura',
    luogo: '',
    durata: '',
    immagine_url: '',
    link_esterno: '',
    ordine: 0,
    attivo: true
  });

  useEffect(() => {
    fetchItineraries();
  }, []);

  const fetchItineraries = async () => {
    try {
      const response = await axios.get(`${API}/admin/itineraries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItineraries(response.data);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItinerary) {
        await axios.put(`${API}/admin/itineraries/${editingItinerary.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Itinerario aggiornato!');
      } else {
        await axios.post(`${API}/admin/itineraries`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Itinerario creato!');
      }
      setDialogOpen(false);
      resetForm();
      fetchItineraries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo itinerario?')) return;
    try {
      await axios.delete(`${API}/admin/itineraries/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Itinerario eliminato!');
      fetchItineraries();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (itinerary) => {
    setEditingItinerary(itinerary);
    setFormData({
      nome: itinerary.nome,
      descrizione: itinerary.descrizione,
      condizione_meteo: itinerary.condizione_meteo,
      categoria: itinerary.categoria,
      luogo: itinerary.luogo,
      durata: itinerary.durata || '',
      immagine_url: itinerary.immagine_url || '',
      link_esterno: itinerary.link_esterno || '',
      ordine: itinerary.ordine || 0,
      attivo: itinerary.attivo !== false
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItinerary(null);
    setFormData({
      nome: '',
      descrizione: '',
      condizione_meteo: 'sunny',
      categoria: 'cultura',
      luogo: '',
      durata: '',
      immagine_url: '',
      link_esterno: '',
      ordine: 0,
      attivo: true
    });
  };

  const getWeatherIcon = (condition) => {
    const found = WEATHER_CONDITIONS.find(w => w.value === condition);
    if (found) {
      const Icon = found.icon;
      return <Icon className="w-5 h-5" />;
    }
    return <Sun className="w-5 h-5" />;
  };

  const getWeatherLabel = (condition) => {
    const found = WEATHER_CONDITIONS.find(w => w.value === condition);
    return found ? found.label : condition;
  };

  const getCategoryLabel = (categoria) => {
    const found = CATEGORIES.find(c => c.value === categoria);
    return found ? found.label : categoria;
  };

  // Group itineraries by weather condition
  const groupedItineraries = WEATHER_CONDITIONS.map(condition => ({
    ...condition,
    items: itineraries.filter(i => i.condizione_meteo === condition.value)
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-cinzel text-[#1A202C]">Gestione Itinerari</h1>
            <p className="text-[#4A5568] font-manrope text-sm mt-1">
              Gestisci gli itinerari suggeriti in base al meteo
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#C5A059] hover:bg-[#B08D45]"
                onClick={resetForm}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Itinerario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-cinzel">
                  {editingItinerary ? 'Modifica Itinerario' : 'Nuovo Itinerario'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Itinerario *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      placeholder="Es. Spiagge del Cilento"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Descrizione *</Label>
                    <Textarea
                      value={formData.descrizione}
                      onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                      required
                      rows={3}
                      placeholder="Descrivi l'itinerario..."
                    />
                  </div>
                  <div>
                    <Label>Condizione Meteo *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={formData.condizione_meteo}
                      onChange={(e) => setFormData({ ...formData, condizione_meteo: e.target.value })}
                    >
                      {WEATHER_CONDITIONS.map(w => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Categoria *</Label>
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
                  <div>
                    <Label>Luogo *</Label>
                    <Input
                      value={formData.luogo}
                      onChange={(e) => setFormData({ ...formData, luogo: e.target.value })}
                      required
                      placeholder="Es. Paestum"
                    />
                  </div>
                  <div>
                    <Label>Durata</Label>
                    <Input
                      value={formData.durata}
                      onChange={(e) => setFormData({ ...formData, durata: e.target.value })}
                      placeholder="Es. 2-3 ore, Mezza giornata"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>URL Immagine</Label>
                    <Input
                      value={formData.immagine_url}
                      onChange={(e) => setFormData({ ...formData, immagine_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Link Esterno</Label>
                    <Input
                      value={formData.link_esterno}
                      onChange={(e) => setFormData({ ...formData, link_esterno: e.target.value })}
                      placeholder="Link a sito esterno (opzionale)"
                    />
                  </div>
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
                      id="attivo"
                      checked={formData.attivo}
                      onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="attivo" className="mb-0">Attivo</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                    {editingItinerary ? 'Aggiorna' : 'Crea'}
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
        ) : (
          <div className="space-y-8">
            {groupedItineraries.map((group) => (
              <Card key={group.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-cinzel text-lg">
                    <group.icon className={`w-5 h-5 ${
                      group.value === 'sunny' ? 'text-yellow-500' :
                      group.value === 'cloudy' ? 'text-gray-400' :
                      group.value === 'rainy' ? 'text-blue-500' :
                      'text-blue-300'
                    }`} />
                    {group.label}
                    <span className="text-sm font-normal text-[#4A5568] ml-2">
                      ({group.items.length} itinerari)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {group.items.length === 0 ? (
                    <p className="text-[#4A5568] text-sm italic">
                      Nessun itinerario per questa condizione meteo
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {group.items.map((itinerary) => (
                        <div
                          key={itinerary.id}
                          className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${
                            !itinerary.attivo ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-[#1A202C]">{itinerary.nome}</h4>
                              <span className="text-xs bg-[#C5A059]/20 text-[#C5A059] px-2 py-0.5 rounded">
                                {getCategoryLabel(itinerary.categoria)}
                              </span>
                              {!itinerary.attivo && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                  Disattivato
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#4A5568] mt-1 line-clamp-1">
                              {itinerary.descrizione}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-[#4A5568]">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {itinerary.luogo}
                              </span>
                              {itinerary.durata && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {itinerary.durata}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(itinerary)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(itinerary.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
