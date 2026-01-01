import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Umbrella, 
  Shirt, 
  Car, 
  Wifi, 
  Wine, 
  Ship, 
  ShoppingBag, 
  Coffee,
  Sparkles,
  Euro,
  Check,
  CalendarIcon,
  Clock,
  Users,
  MessageCircle,
  AlertCircle,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Eye
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WHATSAPP_NUMBER = "393755172370";

const iconMap = {
  Umbrella: Umbrella,
  Shirt: Shirt,
  Car: Car,
  Wifi: Wifi,
  Wine: Wine,
  Ship: Ship,
  ShoppingBag: ShoppingBag,
  Coffee: Coffee,
  default: Sparkles
};

const categoryLabels = {
  it: {
    spiaggia: { label: 'Spiaggia', color: 'bg-blue-100 text-blue-700' },
    comfort: { label: 'Comfort', color: 'bg-purple-100 text-purple-700' },
    trasporti: { label: 'Trasporti', color: 'bg-green-100 text-green-700' },
    esperienze: { label: 'Esperienze', color: 'bg-amber-100 text-amber-700' },
    shop: { label: 'Shop', color: 'bg-pink-100 text-pink-700' }
  },
  en: {
    spiaggia: { label: 'Beach', color: 'bg-blue-100 text-blue-700' },
    comfort: { label: 'Comfort', color: 'bg-purple-100 text-purple-700' },
    trasporti: { label: 'Transport', color: 'bg-green-100 text-green-700' },
    esperienze: { label: 'Experiences', color: 'bg-amber-100 text-amber-700' },
    shop: { label: 'Shop', color: 'bg-pink-100 text-pink-700' }
  }
};

export default function ServicesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [hasActiveCheckin, setHasActiveCheckin] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // Date locale
  const dateLocale = language === 'it' ? it : enUS;
  
  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [bookingPersone, setBookingPersone] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  
  // Info dialog (for WiFi password etc)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoService, setInfoService] = useState(null);

  // Helper to get translated content
  const getLocalizedText = (item, field) => {
    if (language === 'en' && item[`${field}_en`]) {
      return item[`${field}_en`];
    }
    return item[field] || item[`${field}_it`] || '';
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (token) {
      checkActiveCheckin();
      fetchServices();
    }
  }, [token]);

  const checkActiveCheckin = async () => {
    try {
      const response = await axios.get(`${API}/checkin/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasActiveCheckin(response.data.has_active_checkin);
    } catch (error) {
      console.error('Error checking checkin status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAction = (service) => {
    const tipo = service.tipo_interazione || 'booking';
    
    if (tipo === 'info') {
      // Show info dialog (e.g., WiFi password)
      setInfoService(service);
      setInfoDialogOpen(true);
    } else if (tipo === 'shop') {
      // Navigate to shop page
      navigate('/shop');
    } else {
      // Open booking dialog
      openBookingDialog(service);
    }
  };

  const openBookingDialog = (service) => {
    setSelectedService(service);
    setBookingDate(null);
    setBookingTime('');
    setBookingNote('');
    setBookingPersone('1');
    setBookingDialogOpen(true);
  };

  const handleBookService = async () => {
    if (!bookingDate) {
      toast.error('Seleziona una data');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/services/book`, {
        service_id: selectedService.id,
        data_richiesta: format(bookingDate, 'yyyy-MM-dd'),
        ora_richiesta: bookingTime || null,
        note: bookingNote || null,
        num_persone: parseInt(bookingPersone)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Prenotazione inviata! Ti contatteremo a breve.');
      setBookingDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella prenotazione');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiato negli appunti!');
  };

  const openWhatsApp = (service) => {
    const message = encodeURIComponent(
      `Ciao! Vorrei informazioni sul servizio "${service.nome}" presso La Maisonette di Paestum.\n\nNome: ${user?.nome} ${user?.cognome}\nCodice: ${user?.codice_prenotazione}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const filteredServices = activeCategory === 'all' 
    ? services 
    : services.filter(s => s.categoria === activeCategory);

  const categories = ['all', ...new Set(services.map(s => s.categoria))];
  const catLabels = categoryLabels[language] || categoryLabels.it;

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName] || iconMap.default;
    return <IconComponent className="w-8 h-8 text-[#C5A059]" />;
  };

  const getActionButton = (service) => {
    const tipo = service.tipo_interazione || 'booking';
    
    if (tipo === 'info') {
      return (
        <Button
          onClick={() => handleServiceAction(service)}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm"
          data-testid={`info-service-${service.id}`}
        >
          <Eye className="w-4 h-4 mr-1" />
          {language === 'en' ? 'View' : 'Visualizza'}
        </Button>
      );
    } else if (tipo === 'shop') {
      return (
        <Button
          onClick={() => handleServiceAction(service)}
          className="flex-1 bg-pink-500 hover:bg-pink-600 text-white text-sm"
          data-testid={`shop-service-${service.id}`}
        >
          <ShoppingBag className="w-4 h-4 mr-1" />
          {language === 'en' ? 'Go to Shop' : 'Vai allo Shop'}
        </Button>
      );
    } else {
      return (
        <Button
          onClick={() => handleServiceAction(service)}
          className="flex-1 bg-[#C5A059] hover:bg-[#B08D45] text-white text-sm"
          data-testid={`book-service-${service.id}`}
        >
          {language === 'en' ? 'Book' : 'Prenota'}
        </Button>
      );
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  // Show message if no active check-in
  if (!hasActiveCheckin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="font-cinzel text-3xl text-[#1A202C] mb-4">
            Check-in Richiesto
          </h1>
          <p className="font-manrope text-[#4A5568] mb-8">
            Per accedere ai servizi esclusivi devi prima effettuare il check-in per il tuo soggiorno.
          </p>
          <Link to="/checkin">
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel tracking-widest uppercase px-8 py-4">
              <ClipboardCheck className="w-5 h-5 mr-2" />
              Effettua Check-in
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
            Per il Tuo Soggiorno
          </p>
          <h1 className="font-cinzel text-4xl md:text-5xl text-[#1A202C] mb-4">
            I Nostri Servizi
          </h1>
          <p className="font-manrope text-[#4A5568] max-w-2xl mx-auto">
            Prenota i servizi per rendere il tuo soggiorno indimenticabile
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-sm font-manrope text-sm transition-all ${
                activeCategory === cat
                  ? 'bg-[#C5A059] text-white shadow-md'
                  : 'bg-white border border-[#E2E8F0] text-[#4A5568] hover:border-[#C5A059]'
              }`}
              data-testid={`filter-${cat}`}
            >
              {cat === 'all' ? 'Tutti' : categoryLabels[cat]?.label || cat}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-cinzel text-xl text-[#1A202C] mb-2">Nessun servizio disponibile</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service, index) => (
              <Card 
                key={service.id}
                className="group overflow-hidden border-[#E2E8F0] hover:border-[#C5A059] transition-all duration-300 card-hover animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                data-testid={`service-card-${service.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-[#F9F9F7] rounded-sm flex items-center justify-center group-hover:bg-[#C5A059]/10 transition-colors">
                      {getIcon(service.icona)}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${categoryLabels[service.categoria]?.color || 'bg-gray-100 text-gray-700'} border-0`}>
                        {categoryLabels[service.categoria]?.label || service.categoria}
                      </Badge>
                      {service.gratuito ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <Check className="w-4 h-4" />
                          Gratuito
                        </span>
                      ) : service.prezzo ? (
                        <span className="flex items-center gap-1 text-[#C5A059] font-cinzel text-lg">
                          <Euro className="w-4 h-4" />
                          {service.prezzo.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[#4A5568] text-sm">Su richiesta</span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-cinzel text-xl text-[#1A202C] mb-3 group-hover:text-[#C5A059] transition-colors">
                    {service.nome}
                  </h3>
                  
                  <p className="font-manrope text-sm text-[#4A5568] leading-relaxed mb-4">
                    {service.descrizione}
                  </p>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto pt-4 border-t border-[#E2E8F0]">
                    {getActionButton(service)}
                    <Button
                      onClick={() => openWhatsApp(service)}
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                      data-testid={`whatsapp-service-${service.id}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* WhatsApp CTA */}
        <div className="mt-16 bg-green-600 rounded-sm p-8 md:p-12 text-center">
          <MessageCircle className="w-12 h-12 text-white mx-auto mb-4" />
          <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-4">
            Preferisci WhatsApp?
          </h2>
          <p className="font-manrope text-green-100 mb-6 max-w-xl mx-auto">
            Contattaci direttamente su WhatsApp per prenotare servizi o chiedere informazioni.
          </p>
          <a 
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Ciao! Sono ${user?.nome}, ospite de La Maisonette (${user?.codice_prenotazione}). Vorrei informazioni sui servizi.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white text-green-600 font-cinzel tracking-widest uppercase px-8 py-4 hover:bg-green-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Chatta su WhatsApp
          </a>
        </div>
      </div>

      {/* Info Dialog (WiFi password etc) */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl flex items-center gap-2">
              {infoService && getIcon(infoService.icona)}
              {infoService?.nome}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="font-manrope text-[#4A5568] mb-4">
              {infoService?.descrizione}
            </p>
            
            {infoService?.info_extra && (
              <div className="bg-[#F9F9F7] p-4 rounded-sm">
                <p className="font-manrope text-sm text-[#4A5568] mb-2">Password WiFi:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-4 py-3 rounded border border-[#E2E8F0] font-mono text-lg text-[#1A202C]">
                    {infoService.info_extra}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(infoService.info_extra)}
                    className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl">
              Prenota: {selectedService?.nome}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label className="font-manrope">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!bookingDate && 'text-muted-foreground'}`}
                    data-testid="booking-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#C5A059]" />
                    {bookingDate ? format(bookingDate, 'dd MMMM yyyy', { locale: it }) : 'Seleziona data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={setBookingDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label className="font-manrope">Ora preferita (opzionale)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A059]" />
                <Input
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="pl-10"
                  data-testid="booking-time"
                />
              </div>
            </div>

            {/* Number of people */}
            <div className="space-y-2">
              <Label className="font-manrope">Numero persone</Label>
              <Select value={bookingPersone} onValueChange={setBookingPersone}>
                <SelectTrigger data-testid="booking-persone">
                  <Users className="w-4 h-4 mr-2 text-[#C5A059]" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} {n === 1 ? 'persona' : 'persone'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="font-manrope">Note (opzionale)</Label>
              <Textarea
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="Richieste speciali..."
                className="min-h-[80px]"
                data-testid="booking-note"
              />
            </div>

            {/* Price info */}
            {selectedService && (
              <div className="bg-[#F9F9F7] p-4 rounded-sm">
                <p className="font-manrope text-sm text-[#4A5568]">
                  {selectedService.gratuito ? (
                    <span className="text-green-600 font-medium">Servizio gratuito</span>
                  ) : selectedService.prezzo ? (
                    <>Prezzo: <span className="font-cinzel text-[#C5A059]">€{selectedService.prezzo.toFixed(2)}</span></>
                  ) : (
                    'Prezzo su richiesta - ti contatteremo'
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setBookingDialogOpen(false)}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              onClick={handleBookService}
              disabled={submitting || !bookingDate}
              className="flex-1 bg-[#C5A059] hover:bg-[#B08D45]"
              data-testid="confirm-booking-btn"
            >
              {submitting ? 'Invio...' : 'Prenota'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
