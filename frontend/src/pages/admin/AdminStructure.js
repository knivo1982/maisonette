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
import { Plus, Edit, Trash2, Image, Settings, Wifi, Car, Coffee, Sun, Waves, TreePine, Wind, Tv } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('gallery');
  const [gallery, setGallery] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState(null);
  const [editingAmenity, setEditingAmenity] = useState(null);
  
  // Forms
  const [galleryForm, setGalleryForm] = useState({
    titolo: '', url: '', descrizione: '', ordine: 0, attivo: true
  });
  const [amenityForm, setAmenityForm] = useState({
    nome: '', descrizione: '', icona: 'wifi', ordine: 0, attivo: true
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [galleryRes, amenitiesRes] = await Promise.all([
        axios.get(`${API}/admin/gallery`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/amenities`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setGallery(galleryRes.data);
      setAmenities(amenitiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
            Gestisci galleria immagini e servizi della struttura
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {[
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
                        {galleryForm.url && (
                          <div className="rounded-lg overflow-hidden border">
                            <img src={galleryForm.url} alt="Preview" className="w-full h-40 object-cover" />
                          </div>
                        )}
                        <div>
                          <Label>Descrizione</Label>
                          <Textarea
                            value={galleryForm.descrizione}
                            onChange={(e) => setGalleryForm({ ...galleryForm, descrizione: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Ordine</Label>
                            <Input
                              type="number"
                              value={galleryForm.ordine}
                              onChange={(e) => setGalleryForm({ ...galleryForm, ordine: parseInt(e.target.value) || 0 })}
                              min={0}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input
                              type="checkbox"
                              checked={galleryForm.attivo}
                              onChange={(e) => setGalleryForm({ ...galleryForm, attivo: e.target.checked })}
                            />
                            <Label>Attiva</Label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setGalleryDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                            {editingGallery ? 'Aggiorna' : 'Aggiungi'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {gallery.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-[#4A5568]">Nessuna immagine nella galleria</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gallery.map((image) => (
                      <Card key={image.id} className={!image.attivo ? 'opacity-60' : ''}>
                        <div className="h-40 overflow-hidden">
                          <img src={image.url} alt={image.titolo} className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-[#1A202C]">
                                {image.titolo}
                                {!image.attivo && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Off</span>
                                )}
                              </h3>
                              {image.descrizione && (
                                <p className="text-sm text-[#4A5568] mt-1 line-clamp-2">{image.descrizione}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditGallery(image)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteGalleryImage(image.id)}>
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
                          <Label>Descrizione *</Label>
                          <Textarea
                            value={amenityForm.descrizione}
                            onChange={(e) => setAmenityForm({ ...amenityForm, descrizione: e.target.value })}
                            required
                            rows={2}
                            placeholder="Es. Connessione veloce in tutta la struttura"
                          />
                        </div>
                        <div>
                          <Label>Icona</Label>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {ICONS.map(icon => {
                              const IconComp = icon.icon;
                              return (
                                <button
                                  key={icon.value}
                                  type="button"
                                  onClick={() => setAmenityForm({ ...amenityForm, icona: icon.value })}
                                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                                    amenityForm.icona === icon.value 
                                      ? 'border-[#C5A059] bg-[#C5A059]/10' 
                                      : 'border-gray-200 hover:border-[#C5A059]/50'
                                  }`}
                                >
                                  <IconComp className="w-5 h-5" />
                                  <span className="text-xs">{icon.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Ordine</Label>
                            <Input
                              type="number"
                              value={amenityForm.ordine}
                              onChange={(e) => setAmenityForm({ ...amenityForm, ordine: parseInt(e.target.value) || 0 })}
                              min={0}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input
                              type="checkbox"
                              checked={amenityForm.attivo}
                              onChange={(e) => setAmenityForm({ ...amenityForm, attivo: e.target.checked })}
                            />
                            <Label>Attivo</Label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setAmenityDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                            {editingAmenity ? 'Aggiorna' : 'Aggiungi'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {amenities.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-[#4A5568]">Nessun servizio configurato</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {amenities.map((amenity) => (
                      <Card key={amenity.id} className={!amenity.attivo ? 'opacity-60' : ''}>
                        <CardContent className="py-6 text-center">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                            amenity.attivo ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {getIconComponent(amenity.icona)}
                          </div>
                          <h3 className="font-medium text-[#1A202C]">
                            {amenity.nome}
                          </h3>
                          <p className="text-sm text-[#4A5568] mt-1">{amenity.descrizione}</p>
                          <div className="flex justify-center gap-2 mt-4">
                            <Button size="sm" variant="ghost" onClick={() => openEditAmenity(amenity)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteAmenity(amenity.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
