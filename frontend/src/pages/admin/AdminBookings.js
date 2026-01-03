import { useEffect, useState, useCallback } from 'react';
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
import { Plus, Edit, Trash2, Home, Euro, Calendar, Users, Check, X, Clock, Phone, Mail, Key, Copy, Search, User, Gift, UserPlus } from 'lucide-react';

import { API } from '../../lib/api';

export default function AdminBookings() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [units, setUnits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pricePeriods, setPricePeriods] = useState([]);
  const [dateBlocks, setDateBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  
  // Forms
  const [unitForm, setUnitForm] = useState({
    nome: '', descrizione: '', capacita_max: 5, prezzo_base: 90, immagine_url: '', attivo: true
  });
  const [priceForm, setPriceForm] = useState({
    unit_id: '', nome_periodo: '', data_inizio: '', data_fine: '', prezzo: 0
  });
  const [blockForm, setBlockForm] = useState({
    unit_id: '', data_inizio: '', data_fine: '', motivo: ''
  });
  const [bookingForm, setBookingForm] = useState({
    unit_id: '', data_arrivo: '', data_partenza: '', num_ospiti: 2,
    guest_id: '', nome_ospite: '', email_ospite: '', telefono_ospite: '', note: '', 
    prezzo_totale: '', status: 'confirmed'
  });
  
  // Edit booking
  const [editingBooking, setEditingBooking] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nome_ospite: '', email_ospite: '', telefono_ospite: '',
    data_arrivo: '', data_partenza: '', num_ospiti: 2,
    note: '', prezzo_totale: '', status: 'confirmed'
  });
  
  // Ricerca clienti
  const [clienteMode, setClienteMode] = useState('nuovo'); // 'nuovo' o 'esistente'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      // Carica units e bookings (essenziali)
      const [unitsRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/admin/units`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUnits(unitsRes.data);
      setBookings(bookingsRes.data);
      
      // Carica price-periods (opzionale, non blocca se fallisce)
      try {
        const pricesRes = await axios.get(`${API}/admin/price-periods`, { headers: { Authorization: `Bearer ${token}` } });
        setPricePeriods(pricesRes.data);
      } catch (e) {
        console.warn('Could not load price periods:', e);
        setPricePeriods([]);
      }
      
      // Carica date-blocks (opzionale, non blocca se fallisce)
      try {
        const blocksRes = await axios.get(`${API}/admin/date-blocks`, { headers: { Authorization: `Bearer ${token}` } });
        setDateBlocks(blocksRes.data);
      } catch (e) {
        console.warn('Could not load date blocks:', e);
        setDateBlocks([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
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

  const resetUnitForm = () => {
    setEditingUnit(null);
    setUnitForm({ nome: '', descrizione: '', capacita_max: 5, prezzo_base: 90, immagine_url: '', attivo: true });
  };

  const openEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      nome: unit.nome,
      descrizione: unit.descrizione || '',
      capacita_max: unit.capacita_max,
      prezzo_base: unit.prezzo_base,
      immagine_url: unit.immagine_url || '',
      attivo: unit.attivo
    });
    setUnitDialogOpen(true);
  };

  const deleteUnit = async (id) => {
    if (!window.confirm('Eliminare questa casetta?')) return;
    try {
      await axios.delete(`${API}/admin/units/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Casetta eliminata!');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  // Validate Check-in manually
  const validateCheckin = async (bookingId) => {
    try {
      await axios.post(`${API}/admin/checkins/validate/${bookingId}`, {
        note: 'Documenti ricevuti via canale esterno'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Check-in validato!');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella validazione');
    }
  };

  // Price Period handlers
  const handlePriceSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/price-periods`, priceForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Periodo prezzo creato!');
      setPriceDialogOpen(false);
      setPriceForm({ unit_id: '', nome_periodo: '', data_inizio: '', data_fine: '', prezzo: 0 });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const deletePricePeriod = async (id) => {
    if (!window.confirm('Eliminare questo periodo?')) return;
    try {
      await axios.delete(`${API}/admin/price-periods/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Periodo eliminato!');
      fetchAll();
    } catch (error) {
      toast.error('Errore');
    }
  };

  // Date Block handlers
  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/date-blocks`, blockForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Date bloccate!');
      setBlockDialogOpen(false);
      setBlockForm({ unit_id: '', data_inizio: '', data_fine: '', motivo: '' });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const deleteBlock = async (id) => {
    if (!window.confirm('Rimuovere il blocco?')) return;
    try {
      await axios.delete(`${API}/admin/date-blocks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Blocco rimosso!');
      fetchAll();
    } catch (error) {
      toast.error('Errore');
    }
  };

  // Booking handlers
  const updateBookingStatus = async (id, status) => {
    try {
      await axios.put(`${API}/admin/bookings/${id}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status aggiornato!');
      fetchAll();
    } catch (error) {
      toast.error('Errore');
    }
  };

  // Ricerca clienti esistenti
  const searchGuests = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await axios.get(`${API}/admin/guests/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Errore ricerca:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [token]);

  // Debounce per ricerca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchGuests(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchGuests]);

  const selectGuest = (guest) => {
    setSelectedGuest(guest);
    setBookingForm(prev => ({
      ...prev,
      guest_id: guest.id,
      nome_ospite: guest.nome_completo,
      email_ospite: guest.email,
      telefono_ospite: guest.telefono || ''
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearSelectedGuest = () => {
    setSelectedGuest(null);
    setBookingForm(prev => ({
      ...prev,
      guest_id: '',
      nome_ospite: '',
      email_ospite: '',
      telefono_ospite: ''
    }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        unit_id: bookingForm.unit_id,
        data_arrivo: bookingForm.data_arrivo,
        data_partenza: bookingForm.data_partenza,
        num_ospiti: parseInt(bookingForm.num_ospiti),
        note: bookingForm.note || null,
        prezzo_totale: bookingForm.prezzo_totale ? parseFloat(bookingForm.prezzo_totale) : null,
        status: bookingForm.status
      };
      
      // Aggiungi guest_id se cliente esistente, altrimenti i dati del nuovo cliente
      if (clienteMode === 'esistente' && selectedGuest) {
        payload.guest_id = selectedGuest.id;
      } else {
        payload.nome_ospite = bookingForm.nome_ospite;
        payload.email_ospite = bookingForm.email_ospite;
        payload.telefono_ospite = bookingForm.telefono_ospite;
      }
      
      const response = await axios.post(`${API}/admin/bookings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Prenotazione creata! Codice: ${response.data.codice_prenotazione}`);
      setBookingDialogOpen(false);
      resetBookingForm();
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const resetBookingForm = () => {
    setBookingForm({
      unit_id: '', data_arrivo: '', data_partenza: '', num_ospiti: 2,
      guest_id: '', nome_ospite: '', email_ospite: '', telefono_ospite: '', note: '',
      prezzo_totale: '', status: 'confirmed'
    });
    setClienteMode('nuovo');
    setSelectedGuest(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const copyBookingCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Codice copiato!');
  };

  // Funzione per generare messaggio WhatsApp check-in
  const generateWhatsAppMessage = (booking) => {
    const unit = units.find(u => u.id === booking.unit_id);
    const unitName = unit?.nome || 'La Maisonette';
    const isUnit1 = unitName.toLowerCase().includes('1');
    const unitNumber = isUnit1 ? '1' : '2';
    const codiceIngresso = isUnit1 ? '1508' : '1711';
    
    const message = `*Gentile ${booking.nome_ospite},*

A nome di tutto lo staff de *La Maisonette di Paestum*, la ringraziamo per averci scelto per il suo soggiorno!

📍 *Indirizzo struttura*
La Maisonette di Paestum – Clicca qui per aprire la posizione su Google Maps
https://maps.app.goo.gl/q1Y6rnhXbm4sDy9U7

🚗 *ZTL – Zona a Traffico Limitato*
La struttura si trova all'interno di una ZTL attiva *tutti i giorni festivi e prefestivi dalle 18:00 alle 03:00*;
Al di fuori di queste fasce orarie *è possibile circolare e raggiungere liberamente la struttura in auto*;

🅿️ *Parcheggi nelle vicinanze*
Sono disponibili due parcheggi a pagamento, entrambi con tariffa di *€1 all'ora* o *€5 per l'intera giornata*. È inoltre possibile acquistare un abbonamento giornaliero o settimanale.

• *Parcheggio Ovest* – https://maps.app.goo.gl/sh6JMTtmLRX7gq4w6
• *Parcheggio Est* – https://maps.app.goo.gl/CKK8QL8kyHHeAB5Z7 (qui è spesso possibile trovare *posti liberi di fronte all'ingresso*)

🕒 *Orari di check-in e check-out*
• *Check-in:* dalle ore *15:00* in poi
• *Check-out:* entro le ore *10:00*

🏠 Per lei è stata riservata *LA MAISONETTE ${unitNumber}*
🔑 Il codice d'ingresso è *${codiceIngresso}*

📶 *Wi-Fi gratuito*
È disponibile la connessione Wi-Fi Alta velocità gratuita. La password è indicata su una tabella posta sul mobile all'ingresso.

☕ *Ristoro mattutino*
Essendo una Holiday House, non offriamo servizio di colazione servita ma abbiamo una convenzione con il bar Anna a Paestum per gustare la tua colazione vista templi. Inoltre mettiamo a disposizione gratuitamente:
• Macchina del caffè con cialde di torrefazione locale
• Bustine di tè, tisane, infusi e camomilla
• Marmellate, fette biscottate monouso, cornetti confezionati
• Bollitore per la preparazione del tè

🍳 *Cucina attrezzata*
La cucina è completamente accessoriata con pentole, piatti, bicchieri e posate.
Nel frigorifero troverete acqua fresca a disposizione.

🧼 *Cambio biancheria*
Il cambio di lenzuola e asciugamani viene effettuato ogni 3 giorni, tra le 11:00 e le 15:00, salvo accordi diversi.

📋 *Check-in obbligatorio*
Le ricordiamo che, una volta entrati nella struttura, è indispensabile effettuare il check-in come previsto dalla normativa vigente.
Accedendo all'app della struttura: https://lamaisonettepaestum.com
Il codice di prenotazione è *${booking.codice_prenotazione}*

📞 *Siamo a vostra disposizione*
Per qualsiasi informazione, consiglio o necessità non esitate a contattarci:
📱 +39 393 495 7532
📱 +39 388 168 1287
💬 WhatsApp: +39 375 517 2370

🙏 *Grazie per aver scelto La Maisonette di Paestum*
Siamo felici di accogliervi e ci auguriamo che il vostro soggiorno sia davvero indimenticabile!

Con affetto,
Antonella – La Maisonette di Paestum`;

    return message;
  };

  const sendWhatsApp = (booking) => {
    const phone = booking.telefono_ospite?.replace(/\s/g, '').replace(/^\+/, '');
    if (!phone || phone === '-') {
      toast.error('Numero di telefono non disponibile');
      return;
    }
    
    const message = generateWhatsAppMessage(booking);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Open edit dialog
  const openEditDialog = (booking) => {
    setEditingBooking(booking);
    setEditForm({
      nome_ospite: booking.nome_ospite || '',
      email_ospite: booking.email_ospite || '',
      telefono_ospite: booking.telefono_ospite || '',
      data_arrivo: booking.data_arrivo || '',
      data_partenza: booking.data_partenza || '',
      num_ospiti: booking.num_ospiti || 2,
      note: booking.note || '',
      prezzo_totale: booking.prezzo_totale || '',
      status: booking.status || 'confirmed'
    });
    setEditDialogOpen(true);
  };

  // Save booking edits
  const saveBookingEdit = async () => {
    if (!editingBooking) return;
    
    try {
      await axios.put(`${API}/admin/bookings/${editingBooking.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Prenotazione aggiornata!');
      setEditDialogOpen(false);
      setEditingBooking(null);
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel salvataggio');
    }
  };

  const deleteBooking = async (id) => {
    if (!window.confirm('Eliminare questa prenotazione?')) return;
    try {
      await axios.delete(`${API}/admin/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Prenotazione eliminata!');
      fetchAll();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      pending: 'In Attesa',
      confirmed: 'Confermata',
      cancelled: 'Cancellata',
      completed: 'Completata'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Formatta data in italiano (es. "Ven 3 Gen 2026")
  const formatDateItalian = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  // Ordina prenotazioni per data arrivo (più vicine prima)
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = new Date(a.data_arrivo);
    const dateB = new Date(b.data_arrivo);
    const now = new Date();
    
    // Se entrambe sono passate o entrambe future, ordina per data
    const aIsPast = dateA < now;
    const bIsPast = dateB < now;
    
    // Metti le future prima delle passate
    if (aIsPast && !bIsPast) return 1;
    if (!aIsPast && bIsPast) return -1;
    
    // Se stesso stato (entrambe passate o entrambe future), ordina per data
    return dateA - dateB;
  });

  return (
    <AdminLayout title="Gestione Prenotazioni">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {[
            { key: 'bookings', label: 'Prenotazioni', icon: Calendar },
            { key: 'prices', label: 'Prezzi', icon: Euro },
            { key: 'blocks', label: 'Blocchi Date', icon: X }
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
            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-cinzel text-xl">Prenotazioni</h2>
                  <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#C5A059] hover:bg-[#B08D45]" onClick={resetBookingForm}>
                        <Plus className="w-4 h-4 mr-2" /> Nuova Prenotazione
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Nuova Prenotazione</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleBookingSubmit} className="space-y-4">
                        <div>
                          <Label>Casetta *</Label>
                          <select
                            className="w-full border rounded-md px-3 py-2"
                            value={bookingForm.unit_id}
                            onChange={(e) => setBookingForm({ ...bookingForm, unit_id: e.target.value })}
                            required
                          >
                            <option value="">Seleziona...</option>
                            {units.map(u => (
                              <option key={u.id} value={u.id}>{u.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Data Arrivo *</Label>
                            <Input
                              type="date"
                              value={bookingForm.data_arrivo}
                              onChange={(e) => setBookingForm({ ...bookingForm, data_arrivo: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Data Partenza *</Label>
                            <Input
                              type="date"
                              value={bookingForm.data_partenza}
                              onChange={(e) => setBookingForm({ ...bookingForm, data_partenza: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Numero Ospiti *</Label>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              value={bookingForm.num_ospiti}
                              onChange={(e) => setBookingForm({ ...bookingForm, num_ospiti: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Prezzo Totale (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Auto calcolato"
                              value={bookingForm.prezzo_totale}
                              onChange={(e) => setBookingForm({ ...bookingForm, prezzo_totale: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        {/* Selezione Cliente */}
                        <div className="border-t pt-4 mt-4">
                          <Label className="text-base font-semibold mb-3 block">Cliente</Label>
                          <div className="flex gap-2 mb-4">
                            <Button
                              type="button"
                              variant={clienteMode === 'esistente' ? 'default' : 'outline'}
                              className={clienteMode === 'esistente' ? 'bg-[#C5A059] hover:bg-[#B08D45]' : ''}
                              onClick={() => { setClienteMode('esistente'); clearSelectedGuest(); }}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Cliente Esistente
                            </Button>
                            <Button
                              type="button"
                              variant={clienteMode === 'nuovo' ? 'default' : 'outline'}
                              className={clienteMode === 'nuovo' ? 'bg-[#C5A059] hover:bg-[#B08D45]' : ''}
                              onClick={() => { setClienteMode('nuovo'); clearSelectedGuest(); }}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Nuovo Cliente
                            </Button>
                          </div>
                          
                          {clienteMode === 'esistente' ? (
                            <div className="space-y-3">
                              {selectedGuest ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-[#1A202C]">{selectedGuest.nome_completo}</p>
                                        <p className="text-sm text-gray-600">{selectedGuest.email}</p>
                                        {selectedGuest.telefono && (
                                          <p className="text-sm text-gray-600">{selectedGuest.telefono}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 bg-[#C5A059]/10 px-2 py-1 rounded">
                                        <Gift className="w-4 h-4 text-[#C5A059]" />
                                        <span className="text-sm font-medium text-[#C5A059]">{selectedGuest.punti_fedelta} pt</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearSelectedGuest}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input
                                    placeholder="Cerca per nome, cognome o email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                  />
                                  {searchLoading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C5A059]"></div>
                                    </div>
                                  )}
                                  
                                  {/* Risultati ricerca */}
                                  {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      {searchResults.map((guest) => (
                                        <button
                                          key={guest.id}
                                          type="button"
                                          onClick={() => selectGuest(guest)}
                                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                              <User className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-sm">{guest.nome_completo}</p>
                                              <p className="text-xs text-gray-500">{guest.email}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 text-[#C5A059]">
                                            <Gift className="w-3 h-3" />
                                            <span className="text-xs font-medium">{guest.punti_fedelta} pt</span>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
                                      Nessun cliente trovato
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <Label>Nome Ospite *</Label>
                                <Input
                                  value={bookingForm.nome_ospite}
                                  onChange={(e) => setBookingForm({ ...bookingForm, nome_ospite: e.target.value })}
                                  required={clienteMode === 'nuovo'}
                                  placeholder="Mario Rossi"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Email Ospite *</Label>
                                  <Input
                                    type="email"
                                    value={bookingForm.email_ospite}
                                    onChange={(e) => setBookingForm({ ...bookingForm, email_ospite: e.target.value })}
                                    required={clienteMode === 'nuovo'}
                                    placeholder="email@esempio.com"
                                  />
                                </div>
                                <div>
                                  <Label>Telefono</Label>
                                  <Input
                                    type="tel"
                                    value={bookingForm.telefono_ospite}
                                    onChange={(e) => setBookingForm({ ...bookingForm, telefono_ospite: e.target.value })}
                                    placeholder="+39 333 1234567"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">
                                💡 Se l'email è già registrata, i punti fedeltà verranno preservati
                              </p>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label>Note</Label>
                          <Textarea
                            value={bookingForm.note}
                            onChange={(e) => setBookingForm({ ...bookingForm, note: e.target.value })}
                            rows={2}
                            placeholder="Note aggiuntive..."
                          />
                        </div>
                        <div>
                          <Label>Status</Label>
                          <select
                            className="w-full border rounded-md px-3 py-2"
                            value={bookingForm.status}
                            onChange={(e) => setBookingForm({ ...bookingForm, status: e.target.value })}
                          >
                            <option value="confirmed">Confermata</option>
                            <option value="pending">In Attesa</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => { setBookingDialogOpen(false); resetBookingForm(); }}>
                            Annulla
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-[#C5A059] hover:bg-[#B08D45]"
                            disabled={clienteMode === 'esistente' && !selectedGuest}
                          >
                            Crea Prenotazione
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {bookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-[#4A5568]">
                      Nessuna prenotazione
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {sortedBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="py-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-medium text-[#1A202C]">{booking.nome_ospite}</h3>
                                {getStatusBadge(booking.status)}
                                {booking.codice_prenotazione && (
                                  <button
                                    onClick={() => copyBookingCode(booking.codice_prenotazione)}
                                    className="flex items-center gap-1 px-2 py-1 bg-[#F9F9F7] rounded text-xs font-mono text-[#1A202C] hover:bg-[#C5A059]/20 transition-colors"
                                    title="Clicca per copiare"
                                  >
                                    <Key className="w-3 h-3 text-[#C5A059]" />
                                    {booking.codice_prenotazione}
                                    <Copy className="w-3 h-3 ml-1" />
                                  </button>
                                )}
                              </div>
                              
                              {/* Data in evidenza */}
                              <div className="flex items-center gap-2 mb-3 bg-[#C5A059]/10 rounded-lg px-3 py-2 w-fit">
                                <Calendar className="w-5 h-5 text-[#C5A059]" />
                                <span className="font-semibold text-[#C5A059] text-lg">
                                  {formatDateItalian(booking.data_arrivo)}
                                </span>
                                <span className="text-[#4A5568]">→</span>
                                <span className="font-semibold text-[#C5A059] text-lg">
                                  {formatDateItalian(booking.data_partenza)}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-[#4A5568]">
                                <span className="flex items-center gap-1">
                                  <Home className="w-4 h-4" />
                                  {booking.unit_nome}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {booking.num_ospiti} ospiti
                                </span>
                                <span className="flex items-center gap-1">
                                  <Euro className="w-4 h-4" />
                                  €{booking.prezzo_totale}
                                </span>
                              </div>
                              <div className="flex gap-4 mt-2 text-sm text-[#4A5568]">
                                <a href={`mailto:${booking.email_ospite}`} className="flex items-center gap-1 hover:text-[#C5A059]">
                                  <Mail className="w-4 h-4" />
                                  {booking.email_ospite}
                                </a>
                                <a href={`tel:${booking.telefono_ospite}`} className="flex items-center gap-1 hover:text-[#C5A059]">
                                  <Phone className="w-4 h-4" />
                                  {booking.telefono_ospite}
                                </a>
                              </div>
                              {booking.note && (
                                <div className="flex items-center gap-2 mt-2">
                                  {/* Logo Booking.com */}
                                  {booking.note.toLowerCase().includes('[booking') && (
                                    <div className="flex items-center gap-2 bg-[#003580] text-white px-3 py-1 rounded">
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.27 0v24h5.06V9.41h3.52c3.52 0 5.2-2.06 5.2-5.2C16.05 1.5 13.86 0 10.34 0H2.27zm5.06 4.05h2.64c1.54 0 2.64.55 2.64 1.93 0 1.38-1.1 1.93-2.64 1.93H7.33V4.05z"/>
                                        <path d="M19.73 7.27c-2.48 0-4.2 1.72-4.2 4.5v7.73c0 2.77 1.72 4.5 4.2 4.5s4.2-1.72 4.2-4.5v-7.73c0-2.78-1.72-4.5-4.2-4.5zm1.1 12.23c0 .83-.42 1.38-1.1 1.38-.69 0-1.1-.55-1.1-1.38v-7.73c0-.83.41-1.38 1.1-1.38.68 0 1.1.55 1.1 1.38v7.73z"/>
                                      </svg>
                                      <span className="text-xs font-semibold">Booking.com</span>
                                    </div>
                                  )}
                                  {/* Logo Airbnb */}
                                  {booking.note.toLowerCase().includes('[airbnb') && (
                                    <div className="flex items-center gap-2 bg-[#FF5A5F] text-white px-3 py-1 rounded">
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.1 16.2c-.3.6-.9 1.2-1.8 1.2-.6 0-1.2-.3-1.8-.6-.6-.6-1.2-1.2-1.8-1.8-.6.6-1.2 1.5-1.8 1.8-.6.3-1.2.6-1.8.6-.9 0-1.5-.6-1.8-1.2-.3-.9-.3-1.8.3-3 .6-1.2 1.5-2.4 2.7-3.6-1.2-1.5-2.1-2.7-2.7-3.9-.6-1.2-.6-2.1-.3-3 .3-.6.9-1.2 1.8-1.2.6 0 1.2.3 1.8.6.6.6 1.2 1.2 1.8 1.8.6-.6 1.2-1.5 1.8-1.8.6-.3 1.2-.6 1.8-.6.9 0 1.5.6 1.8 1.2.3.9.3 1.8-.3 3-.6 1.2-1.5 2.4-2.7 3.6 1.2 1.5 2.1 2.7 2.7 3.9.6 1.2.6 2.1.3 3z"/>
                                      </svg>
                                      <span className="text-xs font-semibold">Airbnb</span>
                                    </div>
                                  )}
                                  {/* Testo nota (senza i tag) */}
                                  {!booking.note.toLowerCase().includes('[booking') && !booking.note.toLowerCase().includes('[airbnb') && (
                                    <p className="text-sm text-[#4A5568] italic">"{booking.note}"</p>
                                  )}
                                  {/* Mostra resto nota se contiene altri dettagli */}
                                  {(booking.note.toLowerCase().includes('[booking') || booking.note.toLowerCase().includes('[airbnb')) && (
                                    <span className="text-xs text-[#4A5568]">
                                      {booking.note.replace(/\[booking[^\]]*\]/gi, '').replace(/\[airbnb[^\]]*\]/gi, '').trim()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {booking.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="w-4 h-4 mr-1" /> Conferma
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4 mr-1" /> Rifiuta
                                  </Button>
                                </>
                              )}
                              {booking.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateBookingStatus(booking.id, 'completed')}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Completa
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(booking)}
                                className="text-[#C5A059] border-[#C5A059] hover:bg-[#C5A059]/10"
                              >
                                ✏️ Modifica
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendWhatsApp(booking)}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                title="Invia messaggio WhatsApp"
                              >
                                💬 WhatsApp
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteBooking(booking.id)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              {/* Validate Check-in Button */}
                              {booking.status === 'confirmed' && !booking.checkin_online_completato && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => validateCheckin(booking.id)}
                                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                  title="Valida check-in manualmente"
                                >
                                  ✓ Check-in
                                </Button>
                              )}
                              {booking.checkin_online_completato && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                  ✓ Check-in fatto
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PRICES TAB */}
            {activeTab === 'prices' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-cinzel text-xl">Prezzi Speciali per Periodo</h2>
                  <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#C5A059] hover:bg-[#B08D45]">
                        <Plus className="w-4 h-4 mr-2" /> Nuovo Periodo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuovo Periodo Prezzo</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handlePriceSubmit} className="space-y-4">
                        <div>
                          <Label>Casetta *</Label>
                          <select
                            className="w-full border rounded-md px-3 py-2"
                            value={priceForm.unit_id}
                            onChange={(e) => setPriceForm({ ...priceForm, unit_id: e.target.value })}
                            required
                          >
                            <option value="">Seleziona...</option>
                            {units.map(u => (
                              <option key={u.id} value={u.id}>{u.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Nome Periodo *</Label>
                          <Input
                            value={priceForm.nome_periodo}
                            onChange={(e) => setPriceForm({ ...priceForm, nome_periodo: e.target.value })}
                            required
                            placeholder="Es. Alta Stagione, Ferragosto..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Data Inizio</Label>
                            <Input
                              type="date"
                              value={priceForm.data_inizio}
                              onChange={(e) => setPriceForm({ ...priceForm, data_inizio: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Data Fine</Label>
                            <Input
                              type="date"
                              value={priceForm.data_fine}
                              onChange={(e) => setPriceForm({ ...priceForm, data_fine: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Prezzo (€/notte)</Label>
                          <Input
                            type="number"
                            value={priceForm.prezzo}
                            onChange={(e) => setPriceForm({ ...priceForm, prezzo: parseFloat(e.target.value) })}
                            min={0}
                            step={0.01}
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setPriceDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                            Crea
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {pricePeriods.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-[#4A5568]">
                      Nessun periodo prezzo speciale. Il prezzo base delle casette verrà applicato.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {pricePeriods.map((period) => {
                      const unit = units.find(u => u.id === period.unit_id);
                      return (
                        <Card key={period.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="font-medium">{period.nome_periodo}</span>
                                  <span className="text-sm text-[#4A5568] ml-2">({unit?.nome})</span>
                                </div>
                                <span className="text-sm text-[#4A5568]">
                                  {period.data_inizio} → {period.data_fine}
                                </span>
                                <span className="text-[#C5A059] font-medium">€{period.prezzo}/notte</span>
                              </div>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => deletePricePeriod(period.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* BLOCKS TAB */}
            {activeTab === 'blocks' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-cinzel text-xl">Blocchi Date (Non Disponibilità)</h2>
                  <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#C5A059] hover:bg-[#B08D45]">
                        <Plus className="w-4 h-4 mr-2" /> Blocca Date
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Blocca Date</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleBlockSubmit} className="space-y-4">
                        <div>
                          <Label>Casetta *</Label>
                          <select
                            className="w-full border rounded-md px-3 py-2"
                            value={blockForm.unit_id}
                            onChange={(e) => setBlockForm({ ...blockForm, unit_id: e.target.value })}
                            required
                          >
                            <option value="">Seleziona...</option>
                            {units.map(u => (
                              <option key={u.id} value={u.id}>{u.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Data Inizio</Label>
                            <Input
                              type="date"
                              value={blockForm.data_inizio}
                              onChange={(e) => setBlockForm({ ...blockForm, data_inizio: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Data Fine</Label>
                            <Input
                              type="date"
                              value={blockForm.data_fine}
                              onChange={(e) => setBlockForm({ ...blockForm, data_fine: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Motivo (opzionale)</Label>
                          <Input
                            value={blockForm.motivo}
                            onChange={(e) => setBlockForm({ ...blockForm, motivo: e.target.value })}
                            placeholder="Es. Manutenzione, Uso personale..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setBlockDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" className="bg-[#C5A059] hover:bg-[#B08D45]">
                            Blocca
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {dateBlocks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-[#4A5568]">
                      Nessuna data bloccata.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {dateBlocks.map((block) => {
                      const unit = units.find(u => u.id === block.unit_id);
                      return (
                        <Card key={block.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="font-medium">{unit?.nome}</span>
                                <span className="text-sm text-[#4A5568]">
                                  {block.data_inizio} → {block.data_fine}
                                </span>
                                {block.motivo && (
                                  <span className="text-sm text-[#4A5568] italic">"{block.motivo}"</span>
                                )}
                              </div>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteBlock(block.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Edit Booking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>✏️ Modifica Prenotazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Nome Ospite *</Label>
              <Input
                value={editForm.nome_ospite}
                onChange={(e) => setEditForm({...editForm, nome_ospite: e.target.value})}
                placeholder="Mario Rossi"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email_ospite}
                  onChange={(e) => setEditForm({...editForm, email_ospite: e.target.value})}
                  placeholder="mario@email.com"
                />
              </div>
              <div>
                <Label>Telefono</Label>
                <Input
                  value={editForm.telefono_ospite}
                  onChange={(e) => setEditForm({...editForm, telefono_ospite: e.target.value})}
                  placeholder="+39 333 1234567"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in</Label>
                <Input
                  type="date"
                  value={editForm.data_arrivo}
                  onChange={(e) => setEditForm({...editForm, data_arrivo: e.target.value})}
                />
              </div>
              <div>
                <Label>Check-out</Label>
                <Input
                  type="date"
                  value={editForm.data_partenza}
                  onChange={(e) => setEditForm({...editForm, data_partenza: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Numero Ospiti</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.num_ospiti}
                  onChange={(e) => setEditForm({...editForm, num_ospiti: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Prezzo Totale (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.prezzo_totale}
                  onChange={(e) => setEditForm({...editForm, prezzo_totale: parseFloat(e.target.value) || ''})}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <Label>Stato</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              >
                <option value="pending">In Attesa</option>
                <option value="confirmed">Confermata</option>
                <option value="completed">Completata</option>
                <option value="cancelled">Cancellata</option>
              </select>
            </div>
            
            <div>
              <Label>Note</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.note}
                onChange={(e) => setEditForm({...editForm, note: e.target.value})}
                placeholder="Note sulla prenotazione..."
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={saveBookingEdit} className="bg-[#C5A059] hover:bg-[#B08D45]">
                💾 Salva Modifiche
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
