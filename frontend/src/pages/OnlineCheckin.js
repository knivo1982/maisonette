import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  User, Calendar, Home, FileText, CheckCircle2, AlertCircle, Users, ChevronRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OnlineCheckin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkinData, setCheckinData] = useState(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  
  const [form, setForm] = useState({
    ospite_principale: {
      nome: '',
      cognome: '',
      data_nascita: '',
      luogo_nascita: '',
      nazionalita: 'Italiana',
      documento_tipo: 'carta_identita',
      documento_numero: ''
    },
    altri_ospiti: [],
    accettazione_regole: false,
    firma_digitale: false
  });

  useEffect(() => {
    fetchCheckinData();
  }, [token]);

  const fetchCheckinData = async () => {
    try {
      const response = await axios.get(`${API}/checkin/${token}`);
      setCheckinData(response.data);
      
      if (response.data.checkin_status === 'completed') {
        setStep(4); // Already completed
      }
      
      // Pre-fill name if available
      if (response.data.booking?.nome_ospite) {
        const parts = response.data.booking.nome_ospite.split(' ');
        setForm(prev => ({
          ...prev,
          ospite_principale: {
            ...prev.ospite_principale,
            nome: parts[0] || '',
            cognome: parts.slice(1).join(' ') || ''
          }
        }));
      }
      
      // Add empty slots for additional guests
      const numOspiti = response.data.booking?.num_ospiti || 1;
      if (numOspiti > 1) {
        const altriOspiti = [];
        for (let i = 1; i < numOspiti; i++) {
          altriOspiti.push({
            nome: '',
            cognome: '',
            data_nascita: '',
            nazionalita: 'Italiana'
          });
        }
        setForm(prev => ({ ...prev, altri_ospiti: altriOspiti }));
      }
    } catch (error) {
      setError('Link non valido o scaduto');
    } finally {
      setLoading(false);
    }
  };

  const updateOspitePrincipale = (field, value) => {
    setForm(prev => ({
      ...prev,
      ospite_principale: { ...prev.ospite_principale, [field]: value }
    }));
  };

  const updateAltroOspite = (index, field, value) => {
    const newAltri = [...form.altri_ospiti];
    newAltri[index] = { ...newAltri[index], [field]: value };
    setForm(prev => ({ ...prev, altri_ospiti: newAltri }));
  };

  const validateStep = (stepNum) => {
    if (stepNum === 1) {
      const { nome, cognome, data_nascita, documento_numero } = form.ospite_principale;
      if (!nome || !cognome || !data_nascita || !documento_numero) {
        toast.error('Compila tutti i campi obbligatori');
        return false;
      }
    }
    if (stepNum === 3) {
      if (!form.accettazione_regole) {
        toast.error('Devi accettare il regolamento');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const submitCheckin = async () => {
    if (!validateStep(3)) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/checkin/${token}`, form);
      toast.success('Check-in completato!');
      setStep(4);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante il check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d5] flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A059]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d5] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Errore</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d5] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-cinzel text-3xl text-[#1A202C] mb-2">La Maisonette di Paestum</h1>
          <p className="text-gray-600">Check-in Online</p>
        </div>

        {/* Booking Info */}
        {checkinData?.booking && step < 4 && (
          <Card className="mb-6 bg-[#C5A059]/10 border-[#C5A059]/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Home className="w-8 h-8 text-[#C5A059]" />
                <div>
                  <p className="font-medium">{checkinData.unit?.nome || 'La Maisonette'}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(checkinData.booking.data_arrivo).toLocaleDateString('it-IT')} → {new Date(checkinData.booking.data_partenza).toLocaleDateString('it-IT')}
                    <span className="mx-2">•</span>
                    {checkinData.booking.num_ospiti} ospiti
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Steps */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'bg-[#C5A059] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-[#C5A059]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Ospite Principale */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#C5A059]" />
                Ospite Principale
              </CardTitle>
              <CardDescription>Inserisci i dati dell'intestatario della prenotazione</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={form.ospite_principale.nome}
                    onChange={(e) => updateOspitePrincipale('nome', e.target.value)}
                    placeholder="Mario"
                  />
                </div>
                <div>
                  <Label>Cognome *</Label>
                  <Input
                    value={form.ospite_principale.cognome}
                    onChange={(e) => updateOspitePrincipale('cognome', e.target.value)}
                    placeholder="Rossi"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data di Nascita *</Label>
                  <Input
                    type="date"
                    value={form.ospite_principale.data_nascita}
                    onChange={(e) => updateOspitePrincipale('data_nascita', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Luogo di Nascita *</Label>
                  <Input
                    value={form.ospite_principale.luogo_nascita}
                    onChange={(e) => updateOspitePrincipale('luogo_nascita', e.target.value)}
                    placeholder="Roma"
                  />
                </div>
              </div>
              
              <div>
                <Label>Nazionalità *</Label>
                <Input
                  value={form.ospite_principale.nazionalita}
                  onChange={(e) => updateOspitePrincipale('nazionalita', e.target.value)}
                  placeholder="Italiana"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo Documento *</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.ospite_principale.documento_tipo}
                    onChange={(e) => updateOspitePrincipale('documento_tipo', e.target.value)}
                  >
                    <option value="carta_identita">Carta d'Identità</option>
                    <option value="passaporto">Passaporto</option>
                    <option value="patente">Patente di Guida</option>
                  </select>
                </div>
                <div>
                  <Label>Numero Documento *</Label>
                  <Input
                    value={form.ospite_principale.documento_numero}
                    onChange={(e) => updateOspitePrincipale('documento_numero', e.target.value)}
                    placeholder="AA1234567"
                  />
                </div>
              </div>
              
              <Button onClick={nextStep} className="w-full bg-[#C5A059] hover:bg-[#B08A3E]">
                Continua
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Altri Ospiti */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C5A059]" />
                Altri Ospiti
              </CardTitle>
              <CardDescription>
                {form.altri_ospiti.length > 0 
                  ? 'Inserisci i dati degli altri ospiti' 
                  : 'Non ci sono altri ospiti da registrare'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.altri_ospiti.map((ospite, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-medium text-gray-700">Ospite {idx + 2}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={ospite.nome}
                        onChange={(e) => updateAltroOspite(idx, 'nome', e.target.value)}
                        placeholder="Nome"
                      />
                    </div>
                    <div>
                      <Label>Cognome</Label>
                      <Input
                        value={ospite.cognome}
                        onChange={(e) => updateAltroOspite(idx, 'cognome', e.target.value)}
                        placeholder="Cognome"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Data di Nascita</Label>
                      <Input
                        type="date"
                        value={ospite.data_nascita}
                        onChange={(e) => updateAltroOspite(idx, 'data_nascita', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Nazionalità</Label>
                      <Input
                        value={ospite.nazionalita}
                        onChange={(e) => updateAltroOspite(idx, 'nazionalita', e.target.value)}
                        placeholder="Italiana"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {form.altri_ospiti.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Soggiorno per 1 persona</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  Indietro
                </Button>
                <Button onClick={nextStep} className="flex-1 bg-[#C5A059] hover:bg-[#B08A3E]">
                  Continua
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Regolamento e Conferma */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C5A059]" />
                Regolamento della Casa
              </CardTitle>
              <CardDescription>Leggi e accetta il regolamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* House Rules */}
              <div className="max-h-60 overflow-y-auto border rounded-lg p-4 bg-gray-50 space-y-3">
                {checkinData?.house_rules?.map((rule, idx) => (
                  <div key={idx}>
                    <h4 className="font-medium text-gray-800">{rule.titolo}</h4>
                    <p className="text-sm text-gray-600">{rule.contenuto}</p>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Checkbox
                    id="accettazione"
                    checked={form.accettazione_regole}
                    onCheckedChange={(checked) => setForm({...form, accettazione_regole: checked})}
                  />
                  <label htmlFor="accettazione" className="text-sm text-gray-700 cursor-pointer">
                    Dichiaro di aver letto e accetto il regolamento della struttura *
                  </label>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Checkbox
                    id="firma"
                    checked={form.firma_digitale}
                    onCheckedChange={(checked) => setForm({...form, firma_digitale: checked})}
                  />
                  <label htmlFor="firma" className="text-sm text-gray-700 cursor-pointer">
                    Confermo che i dati inseriti sono corretti (firma digitale)
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  Indietro
                </Button>
                <Button 
                  onClick={submitCheckin} 
                  disabled={submitting || !form.accettazione_regole}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? 'Invio in corso...' : 'Completa Check-in'}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Completato */}
        {step === 4 && (
          <Card>
            <CardContent className="pt-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Check-in Completato!</h2>
              <p className="text-gray-600 mb-6">
                Grazie per aver completato il check-in online. 
                Ti aspettiamo a La Maisonette di Paestum!
              </p>
              
              {checkinData?.booking && (
                <div className="p-4 bg-[#C5A059]/10 rounded-lg text-left">
                  <h3 className="font-medium text-[#C5A059] mb-2">Riepilogo prenotazione:</h3>
                  <p className="text-sm text-gray-700">
                    <strong>Check-in:</strong> {new Date(checkinData.booking.data_arrivo).toLocaleDateString('it-IT')} dalle 15:00
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Check-out:</strong> {new Date(checkinData.booking.data_partenza).toLocaleDateString('it-IT')} entro le 10:00
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mt-6">
                Per qualsiasi domanda contattaci al +39 393 4957532
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
