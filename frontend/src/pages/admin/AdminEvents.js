import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar, MapPin, Clock } from 'lucide-react';

import { API } from '../../lib/api';

const CATEGORIES = [
  { value: 'musica', label: 'Musica' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'gastronomia', label: 'Gastronomia' },
  { value: 'sport', label: 'Sport' },
  { value: 'festa', label: 'Festa' },
  { value: 'mercato', label: 'Mercato' },
  { value: 'altro', label: 'Altro' }
];

export default function AdminEvents() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    titolo: '',
    titolo_en: '',
    descrizione: '',
    descrizione_en: '',
    data: '',
    data_fine: '',
    ora: '',
    ora_fine: '',
    luogo: '',
    luogo_en: '',
    indirizzo: '',
    immagine_url: '',
    categoria: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // Fetch all events including past ones for admin
      const response = await axios.get(`${API}/events?include_past=true`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        data_fine: formData.data_fine || formData.data // Se non specificata, usa data inizio
      };
      
      if (editingEvent) {
        await axios.put(`${API}/admin/events/${editingEvent.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Evento aggiornato!');
      } else {
        await axios.post(`${API}/admin/events`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Evento creato!');
      }
      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo evento?')) return;
    try {
      await axios.delete(`${API}/admin/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Evento eliminato!');
      fetchEvents();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (event) => {
    setEditingEvent(event);
    setFormData({
      titolo: event.titolo,
      titolo_en: event.titolo_en || '',
      descrizione: event.descrizione,
      descrizione_en: event.descrizione_en || '',
      data: event.data,
      data_fine: event.data_fine || '',
      ora: event.ora || '',
      ora_fine: event.ora_fine || '',
      luogo: event.luogo,
      luogo_en: event.luogo_en || '',
      indirizzo: event.indirizzo || '',
      immagine_url: event.immagine_url || '',
      categoria: event.categoria || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      titolo: '',
      titolo_en: '',
      descrizione: '',
      descrizione_en: '',
      data: '',
      data_fine: '',
      ora: '',
      ora_fine: '',
      luogo: '',
      luogo_en: '',
      indirizzo: '',
      immagine_url: '',
      categoria: ''
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const isEventPast = (event) => {
    const endDate = event.data_fine || event.data;
    return new Date(endDate) < new Date(new Date().toDateString());
  };

  return (
    <AdminLayout title="Gestione Eventi">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {events.length} eventi totali
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-cinzel">
                {editingEvent ? 'Modifica Evento' : 'Nuovo Evento'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Titolo *</Label>
                <Input
                  value={formData.titolo}
                  onChange={(e) => setFormData({...formData, titolo: e.target.value})}
                  required
                  placeholder="Nome dell'evento"
                />
              </div>
              <div>
                <Label>Titolo (Inglese) 🇬🇧</Label>
                <Input
                  value={formData.titolo_en}
                  onChange={(e) => setFormData({...formData, titolo_en: e.target.value})}
                  placeholder="Event name in English"
                />
              </div>
              
              <div>
                <Label>Descrizione</Label>
                <Textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label>Descrizione (Inglese) 🇬🇧</Label>
                <Textarea
                  value={formData.descrizione_en}
                  onChange={(e) => setFormData({...formData, descrizione_en: e.target.value})}
                  rows={3}
                  placeholder="Description in English"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Inizio *</Label>
                  <Input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Data Fine</Label>
                  <Input
                    type="date"
                    value={formData.data_fine}
                    onChange={(e) => setFormData({...formData, data_fine: e.target.value})}
                    min={formData.data}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lascia vuoto per eventi di 1 giorno</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ora Inizio</Label>
                  <Input
                    type="time"
                    value={formData.ora}
                    onChange={(e) => setFormData({...formData, ora: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Ora Fine</Label>
                  <Input
                    type="time"
                    value={formData.ora_fine}
                    onChange={(e) => setFormData({...formData, ora_fine: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Luogo *</Label>
                <Input
                  value={formData.luogo}
                  onChange={(e) => setFormData({...formData, luogo: e.target.value})}
                  required
                  placeholder="Es. Piazza del Tempio"
                />
              </div>

              <div>
                <Label>Indirizzo</Label>
                <Input
                  value={formData.indirizzo}
                  onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
                  placeholder="Via Roma 1, Paestum"
                />
              </div>

              <div>
                <Label>Categoria</Label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                >
                  <option value="">Seleziona...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
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
                {editingEvent ? 'Salva Modifiche' : 'Crea Evento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
        </div>
      ) : events.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessun evento. Clicca "Nuovo Evento" per iniziare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const isPast = isEventPast(event);
            return (
              <Card key={event.id} className={`border-[#E2E8F0] ${isPast ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {isPast && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            Passato
                          </span>
                        )}
                        {event.categoria && (
                          <span className="text-xs bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded uppercase">
                            {CATEGORIES.find(c => c.value === event.categoria)?.label || event.categoria}
                          </span>
                        )}
                      </div>
                      <h3 className="font-cinzel text-lg text-[#1A202C] mb-1">{event.titolo}</h3>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-[#4A5568]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-[#C5A059]" />
                          {formatDate(event.data)}
                          {event.data_fine && event.data_fine !== event.data && (
                            <> - {formatDate(event.data_fine)}</>
                          )}
                        </span>
                        {event.ora && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-[#C5A059]" />
                            {event.ora}
                            {event.ora_fine && <> - {event.ora_fine}</>}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-[#C5A059]" />
                          {event.luogo}
                        </span>
                      </div>
                      
                      {event.descrizione && (
                        <p className="text-sm text-[#718096] mt-2 line-clamp-2">{event.descrizione}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openEditDialog(event)}
                        className="border-[#C5A059] text-[#C5A059]"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDelete(event.id)}
                        className="border-red-400 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
