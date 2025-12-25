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
import { Plus, Trash2, Bell, Send, Users, User, Gift, Calendar, Info, Star, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Informazione', icon: Info },
  { value: 'promo', label: 'Promozione', icon: Gift },
  { value: 'evento', label: 'Evento', icon: Calendar },
  { value: 'sistema', label: 'Sistema', icon: AlertCircle },
  { value: 'premio', label: 'Premio', icon: Star }
];

export default function AdminNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titolo: '',
    messaggio: '',
    tipo: 'info',
    destinatario_id: 'all',
    link: ''
  });

  useEffect(() => {
    fetchNotifications();
    fetchGuests();
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await axios.get(`${API}/admin/guests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuests(response.data.filter(g => !g.is_admin));
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      titolo: formData.titolo,
      messaggio: formData.messaggio,
      tipo: formData.tipo,
      destinatario_id: formData.destinatario_id === 'all' ? null : formData.destinatario_id,
      link: formData.link || null
    };

    try {
      if (formData.destinatario_id === 'all') {
        const response = await axios.post(`${API}/admin/notifications/broadcast`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(response.data.message);
      } else {
        await axios.post(`${API}/admin/notifications`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Notifica inviata!');
      }
      setDialogOpen(false);
      resetForm();
      fetchNotifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'invio');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa notifica?')) return;
    try {
      await axios.delete(`${API}/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Notifica eliminata!');
      fetchNotifications();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const resetForm = () => {
    setFormData({
      titolo: '',
      messaggio: '',
      tipo: 'info',
      destinatario_id: 'all',
      link: ''
    });
  };

  const getTimeAgo = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: it });
    } catch {
      return '';
    }
  };

  const getGuestName = (guestId) => {
    if (!guestId) return 'Tutti gli ospiti';
    const guest = guests.find(g => g.id === guestId);
    return guest ? `${guest.nome} ${guest.cognome}` : 'Ospite';
  };

  const TypeIcon = ({ tipo }) => {
    const type = NOTIFICATION_TYPES.find(t => t.value === tipo);
    const IconComponent = type?.icon || Info;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <AdminLayout title="Gestione Notifiche">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {notifications.length} notifiche totali
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Notifica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-cinzel flex items-center gap-2">
                <Send className="w-5 h-5 text-[#C5A059]" />
                Invia Notifica
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="font-manrope">Destinatario</Label>
                <Select 
                  value={formData.destinatario_id} 
                  onValueChange={(v) => setFormData({...formData, destinatario_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona destinatario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Tutti gli ospiti</span>
                      </div>
                    </SelectItem>
                    {guests.map((guest) => (
                      <SelectItem key={guest.id} value={guest.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{guest.nome} {guest.cognome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="font-manrope">Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(v) => setFormData({...formData, tipo: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-manrope">Titolo</Label>
                <Input
                  value={formData.titolo}
                  onChange={(e) => setFormData({...formData, titolo: e.target.value})}
                  required
                  placeholder="Es. Nuovo evento in arrivo!"
                />
              </div>
              
              <div>
                <Label className="font-manrope">Messaggio</Label>
                <Textarea
                  value={formData.messaggio}
                  onChange={(e) => setFormData({...formData, messaggio: e.target.value})}
                  required
                  rows={3}
                  placeholder="Scrivi il messaggio della notifica..."
                />
              </div>

              <div>
                <Label className="font-manrope">Link (opzionale)</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  placeholder="/events o /loyalty"
                />
                <p className="text-xs text-[#4A5568] mt-1">
                  Inserisci un percorso relativo (es. /events) per reindirizzare l'utente
                </p>
              </div>

              <Button type="submit" className="w-full bg-[#C5A059] hover:bg-[#B08D45]">
                <Send className="w-4 h-4 mr-2" />
                {formData.destinatario_id === 'all' ? 'Invia a Tutti' : 'Invia Notifica'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessuna notifica inviata</p>
            <p className="text-sm text-[#718096] mt-1">Clicca "Nuova Notifica" per inviarne una</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className="border-[#E2E8F0]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.destinatario_id ? 'bg-blue-100 text-blue-600' : 'bg-[#C5A059]/20 text-[#C5A059]'
                    }`}>
                      <TypeIcon tipo={notification.tipo} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-cinzel text-[#1A202C]">{notification.titolo}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          notification.destinatario_id 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {notification.destinatario_id ? 'Singolo' : 'Broadcast'}
                        </span>
                      </div>
                      <p className="text-sm text-[#4A5568] mb-2">{notification.messaggio}</p>
                      <div className="flex items-center gap-4 text-xs text-[#718096]">
                        <span className="flex items-center gap-1">
                          {notification.destinatario_id ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          {getGuestName(notification.destinatario_id)}
                        </span>
                        <span>{getTimeAgo(notification.created_at)}</span>
                        {notification.link && (
                          <span className="text-[#C5A059]">→ {notification.link}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(notification.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
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
