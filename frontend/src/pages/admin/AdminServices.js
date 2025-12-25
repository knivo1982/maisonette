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
import { Plus, Edit, Trash2, Sparkles, Euro, Check } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'spiaggia', label: 'Spiaggia' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'trasporti', label: 'Trasporti' },
  { value: 'esperienze', label: 'Esperienze' },
  { value: 'shop', label: 'Shop' }
];

const TIPO_INTERAZIONE = [
  { value: 'info', label: 'Solo Informativo' },
  { value: 'booking', label: 'Prenotabile' },
  { value: 'shop', label: 'Acquistabile' }
];

const ICONS = [
  { value: 'Umbrella', label: 'Ombrellone' },
  { value: 'Shirt', label: 'Biancheria' },
  { value: 'Car', label: 'Auto' },
  { value: 'Wifi', label: 'WiFi' },
  { value: 'Wine', label: 'Vino' },
  { value: 'Ship', label: 'Barca' },
  { value: 'ShoppingBag', label: 'Shopping' },
  { value: 'Coffee', label: 'Colazione' },
  { value: 'Sparkles', label: 'Altro' }
];

export default function AdminServices() {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    categoria: '',
    prezzo: '',
    gratuito: false,
    icona: '',
    immagine_url: '',
    disponibile: true,
    tipo_interazione: 'info',
    info_extra: ''
  });

  useEffect(() => {
    fetchServices();
  }, [token]);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/admin/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      prezzo: formData.prezzo ? parseFloat(formData.prezzo) : null
    };

    try {
      if (editingService) {
        await axios.put(`${API}/admin/services/${editingService.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Servizio aggiornato!');
      } else {
        await axios.post(`${API}/admin/services`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Servizio creato!');
      }
      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo servizio?')) return;
    try {
      await axios.delete(`${API}/admin/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Servizio eliminato!');
      fetchServices();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (service) => {
    setEditingService(service);
    setFormData({
      nome: service.nome,
      descrizione: service.descrizione,
      categoria: service.categoria,
      prezzo: service.prezzo?.toString() || '',
      gratuito: service.gratuito,
      icona: service.icona || '',
      immagine_url: service.immagine_url || '',
      disponibile: service.disponibile,
      tipo_interazione: service.tipo_interazione || 'info',
      info_extra: service.info_extra || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      nome: '',
      descrizione: '',
      categoria: '',
      prezzo: '',
      gratuito: false,
      icona: '',
      immagine_url: '',
      disponibile: true,
      tipo_interazione: 'info',
      info_extra: ''
    });
  };

  return (
    <AdminLayout title="Gestione Servizi">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {services.length} servizi totali
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white" data-testid="add-service-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Servizio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-cinzel">
                {editingService ? 'Modifica Servizio' : 'Nuovo Servizio'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="font-manrope">Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  data-testid="service-nome"
                />
              </div>
              <div>
                <Label className="font-manrope">Descrizione</Label>
                <Textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                  required
                  data-testid="service-descrizione"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-manrope">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                    <SelectTrigger data-testid="service-categoria">
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
                  <Label className="font-manrope">Icona</Label>
                  <Select value={formData.icona} onValueChange={(v) => setFormData({...formData, icona: v})}>
                    <SelectTrigger data-testid="service-icona">
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICONS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-sm">
                <div>
                  <Label className="font-manrope">Servizio Gratuito</Label>
                  <p className="text-xs text-[#4A5568]">Attiva se il servizio è incluso</p>
                </div>
                <Switch
                  checked={formData.gratuito}
                  onCheckedChange={(checked) => setFormData({...formData, gratuito: checked, prezzo: checked ? '' : formData.prezzo})}
                  data-testid="service-gratuito"
                />
              </div>
              {!formData.gratuito && (
                <div>
                  <Label className="font-manrope">Prezzo (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prezzo}
                    onChange={(e) => setFormData({...formData, prezzo: e.target.value})}
                    placeholder="Lascia vuoto per 'su richiesta'"
                    data-testid="service-prezzo"
                  />
                </div>
              )}
              <div>
                <Label className="font-manrope">URL Immagine (opzionale)</Label>
                <Input
                  value={formData.immagine_url}
                  onChange={(e) => setFormData({...formData, immagine_url: e.target.value})}
                  placeholder="https://..."
                  data-testid="service-immagine"
                />
              </div>
              <div>
                <Label className="font-manrope">Tipo Interazione</Label>
                <Select value={formData.tipo_interazione} onValueChange={(v) => setFormData({...formData, tipo_interazione: v})}>
                  <SelectTrigger data-testid="service-tipo">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_INTERAZIONE.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#4A5568] mt-1">Info = solo visibile, Prenotabile = cliente può prenotare</p>
              </div>
              <div>
                <Label className="font-manrope">Info Extra (es. Password WiFi)</Label>
                <Input
                  value={formData.info_extra}
                  onChange={(e) => setFormData({...formData, info_extra: e.target.value})}
                  placeholder="es. MaisonettePaestum2024"
                  data-testid="service-info-extra"
                />
                <p className="text-xs text-[#4A5568] mt-1">Visibile agli ospiti con check-in attivo</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-sm">
                <div>
                  <Label className="font-manrope">Disponibile</Label>
                  <p className="text-xs text-[#4A5568]">Mostra ai clienti</p>
                </div>
                <Switch
                  checked={formData.disponibile}
                  onCheckedChange={(checked) => setFormData({...formData, disponibile: checked})}
                  data-testid="service-disponibile"
                />
              </div>
              <Button type="submit" className="w-full bg-[#C5A059] hover:bg-[#B08D45]" data-testid="save-service-btn">
                {editingService ? 'Salva Modifiche' : 'Crea Servizio'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : services.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessun servizio. Clicca "Nuovo Servizio" per iniziare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <Card key={service.id} className="border-[#E2E8F0]" data-testid={`service-row-${service.id}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${service.disponibile ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded uppercase">
                        {CATEGORIES.find(c => c.value === service.categoria)?.label || service.categoria}
                      </span>
                      <h3 className="font-cinzel text-lg text-[#1A202C]">{service.nome}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#4A5568]">
                      {service.gratuito ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="w-4 h-4" />
                          Gratuito
                        </span>
                      ) : service.prezzo ? (
                        <span className="flex items-center gap-1">
                          <Euro className="w-4 h-4 text-[#C5A059]" />
                          {service.prezzo.toFixed(2)}
                        </span>
                      ) : (
                        <span>Su richiesta</span>
                      )}
                      {service.info_extra && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          🔑 {service.info_extra}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(service)} data-testid={`edit-service-${service.id}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(service.id)} data-testid={`delete-service-${service.id}`}>
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
