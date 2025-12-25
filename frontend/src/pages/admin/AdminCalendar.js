import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Lock, Unlock, Calendar, Home, Users, X, Plus, UserPlus, ArrowRight } from 'lucide-react';

import { API } from '../../lib/api';

export default function AdminCalendar() {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [blockReason, setBlockReason] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  
  // Nuovo: Dialog per completare blocco in prenotazione
  const [completeBlockDialog, setCompleteBlockDialog] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [blockToBookingForm, setBlockToBookingForm] = useState({
    nome_ospite: '',
    email_ospite: '',
    telefono_ospite: '',
    num_ospiti: 2,
    note: '',
    source: 'airbnb'  // Provenienza reale
  });
  
  // Nuovo: Dialog per nuova prenotazione rapida
  const [quickBookingDialog, setQuickBookingDialog] = useState(false);
  const [quickBookingForm, setQuickBookingForm] = useState({
    nome_ospite: '',
    email_ospite: '',
    telefono_ospite: '',
    data_arrivo: '',
    data_partenza: '',
    num_ospiti: 2,
    note: '',
    source: 'direct'
  });

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  // Funzione per formattare data locale in YYYY-MM-DD senza problemi di timezone
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (selectedUnit) {
      fetchAvailability();
    }
  }, [selectedUnit, currentMonth]);

  const fetchUnits = async () => {
    try {
      const response = await axios.get(`${API}/units`);
      setUnits(response.data);
      if (response.data.length > 0) {
        setSelectedUnit(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedUnit) return;
    try {
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const response = await axios.get(`${API}/units/${selectedUnit.id}/availability?month=${monthStr}`);
      setAvailability(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    const days = [];
    
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ 
        day: prevMonthDays - i, 
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false 
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ 
        day: i, 
        date: new Date(year, month, i),
        isCurrentMonth: true 
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ 
        day: i, 
        date: new Date(year, month + 1, i),
        isCurrentMonth: false 
      });
    }
    
    return days;
  };

  const getDateStatus = (date) => {
    if (!availability || !date) return { status: 'available', booking: null, block: null };
    
    // Normalizza la data corrente a stringa YYYY-MM-DD per confronto (locale, no timezone)
    const dateStr = formatDateLocal(date);
    
    const booking = availability.bookings?.find(b => {
      // Confronta le stringhe delle date direttamente
      return dateStr >= b.data_arrivo && dateStr < b.data_partenza;
    });
    
    if (booking) {
      return { status: 'booked', booking, block: null };
    }
    
    const block = availability.blocks?.find(b => {
      // Confronta le stringhe delle date direttamente
      return dateStr >= b.data_inizio && dateStr < b.data_fine;
    });
    
    if (block) {
      return { status: 'blocked', booking: null, block };
    }
    
    return { status: 'available', booking: null, block: null };
  };

  const handleDateClick = (date, status) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectionStart(date);
      setSelectedDates([date]);
    } else {
      setSelectionMode(false);
      
      if (selectionStart) {
        const start = selectionStart < date ? selectionStart : date;
        const end = selectionStart < date ? date : selectionStart;
        
        const dates = [];
        const current = new Date(start);
        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
        setSelectedDates(dates);
      }
      setSelectionStart(null);
    }
  };

  const isDateSelected = (date) => {
    return selectedDates.some(d => d.toDateString() === date.toDateString());
  };

  const blockDates = async () => {
    if (selectedDates.length === 0) {
      toast.error('Seleziona almeno una data');
      return;
    }

    const sortedDates = [...selectedDates].sort((a, b) => a - b);
    const data_inizio = sortedDates[0].toISOString().split('T')[0];
    // Add one day to data_fine for iCal compatibility (exclusive end date)
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    lastDate.setDate(lastDate.getDate() + 1);
    const data_fine = lastDate.toISOString().split('T')[0];

    try {
      await axios.post(`${API}/admin/date-blocks`, {
        unit_id: selectedUnit.id,
        data_inizio,
        data_fine,
        motivo: blockReason || 'Blocco manuale'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Date bloccate!');
      setBlockDialogOpen(false);
      setSelectedDates([]);
      setBlockReason('');
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel blocco date');
    }
  };

  const unblockDate = async (blockId) => {
    try {
      await axios.delete(`${API}/admin/date-blocks/${blockId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Blocco rimosso!');
      fetchAvailability();
    } catch (error) {
      toast.error('Errore nella rimozione del blocco');
    }
  };

  // Nuova funzione: Apri dialog per completare blocco
  const openCompleteBlockDialog = (block) => {
    setSelectedBlock(block);
    // Pre-seleziona la provenienza in base al source del blocco
    let defaultSource = 'airbnb';
    if (block.source === 'booking') defaultSource = 'booking';
    else if (block.source === 'airbnb') defaultSource = 'airbnb';
    
    setBlockToBookingForm({
      nome_ospite: '',
      email_ospite: '',
      telefono_ospite: '',
      num_ospiti: 2,
      note: block.motivo || '',
      source: defaultSource
    });
    setCompleteBlockDialog(true);
  };

  // Nuova funzione: Converti blocco in prenotazione
  const convertBlockToBooking = async () => {
    if (!blockToBookingForm.nome_ospite) {
      toast.error('Inserisci almeno il nome ospite');
      return;
    }

    // Mappa source per la nota
    const sourceLabels = {
      'airbnb': 'Airbnb',
      'booking': 'Booking.com',
      'direct': 'Diretto',
      'phone': 'Telefono',
      'whatsapp': 'WhatsApp'
    };

    try {
      // Crea la prenotazione con provenienza nelle note
      await axios.post(`${API}/admin/bookings`, {
        unit_id: selectedUnit.id,
        data_arrivo: selectedBlock.data_inizio,
        data_partenza: selectedBlock.data_fine,
        nome_ospite: blockToBookingForm.nome_ospite,
        email_ospite: blockToBookingForm.email_ospite || 'noemail@temp.com',
        telefono_ospite: blockToBookingForm.telefono_ospite || '-',
        num_ospiti: blockToBookingForm.num_ospiti,
        note: `[${sourceLabels[blockToBookingForm.source] || blockToBookingForm.source}] ${blockToBookingForm.note}`.trim(),
        status: 'confirmed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Elimina il blocco
      await axios.delete(`${API}/admin/date-blocks/${selectedBlock.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Prenotazione creata!');
      setCompleteBlockDialog(false);
      setSelectedBlock(null);
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  // Nuova funzione: Crea prenotazione rapida
  const createQuickBooking = async () => {
    if (!quickBookingForm.nome_ospite || !quickBookingForm.data_arrivo || !quickBookingForm.data_partenza) {
      toast.error('Compila nome, data arrivo e partenza');
      return;
    }

    try {
      await axios.post(`${API}/admin/bookings`, {
        unit_id: selectedUnit.id,
        data_arrivo: quickBookingForm.data_arrivo,
        data_partenza: quickBookingForm.data_partenza,
        nome_ospite: quickBookingForm.nome_ospite,
        email_ospite: quickBookingForm.email_ospite || 'noemail@temp.com',
        telefono_ospite: quickBookingForm.telefono_ospite || '-',
        num_ospiti: quickBookingForm.num_ospiti,
        note: quickBookingForm.note ? `[${quickBookingForm.source}] ${quickBookingForm.note}` : `[${quickBookingForm.source}]`,
        status: 'confirmed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Prenotazione creata!');
      setQuickBookingDialog(false);
      setQuickBookingForm({
        nome_ospite: '',
        email_ospite: '',
        telefono_ospite: '',
        data_arrivo: '',
        data_partenza: '',
        num_ospiti: 2,
        note: '',
        source: 'direct'
      });
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  // Funzione per generare messaggio WhatsApp check-in
  const generateWhatsAppMessage = (booking) => {
    const unitName = selectedUnit?.nome || 'La Maisonette';
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
Sono disponibili due parcheggi a pagamento, entrambi con tariffa di *€1 all'ora* o *€5 per l'intera giornata*.

• *Parcheggio Ovest* – https://maps.app.goo.gl/sh6JMTtmLRX7gq4w6
• *Parcheggio Est* – https://maps.app.goo.gl/CKK8QL8kyHHeAB5Z7

🕒 *Orari di check-in e check-out*
• *Check-in:* dalle ore *15:00* in poi
• *Check-out:* entro le ore *10:00*

🏠 Per lei è stata riservata *LA MAISONETTE ${unitNumber}*
🔑 Il codice d'ingresso è *${codiceIngresso}*

📶 *Wi-Fi gratuito*
Password indicata sul mobile all'ingresso.

☕ *Ristoro mattutino*
Macchina caffè, tè, tisane, marmellate, fette biscottate e cornetti disponibili.

🍳 *Cucina attrezzata*
Completa di tutto. Acqua fresca in frigo.

🧼 *Cambio biancheria*
Ogni 3 giorni, tra le 11:00 e le 15:00.

📋 *Check-in obbligatorio*
App: https://lamaisonettepaestum.com
Codice: *${booking.codice_prenotazione || 'da comunicare'}*

📞 *Contatti*
📱 +39 393 495 7532
📱 +39 388 168 1287
💬 WhatsApp: +39 375 517 2370

🙏 *Grazie per aver scelto La Maisonette di Paestum!*

Con affetto,
Antonella`;

    return message;
  };

  const sendWhatsAppToBooking = (booking) => {
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

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = getDaysInMonth();

  // Filtra blocchi che sembrano prenotazioni (Reserved, da Airbnb/Booking)
  const reservedBlocks = availability?.blocks?.filter(b => 
    b.motivo?.toLowerCase().includes('reserved') || 
    b.source === 'airbnb' || 
    b.source === 'booking'
  ) || [];

  return (
    <AdminLayout title="Calendario Disponibilità">
      <div className="space-y-6">
        {/* Header con pulsanti */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {units.map(unit => (
              <Button
                key={unit.id}
                variant={selectedUnit?.id === unit.id ? 'default' : 'outline'}
                className={selectedUnit?.id === unit.id ? 'bg-[#C5A059] hover:bg-[#B08D45]' : ''}
                onClick={() => {
                  setSelectedUnit(unit);
                  setSelectedDates([]);
                  setSelectionMode(false);
                }}
              >
                <Home className="w-4 h-4 mr-2" />
                {unit.nome}
              </Button>
            ))}
          </div>
          
          {/* Pulsante Nuova Prenotazione Rapida */}
          <Button 
            onClick={() => setQuickBookingDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Prenotazione
          </Button>
        </div>

        {selectedUnit && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-cinzel flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#C5A059]" />
                    {selectedUnit.nome}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={prevMonth}>
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="font-medium min-w-[150px] text-center">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <Button variant="ghost" size="sm" onClick={nextMonth}>
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((item, index) => {
                    const { status, booking, block } = getDateStatus(item.date);
                    const isSelected = isDateSelected(item.date);
                    const isPast = item.date < new Date(new Date().setHours(0,0,0,0));
                    
                    return (
                      <div
                        key={index}
                        onClick={() => !isPast && item.isCurrentMonth && handleDateClick(item.date, status)}
                        className={`
                          relative p-2 min-h-[70px] border rounded-lg cursor-pointer transition-all
                          ${!item.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                          ${isPast && item.isCurrentMonth ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                          ${status === 'booked' ? 'bg-blue-100 border-blue-300' : ''}
                          ${status === 'blocked' ? 'bg-red-100 border-red-300' : ''}
                          ${status === 'available' && item.isCurrentMonth && !isPast ? 'bg-green-50 border-green-200 hover:bg-green-100' : ''}
                          ${isSelected ? 'ring-2 ring-[#C5A059] ring-offset-1' : ''}
                        `}
                      >
                        <span className={`text-sm font-medium ${
                          status === 'booked' ? 'text-blue-700' :
                          status === 'blocked' ? 'text-red-700' :
                          ''
                        }`}>
                          {item.day}
                        </span>
                        
                        {status === 'booked' && booking && (
                          <div className="mt-1">
                            <span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded truncate block">
                              {booking.nome_ospite?.split(' ')[0] || 'Prenotato'}
                            </span>
                          </div>
                        )}
                        
                        {status === 'blocked' && (
                          <div className="mt-1">
                            <Lock className="w-3 h-3 text-red-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-green-50 border border-green-200 rounded"></span>
                    Disponibile
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></span>
                    Prenotato
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span>
                    Bloccato
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></span>
                    Passato
                  </span>
                </div>

                {/* Selection info */}
                {selectedDates.length > 0 && (
                  <div className="mt-4 p-3 bg-[#C5A059]/10 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <strong>{selectedDates.length}</strong> {selectedDates.length === 1 ? 'giorno selezionato' : 'giorni selezionati'}
                        {selectedDates.length > 0 && (
                          <span className="text-gray-600 ml-2">
                            ({selectedDates[0].toLocaleDateString('it-IT')} 
                            {selectedDates.length > 1 && ` - ${selectedDates[selectedDates.length-1].toLocaleDateString('it-IT')}`})
                          </span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDates([]);
                            setSelectionMode(false);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Annulla
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setBlockDialogOpen(true)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Blocca Date
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  💡 Clicca su una data per iniziare la selezione, poi clicca su un'altra data per completare l'intervallo
                </p>
              </CardContent>
            </Card>

            {/* Sidebar - Blocks & Bookings */}
            <div className="space-y-4">
              {/* Blocchi da completare (Reserved da iCal) */}
              {reservedBlocks.length > 0 && (
                <Card className="border-orange-300 bg-orange-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                      <UserPlus className="w-4 h-4" />
                      Da Completare ({reservedBlocks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-orange-600 mb-3">
                      Prenotazioni da Airbnb/Booking - clicca per aggiungere i dettagli ospite
                    </p>
                    <div className="space-y-2">
                      {reservedBlocks.slice(0, 5).map(block => (
                        <div 
                          key={block.id} 
                          className="p-3 bg-white rounded-lg border border-orange-200 cursor-pointer hover:border-orange-400 transition-colors"
                          onClick={() => openCompleteBlockDialog(block)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-orange-800">
                                {new Date(block.data_inizio).toLocaleDateString('it-IT')} → {new Date(block.data_fine).toLocaleDateString('it-IT')}
                              </p>
                              <p className="text-xs text-orange-600 mt-0.5">
                                {block.source === 'airbnb' ? '🏠 Airbnb' : block.source === 'booking' ? '🅱️ Booking' : block.motivo}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-orange-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Blocks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-500" />
                    Blocchi Attivi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availability?.blocks?.filter(b => !reservedBlocks.includes(b)).length > 0 ? (
                    <div className="space-y-2">
                      {availability.blocks.filter(b => !reservedBlocks.includes(b)).map(block => (
                        <div key={block.id} className="p-3 bg-red-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-red-700">
                                {new Date(block.data_inizio).toLocaleDateString('it-IT')} - {new Date(block.data_fine).toLocaleDateString('it-IT')}
                              </p>
                              {block.motivo && (
                                <p className="text-xs text-red-600 mt-1">{block.motivo}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unblockDate(block.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                            >
                              <Unlock className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nessun blocco manuale</p>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Prenotazioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availability?.bookings?.length > 0 ? (
                    <div className="space-y-2">
                      {availability.bookings.slice(0, 5).map(booking => (
                        <div key={booking.id} className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-700">
                            {booking.nome_ospite}
                          </p>
                          <p className="text-xs text-blue-600">
                            {new Date(booking.data_arrivo).toLocaleDateString('it-IT')} - {new Date(booking.data_partenza).toLocaleDateString('it-IT')}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confermata' : 
                             booking.status === 'pending' ? 'In attesa' : booking.status}
                          </span>
                          {booking.telefono_ospite && booking.telefono_ospite !== '-' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 w-full text-green-600 border-green-600 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                sendWhatsAppToBooking(booking);
                              }}
                            >
                              💬 Invia WhatsApp
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nessuna prenotazione</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Block Dialog */}
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Blocca Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  Stai per bloccare <strong>{selectedDates.length}</strong> giorni per <strong>{selectedUnit?.nome}</strong>
                </p>
                {selectedDates.length > 0 && (
                  <p className="text-sm text-[#C5A059] mt-1">
                    Dal {selectedDates[0]?.toLocaleDateString('it-IT')} al {selectedDates[selectedDates.length-1]?.toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
              <div>
                <Label>Motivo (opzionale)</Label>
                <Textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Es: Manutenzione, Uso personale, ecc."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={blockDates} className="bg-red-600 hover:bg-red-700">
                  <Lock className="w-4 h-4 mr-2" />
                  Conferma Blocco
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Complete Block Dialog - Converti blocco iCal in prenotazione */}
        <Dialog open={completeBlockDialog} onOpenChange={setCompleteBlockDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-500" />
                Completa Prenotazione
              </DialogTitle>
              <DialogDescription>
                Aggiungi i dettagli dell'ospite per questa prenotazione
              </DialogDescription>
            </DialogHeader>
            {selectedBlock && (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-800">
                    📅 {new Date(selectedBlock.data_inizio).toLocaleDateString('it-IT')} → {new Date(selectedBlock.data_fine).toLocaleDateString('it-IT')}
                  </p>
                </div>
                
                {/* Selezione provenienza REALE */}
                <div>
                  <Label>Provenienza reale</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[
                      { key: 'airbnb', label: '🏠 Airbnb' },
                      { key: 'booking', label: '🅱️ Booking' },
                      { key: 'direct', label: '👤 Diretto' },
                      { key: 'phone', label: '📞 Telefono' },
                      { key: 'whatsapp', label: '💬 WhatsApp' }
                    ].map(src => (
                      <Button
                        key={src.key}
                        type="button"
                        size="sm"
                        variant={blockToBookingForm.source === src.key ? 'default' : 'outline'}
                        className={blockToBookingForm.source === src.key ? 'bg-[#C5A059]' : ''}
                        onClick={() => setBlockToBookingForm({...blockToBookingForm, source: src.key})}
                      >
                        {src.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Nome Ospite *</Label>
                  <Input
                    value={blockToBookingForm.nome_ospite}
                    onChange={(e) => setBlockToBookingForm({...blockToBookingForm, nome_ospite: e.target.value})}
                    placeholder="Mario Rossi"
                  />
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={blockToBookingForm.email_ospite}
                    onChange={(e) => setBlockToBookingForm({...blockToBookingForm, email_ospite: e.target.value})}
                    placeholder="mario@email.com"
                  />
                </div>
                
                <div>
                  <Label>Telefono</Label>
                  <Input
                    value={blockToBookingForm.telefono_ospite}
                    onChange={(e) => setBlockToBookingForm({...blockToBookingForm, telefono_ospite: e.target.value})}
                    placeholder="+39 333 1234567"
                  />
                </div>
                
                <div>
                  <Label>Numero Ospiti</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={blockToBookingForm.num_ospiti}
                    onChange={(e) => setBlockToBookingForm({...blockToBookingForm, num_ospiti: parseInt(e.target.value)})}
                  />
                </div>
                
                <div>
                  <Label>Note</Label>
                  <Textarea
                    value={blockToBookingForm.note}
                    onChange={(e) => setBlockToBookingForm({...blockToBookingForm, note: e.target.value})}
                    placeholder="Note sulla prenotazione..."
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCompleteBlockDialog(false)}>
                    Annulla
                  </Button>
                  <Button onClick={convertBlockToBooking} className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Crea Prenotazione
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quick Booking Dialog - Nuova prenotazione rapida */}
        <Dialog open={quickBookingDialog} onOpenChange={setQuickBookingDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-500" />
                Nuova Prenotazione Rapida
              </DialogTitle>
              <DialogDescription>
                Inserisci una nuova prenotazione (telefono, WhatsApp, diretta)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Provenienza</Label>
                <div className="flex gap-2 mt-1">
                  {['direct', 'phone', 'whatsapp', 'airbnb', 'booking'].map(source => (
                    <Button
                      key={source}
                      type="button"
                      size="sm"
                      variant={quickBookingForm.source === source ? 'default' : 'outline'}
                      className={quickBookingForm.source === source ? 'bg-[#C5A059]' : ''}
                      onClick={() => setQuickBookingForm({...quickBookingForm, source})}
                    >
                      {source === 'direct' ? '👤 Diretto' :
                       source === 'phone' ? '📞 Tel' :
                       source === 'whatsapp' ? '💬 WA' :
                       source === 'airbnb' ? '🏠 Airbnb' :
                       '🅱️ Booking'}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Nome Ospite *</Label>
                <Input
                  value={quickBookingForm.nome_ospite}
                  onChange={(e) => setQuickBookingForm({...quickBookingForm, nome_ospite: e.target.value})}
                  placeholder="Mario Rossi"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Check-in *</Label>
                  <Input
                    type="date"
                    value={quickBookingForm.data_arrivo}
                    onChange={(e) => setQuickBookingForm({...quickBookingForm, data_arrivo: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Check-out *</Label>
                  <Input
                    type="date"
                    value={quickBookingForm.data_partenza}
                    onChange={(e) => setQuickBookingForm({...quickBookingForm, data_partenza: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={quickBookingForm.email_ospite}
                  onChange={(e) => setQuickBookingForm({...quickBookingForm, email_ospite: e.target.value})}
                  placeholder="mario@email.com"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefono</Label>
                  <Input
                    value={quickBookingForm.telefono_ospite}
                    onChange={(e) => setQuickBookingForm({...quickBookingForm, telefono_ospite: e.target.value})}
                    placeholder="+39 333..."
                  />
                </div>
                <div>
                  <Label>Ospiti</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={quickBookingForm.num_ospiti}
                    onChange={(e) => setQuickBookingForm({...quickBookingForm, num_ospiti: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div>
                <Label>Note</Label>
                <Textarea
                  value={quickBookingForm.note}
                  onChange={(e) => setQuickBookingForm({...quickBookingForm, note: e.target.value})}
                  placeholder="Note sulla prenotazione..."
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setQuickBookingDialog(false)}>
                  Annulla
                </Button>
                <Button onClick={createQuickBooking} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Prenotazione
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
