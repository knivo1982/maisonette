import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar, Users, Euro, Check, X, Home, ArrowRight, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

import { BASE_URL as API } from '../lib/api';

// Mini Calendar Component for availability
function AvailabilityCalendar({ unitId, bookedDates, onDateSelect, language }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthNames = language === 'en' 
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const dayNames = language === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    const days = [];
    
    // Empty cells for days before first day of month
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, date: null });
    }
    
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ day: i, date });
    }
    
    return days;
  };
  
  const isDateBooked = (date) => {
    if (!date || !bookedDates) return false;
    const dateStr = date.toISOString().split('T')[0];
    return bookedDates.some(range => {
      const start = new Date(range.data_arrivo);
      const end = new Date(range.data_partenza);
      return date >= start && date < end;
    });
  };
  
  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  
  const days = getDaysInMonth(currentMonth);
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {dayNames.map(day => (
          <div key={day} className="p-1 font-medium text-gray-500">{day}</div>
        ))}
        {days.map((item, index) => {
          const isBooked = isDateBooked(item.date);
          const isPast = isPastDate(item.date);
          
          return (
            <div
              key={index}
              className={`p-2 text-sm rounded ${
                !item.day ? '' :
                isPast ? 'text-gray-300' :
                isBooked ? 'bg-red-100 text-red-600 line-through' :
                'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
              }`}
              onClick={() => {
                if (item.date && !isBooked && !isPast && onDateSelect) {
                  onDateSelect(item.date);
                }
              }}
            >
              {item.day}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-50 border border-green-200 rounded"></span>
          {language === 'en' ? 'Available' : 'Disponibile'}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
          {language === 'en' ? 'Booked' : 'Occupato'}
        </span>
      </div>
    </div>
  );
}

export default function BookingPage() {
  const { t, language } = useLanguage();
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [unitAvailability, setUnitAvailability] = useState(null);
  
  const [formData, setFormData] = useState({
    data_arrivo: '',
    data_partenza: '',
    num_ospiti: 2,
    nome_ospite: '',
    email_ospite: '',
    telefono_ospite: '',
    note: ''
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  // Fetch availability when unit is selected
  useEffect(() => {
    if (selectedUnit) {
      fetchUnitAvailability(selectedUnit.id);
    }
  }, [selectedUnit]);

  const fetchUnitAvailability = async (unitId) => {
    try {
      const response = await fetch(`${API}/api/units/${unitId}/availability`);
      if (response.ok) {
        const data = await response.json();
        setUnitAvailability(data);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await fetch(`${API}/api/units`);
      if (response.ok) {
        const data = await response.json();
        setUnits(data);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    if (!selectedUnit || !formData.data_arrivo || !formData.data_partenza) {
      toast.error('Seleziona la casetta e le date');
      return;
    }

    setCheckingAvailability(true);
    try {
      const response = await fetch(
        `${API}/api/bookings/check-availability?unit_id=${selectedUnit.id}&data_arrivo=${formData.data_arrivo}&data_partenza=${formData.data_partenza}`
      );
      const data = await response.json();
      setAvailability(data);
      
      if (!data.disponibile) {
        toast.error(data.motivo || 'Date non disponibili');
      }
    } catch (error) {
      toast.error('Errore nel controllo disponibilità');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!availability?.disponibile) {
      toast.error('Verifica prima la disponibilità');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: selectedUnit.id,
          ...formData
        })
      });

      if (response.ok) {
        setBookingComplete(true);
        toast.success(language === 'en' ? 'Booking request sent!' : 'Richiesta di prenotazione inviata!');
      } else {
        const error = await response.json();
        toast.error(error.detail || (language === 'en' ? 'Booking error' : 'Errore durante la prenotazione'));
      }
    } catch (error) {
      toast.error(language === 'en' ? 'Connection error' : 'Errore di connessione');
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingComplete) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <Card className="max-w-lg w-full text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="font-cinzel text-2xl text-[#1A202C] mb-4">
                {language === 'en' ? 'Request Sent!' : 'Richiesta Inviata!'}
              </h2>
              <p className="text-[#4A5568] mb-6">
                {language === 'en' 
                  ? 'Your booking request has been received. We will contact you soon to confirm availability and arrange payment.'
                  : 'La tua richiesta di prenotazione è stata ricevuta. Ti contatteremo presto per confermare la disponibilità e organizzare il pagamento.'}
              </p>
              <div className="bg-[#F9F9F7] p-4 rounded-lg mb-6">
                <p className="text-sm text-[#4A5568]">
                  <strong>{selectedUnit?.nome}</strong><br />
                  {formData.data_arrivo} → {formData.data_partenza}<br />
                  {formData.num_ospiti} {language === 'en' ? 'guests' : 'ospiti'}<br />
                  <span className="text-[#C5A059] font-semibold">
                    {language === 'en' ? 'Total' : 'Totale'}: €{availability?.prezzo?.prezzo_totale}
                  </span>
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-[#C5A059] hover:bg-[#B08D45]"
              >
                {language === 'en' ? 'Back to Home' : 'Torna alla Home'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-4">
              {language === 'en' ? 'Book Your Stay' : 'Prenota il Tuo Soggiorno'}
            </p>
            <h1 className="font-cinzel text-4xl text-[#1A202C] mb-4">
              {language === 'en' ? 'Our Cottages' : 'Le Nostre Casette'}
            </h1>
            <p className="text-[#4A5568] max-w-2xl mx-auto">
              {language === 'en' 
                ? 'Choose your cottage and check availability. We will contact you to confirm your booking.'
                : 'Scegli la tua casetta e verifica la disponibilità. Ti contatteremo per confermare la prenotazione.'}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Unit Selection & Dates */}
            <div className="space-y-6">
              {/* Units */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-lg flex items-center gap-2">
                    <Home className="w-5 h-5 text-[#C5A059]" />
                    {language === 'en' ? '1. Choose Cottage' : '1. Scegli la Casetta'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059] mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {units.map((unit) => (
                        <div
                          key={unit.id}
                          onClick={() => {
                            setSelectedUnit(unit);
                            setAvailability(null);
                          }}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedUnit?.id === unit.id
                              ? 'border-[#C5A059] bg-[#C5A059]/5'
                              : 'border-gray-200 hover:border-[#C5A059]/50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-cinzel text-lg text-[#1A202C]">{unit.nome}</h3>
                              <p className="text-sm text-[#4A5568] mt-1">{unit.descrizione}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-[#4A5568]">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  Max {unit.capacita_max} {language === 'en' ? 'guests' : 'ospiti'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-cinzel text-2xl text-[#C5A059]">€{unit.prezzo_base}</p>
                              <p className="text-xs text-[#4A5568]">{language === 'en' ? 'per night' : 'a notte'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Availability Calendar - Show when unit is selected */}
              {selectedUnit && unitAvailability && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-cinzel text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#C5A059]" />
                      {language === 'en' ? 'Availability Calendar' : 'Calendario Disponibilità'} - {selectedUnit.nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AvailabilityCalendar
                      unitId={selectedUnit.id}
                      bookedDates={unitAvailability.bookings}
                      language={language}
                      onDateSelect={(date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        if (!formData.data_arrivo) {
                          setFormData({ ...formData, data_arrivo: dateStr });
                        } else if (!formData.data_partenza) {
                          setFormData({ ...formData, data_partenza: dateStr });
                        }
                        setAvailability(null);
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-3">
                      {language === 'en' 
                        ? 'Click on a green date to select it as check-in/check-out'
                        : 'Clicca su una data verde per selezionarla come arrivo/partenza'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#C5A059]" />
                    {language === 'en' ? '2. Select Dates' : '2. Scegli le Date'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{language === 'en' ? 'Check-in' : 'Arrivo'}</Label>
                      <Input
                        type="date"
                        value={formData.data_arrivo}
                        onChange={(e) => {
                          setFormData({ ...formData, data_arrivo: e.target.value });
                          setAvailability(null);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label>{language === 'en' ? 'Check-out' : 'Partenza'}</Label>
                      <Input
                        type="date"
                        value={formData.data_partenza}
                        onChange={(e) => {
                          setFormData({ ...formData, data_partenza: e.target.value });
                          setAvailability(null);
                        }}
                        min={formData.data_arrivo || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Numero Ospiti</Label>
                    <Input
                      type="number"
                      value={formData.num_ospiti}
                      onChange={(e) => setFormData({ ...formData, num_ospiti: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={selectedUnit?.capacita_max || 5}
                    />
                  </div>
                  <Button
                    onClick={checkAvailability}
                    disabled={!selectedUnit || !formData.data_arrivo || !formData.data_partenza || checkingAvailability}
                    className="w-full mt-4 bg-[#1A202C] hover:bg-[#2D3748]"
                  >
                    {checkingAvailability ? 'Verifico...' : 'Verifica Disponibilità'}
                  </Button>

                  {/* Availability Result */}
                  {availability && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      availability.disponibile ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      {availability.disponibile ? (
                        <>
                          <div className="flex items-center gap-2 text-green-700 mb-2">
                            <Check className="w-5 h-5" />
                            <span className="font-medium">Disponibile!</span>
                          </div>
                          <div className="text-sm text-[#4A5568]">
                            <p>{availability.prezzo?.num_notti} notti</p>
                            <p className="font-cinzel text-xl text-[#C5A059] mt-1">
                              Totale: €{availability.prezzo?.prezzo_totale}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-red-700">
                          <X className="w-5 h-5" />
                          <span>{availability.motivo}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Contact Form */}
            <Card className={!availability?.disponibile ? 'opacity-50 pointer-events-none' : ''}>
              <CardHeader>
                <CardTitle className="font-cinzel text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#C5A059]" />
                  3. I Tuoi Dati
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Nome e Cognome *</Label>
                    <Input
                      value={formData.nome_ospite}
                      onChange={(e) => setFormData({ ...formData, nome_ospite: e.target.value })}
                      required
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email_ospite}
                      onChange={(e) => setFormData({ ...formData, email_ospite: e.target.value })}
                      required
                      placeholder="mario@email.com"
                    />
                  </div>
                  <div>
                    <Label>Telefono *</Label>
                    <Input
                      type="tel"
                      value={formData.telefono_ospite}
                      onChange={(e) => setFormData({ ...formData, telefono_ospite: e.target.value })}
                      required
                      placeholder="+39 333 1234567"
                    />
                  </div>
                  <div>
                    <Label>Note (opzionale)</Label>
                    <Textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Orario di arrivo, richieste particolari..."
                      rows={3}
                    />
                  </div>

                  {availability?.disponibile && (
                    <div className="bg-[#F9F9F7] p-4 rounded-lg">
                      <h4 className="font-cinzel text-[#1A202C] mb-2">Riepilogo</h4>
                      <div className="text-sm text-[#4A5568] space-y-1">
                        <p><strong>{selectedUnit?.nome}</strong></p>
                        <p>{formData.data_arrivo} → {formData.data_partenza}</p>
                        <p>{formData.num_ospiti} ospiti • {availability.prezzo?.num_notti} notti</p>
                        <p className="font-cinzel text-xl text-[#C5A059] pt-2">
                          Totale: €{availability.prezzo?.prezzo_totale}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!availability?.disponibile || submitting}
                    className="w-full bg-[#C5A059] hover:bg-[#B08D45]"
                  >
                    {submitting ? 'Invio in corso...' : 'Invia Richiesta'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>

                  <p className="text-xs text-[#4A5568] text-center">
                    Ti contatteremo per confermare la prenotazione e organizzare il pagamento.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
