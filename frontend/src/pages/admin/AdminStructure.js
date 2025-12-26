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
import { Plus, Edit, Trash2, Image, Settings, Wifi, Car, Coffee, Sun, Waves, TreePine, Wind, Tv, Home, Users, Euro } from 'lucide-react';

import { API } from '../../lib/api';

const ICONS = [
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'car', label: 'Auto/Parcheggio', icon: Car },
  { value: 'coffee', label: 'Colazione', icon: Coffee },
  { value: 'sun', label: 'Terrazza/Sole', icon: Sun },
  { value: 'waves', label: 'Mare/Spiaggia', icon: Waves },
  { value: 'tree', label: 'Giardino/Natura', icon: TreePine },
  { value: 'wind', label: 'Aria Condizionata', icon: Wind },
  { value: 'tv', label: 'TV', icon: Tv },
];

export default function AdminStructure() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('units');
  const [gallery, setGallery] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState(null);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  
  // Forms
  const [galleryForm, setGalleryForm] = useState({
    titolo: '', url: '', descrizione: '', ordine: 0, attivo: true
  });
  const [amenityForm, setAmenityForm] = useState({
    nome: '', descrizione: '', icona: 'wifi', ordine: 0, attivo: true
  });
  const [unitForm, setUnitForm] = useState({
    nome: '', nome_en: '', descrizione: '', descrizione_en: '', capacita_max: 4, prezzo_base: 90, attivo: true
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [galleryRes, amenitiesRes, unitsRes] = await Promise.all([
        axios.get(`${API}/admin/gallery`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/amenities`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/units`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setGallery(galleryRes.data);
      setAmenities(amenitiesRes.data);
      setUnits(unitsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Unit handlers
  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await axios.put(`${API}/admin/units/${editingUnit.id}`, unitForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Casetta aggiornata!');
      } else {
        await axios.post(`${API}/admin/units`, unitForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Casetta creata!');
      }
      setUnitDialogOpen(false);
      resetUnitForm();
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const deleteUnit = async (id) => {
    if (!window.confirm('Eliminare questa casetta? Verranno eliminate anche le prenotazioni collegate.')) return;
    try {
      await axios.delete(`${API}/admin/units/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Casetta eliminata!');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'eliminazione');
    }
  };

  const openEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      nome: unit.nome,
      nome_en: unit.nome_en || '',
      descrizione: unit.descrizione || '',
      descrizione_en: unit.descrizione_en || '',
      capacita_max: unit.capacita_max,
      prezzo_base: unit.prezzo_base,
      attivo: unit.attivo !== false
    });
    setUnitDialogOpen(true);
  };

  const resetUnitForm = () => {
    setEditingUnit(null);
    setUnitForm({ nome: '', nome_en: '', descrizione: '', descrizione_en: '', capacita_max: 4, prezzo_base: 90, attivo: true });
  };

  // Gallery handlers
  const handleGallerySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGallery) {
        await axios.put(`${API}/admin/gallery/${editingGallery.id}`, galleryForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Immagine aggiornata!');
      } else {
        await axios.post(`${API}/admin/gallery`, galleryForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Immagine aggiunta!');
      }
      setGalleryDialogOpen(false);
      resetGalleryForm();
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const deleteGalleryImage = async (id) => {
    if (!window.confirm('Eliminare questa immagine?')) return;
    try {
      await axios.delete(`${API}/admin/gallery/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Immagine eliminata!');
      fetchAll();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const openEditGallery = (image) => {
    setEditingGallery(image);
    setGalleryForm({
      titolo: image.titolo,
      url: image.url,
      descrizione: image.descrizione || '',
      ordine: image.ordine || 0,
      attivo: image.attivo !== false
    });
    setGalleryDialogOpen(true);
  };

  const resetGalleryForm = () => {
    setEditingGallery(null);
    setGalleryForm({ titolo: '', url: '', descrizione: '', ordine: 0, attivo: true });
  };

  // Amenity handlers
  const handleAmenitySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAmenity) {
        await axios.put(`${API}/admin/amenities/${editingAmenity.id}`, amenityForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Servizio aggiornato!');
      } else {
        await axios.post(`${API}/admin/amenities`, amenityForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Servizio aggiunto!');
      }
      setAmenityDialogOpen(false);
      resetAmenityForm();
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const deleteAmenity = async (id) => {
    if (!window.confirm('Eliminare questo servizio?')) return;
    try {
      await axios.delete(`${API}/admin/amenities/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Servizio eliminato!');
      fetchAll();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const openEditAmenity = (amenity) => {
    setEditingAmenity(amenity);
    setAmenityForm({
      nome: amenity.nome,
      descrizione: amenity.descrizione,
      icona: amenity.icona || 'wifi',
      ordine: amenity.ordine || 0,
      attivo: amenity.attivo !== false
    });
    setAmenityDialogOpen(true);
  };

  const resetAmenityForm = () => {
    setEditingAmenity(null);
    setAmenityForm({ nome: '', descrizione: '', icona: 'wifi', ordine: 0, attivo: true });
  };

  const getIconComponent = (iconName) => {
    const found = ICONS.find(i => i.value === iconName);
    if (found) {
      const IconComp = found.icon;
      return <IconComp className="w-5 h-5" />;
    }
    return <Settings className="w-5 h-5" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-cinzel text-[#1A202C]">Gestione Struttura</h1>
          <p className="text-[#4A5568] font-manrope text-sm mt-1">
            Gestisci casette, galleria immagini e servizi della struttura
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {[
            { key: 'units', label: 'Casette', icon: Home },
            { key: 'gallery', label: 'Galleria Immagini', icon: Image },
            { key: 'amenities', label: 'Servizi', icon: Settings }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.key 
                  ? 'border-[#C5A059] text-[#C5A059]' 
                  : 'border-transparent text-[#4A5568] hover:text-[#C5A059]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059] mx-auto"></div>
          </div>
        ) : (
          <>
            {/* UNITS TAB */}
            {activeTab === 'units' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-cinzel text-xl">Le Tue Casette</h2>
                  <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#C5A059] hover:bg-[#B08D45]" onClick={resetUnitForm}>
                        <Plus className="w-4 h-4 mr-2" /> Nuova Casetta
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingUnit ? 'Modifica Casetta' : 'Nuova Casetta'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUnitSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nome (IT) *</Label>
                            <Input
                              value={unitForm.nome}
                              onChange={(e) => setUnitForm({ ...unitForm, nome: e.target.value })}
                              required
                              placeholder="Es. Casetta 1"
                            />
                          </div>
                          <div>
                            <Label>Name (EN)</Label>
                            <Input
                              value={unitForm.nome_en || ''}
                              onChange={(e) => setUnitForm({ ...unitForm, nome_en: e.target.value })}
                              placeholder="E.g. Cottage 1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Descrizione (IT)</Label>
                            <Textarea
                              value={unitForm.descrizione}
                              onChange={(e) => setUnitForm({ ...unitForm, descrizione: e.target.value })}
                              placeholder="Descrizione della casetta..."
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label>Description (EN)</Label>
                            <Textarea
                              value={unitForm.descrizione_en || ''}
                              onChange={(e) => setUnitForm({ ...unitForm, descrizione_en: e.target.value })}
                              placeholder="Cottage description..."
                              rows={3}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Capacità Max (ospiti)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={unitForm.capacita_max}
                              onChange={(e) => setUnitForm({ ...unitForm, capacita_max: parseInt(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Prezzo Base (€/notte)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={unitForm.prezzo_base}
                              onChange={(e) => setUnitForm({ ...unitForm, prezzo_base: parseFloat(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="unit_attivo"
                            checked={unitForm.attivo}
                            onChange={(e) => setUnitForm({ ...unitForm, attivo: e.target.checked })}
                            className="rounded"
                          />
                          <Label htmlFor="unit_attivo">Casetta attiva (visibile per prenotazioni)</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setUnitDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                            {editingUnit ? 'Salva' : 'Crea'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {units.length === 0 ? (
                  <div className="text-center py-12 bg-amber-50 rounded-lg border-2 border-dashed border-[#C5A059]">
                    <Home className="w-16 h-16 mx-auto text-[#C5A059] mb-4" />
                    <h3 className="font-cinzel text-xl text-[#1A202C] mb-2">Nessuna Casetta</h3>
                    <p className="text-[#4A5568] mb-4">Inizia creando la tua prima casetta per gestire le prenotazioni</p>
                    <Button 
                      className="bg-[#C5A059] hover:bg-[#B08D45]"
                      onClick={() => { resetUnitForm(); setUnitDialogOpen(true); }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Crea Prima Casetta
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {units.map((unit) => (
                      <Card key={unit.id} className="border-l-4 border-l-[#C5A059]">
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-cinzel text-lg">{unit.nome}</h3>
                                {unit.attivo ? (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Attiva</span>
                                ) : (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Disattivata</span>
                                )}
                              </div>
                              <p className="text-sm text-[#4A5568] mt-1">{unit.descrizione || 'Nessuna descrizione'}</p>
                              <div className="flex gap-4 mt-2 text-sm text-[#4A5568]">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" /> Max {unit.capacita_max} ospiti
                                </span>
                                <span className="flex items-center gap-1 text-[#C5A059] font-bold">
                                  <Euro className="w-4 h-4" /> {unit.prezzo_base}/notte
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditUnit(unit)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => deleteUnit(unit.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GALLERY TAB */}
            {activeTab === 'gallery' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-cinzel text-xl">Immagini Galleria</h2>
                  <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#C5A059] hover:bg-[#B08D45]" onClick={resetGalleryForm}>
                        <Plus className="w-4 h-4 mr-2" /> Aggiungi Immagine
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingGallery ? 'Modifica Immagine' : 'Nuova Immagine'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleGallerySubmit} className="space-y-4">
                        <div>
                          <Label>Titolo *</Label>
                          <Input
                            value={galleryForm.titolo}
                            onChange={(e) => setGalleryForm({ ...galleryForm, titolo: e.target.value })}
                            required
                            placeholder="Es. Camera Matrimoniale"
                          />
                        </div>
                        <div>
                          <Label>URL Immagine *</Label>
                          <Input
                            value={galleryForm.url}
                            onChange={(e) => setGalleryForm({ ...galleryForm, url: e.target.value })}
                            required
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <Label>Descrizione</Label>
                          <Textarea
                            value={galleryForm.descrizione}
                            onChange={(e) => setGalleryForm({ ...galleryForm, descrizione: e.target.value })}
                            placeholder="Descrizione opzionale..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setGalleryDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                            {editingGallery ? 'Salva' : 'Aggiungi'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {gallery.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Image className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nessuna immagine nella galleria</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {gallery.map((img) => (
                      <Card key={img.id}>
                        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                          <img src={img.url} alt={img.titolo} className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="py-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{img.titolo}</h3>
                              {img.descrizione && <p className="text-sm text-gray-500">{img.descrizione}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditGallery(img)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteGalleryImage(img.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AMENITIES TAB */}
            {activeTab === 'amenities' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-cinzel text-xl">Servizi della Struttura</h2>
                  <Dialog open={amenityDialogOpen} onOpenChange={setAmenityDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#C5A059] hover:bg-[#B08D45]" onClick={resetAmenityForm}>
                        <Plus className="w-4 h-4 mr-2" /> Aggiungi Servizio
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingAmenity ? 'Modifica Servizio' : 'Nuovo Servizio'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAmenitySubmit} className="space-y-4">
                        <div>
                          <Label>Nome *</Label>
                          <Input
                            value={amenityForm.nome}
                            onChange={(e) => setAmenityForm({ ...amenityForm, nome: e.target.value })}
                            required
                            placeholder="Es. WiFi Gratuito"
                          />
                        </div>
                        <div>
                          <Label>Descrizione</Label>
                          <Textarea
                            value={amenityForm.descrizione}
                            onChange={(e) => setAmenityForm({ ...amenityForm, descrizione: e.target.value })}
                            placeholder="Descrizione opzionale..."
                          />
                        </div>
                        <div>
                          <Label>Icona</Label>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {ICONS.map((icon) => (
                              <button
                                key={icon.value}
                                type="button"
                                onClick={() => setAmenityForm({ ...amenityForm, icona: icon.value })}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 ${
                                  amenityForm.icona === icon.value
                                    ? 'border-[#C5A059] bg-amber-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <icon.icon className="w-5 h-5" />
                                <span className="text-xs">{icon.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setAmenityDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                            {editingAmenity ? 'Salva' : 'Aggiungi'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {amenities.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nessun servizio configurato</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {amenities.map((amenity) => (
                      <Card key={amenity.id}>
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-amber-50 rounded-lg text-[#C5A059]">
                                {getIconComponent(amenity.icona)}
                              </div>
                              <div>
                                <h3 className="font-medium">{amenity.nome}</h3>
                                {amenity.descrizione && <p className="text-sm text-gray-500">{amenity.descrizione}</p>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditAmenity(amenity)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteAmenity(amenity.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
