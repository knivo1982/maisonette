import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import axios from 'axios';
import { toast } from 'sonner';
import { CalendarIcon, Users, Check, Upload, Image as ImageIcon, Plus, Trash2, User, Mail, Key } from 'lucide-react';
import { useEffect } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DOCUMENT_TYPES = [
  { value: 'carta_identita', label: "Carta d'Identità" },
  { value: 'passaporto', label: 'Passaporto' },
  { value: 'patente', label: 'Patente di Guida' },
];

const NATIONALITIES = [
  'Italiana', 'Tedesca', 'Francese', 'Inglese', 'Spagnola', 'Americana', 
  'Olandese', 'Belga', 'Svizzera', 'Austriaca', 'Altra'
];

export default function CheckInPage() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [arrivo, setArrivo] = useState(null);
  const [partenza, setPartenza] = useState(null);
  const [numOspiti, setNumOspiti] = useState('1');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Campi per validazione prenotazione
  const [emailPrenotazione, setEmailPrenotazione] = useState('');
  const [codicePrenotazione, setCodicePrenotazione] = useState('');
  
  // Ospite principale
  const [ospitePrincipale, setOspitePrincipale] = useState({
    nome: '',
    cognome: '',
    data_nascita: '',
    luogo_nascita: '',
    nazionalita: 'Italiana',
    tipo_documento: 'carta_identita',
    numero_documento: '',
    scadenza_documento: '',
    foto_fronte_url: '',
    foto_retro_url: ''
  });
  
  // Accompagnatori
  const [accompagnatori, setAccompagnatori] = useState([]);
  
  // Upload state
  const [uploadingFronte, setUploadingFronte] = useState(false);
  const [uploadingRetro, setUploadingRetro] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
    // Pre-fill with user data
    if (user) {
      setOspitePrincipale(prev => ({
        ...prev,
        nome: user.nome || '',
        cognome: user.cognome || ''
      }));
    }
  }, [user, authLoading, navigate]);

  const handleUpload = async (file, type) => {
    if (!file) return;
    
    const setUploading = type === 'fronte' ? setUploadingFronte : setUploadingRetro;
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload/document`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000 // 120 second timeout for slow connections
      });
      
      const url = response.data.url;
      setOspitePrincipale(prev => ({
        ...prev,
        [type === 'fronte' ? 'foto_fronte_url' : 'foto_retro_url']: url
      }));
      toast.success(`Foto ${type} caricata!`);
    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        toast.error('Errore di rete. Verifica la connessione e riprova.');
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Timeout: il caricamento ha impiegato troppo tempo.');
      } else {
        toast.error(error.response?.data?.detail || 'Errore nel caricamento. Riprova.');
      }
    } finally {
      setUploading(false);
    }
  };

  const addAccompagnatore = () => {
    if (accompagnatori.length < parseInt(numOspiti) - 1) {
      setAccompagnatori([...accompagnatori, {
        nome: '',
        cognome: '',
        data_nascita: '',
        luogo_nascita: '',
        nazionalita: 'Italiana',
        tipo_documento: 'carta_identita',
        numero_documento: ''
      }]);
    }
  };

  const updateAccompagnatore = (index, field, value) => {
    const updated = [...accompagnatori];
    updated[index][field] = value;
    setAccompagnatori(updated);
  };

  const removeAccompagnatore = (index) => {
    setAccompagnatori(accompagnatori.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verifica email o codice prenotazione
    if (!emailPrenotazione && !codicePrenotazione) {
      toast.error('Inserisci l\'email o il codice della prenotazione');
      return;
    }
    
    if (!arrivo || !partenza) {
      toast.error('Seleziona le date di arrivo e partenza');
      return;
    }

    if (partenza <= arrivo) {
      toast.error('La data di partenza deve essere successiva all\'arrivo');
      return;
    }

    if (!ospitePrincipale.nome || !ospitePrincipale.cognome || !ospitePrincipale.numero_documento) {
      toast.error('Compila tutti i dati dell\'ospite principale');
      return;
    }

    if (!ospitePrincipale.foto_fronte_url || !ospitePrincipale.foto_retro_url) {
      toast.error('Carica le foto fronte e retro del documento');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/checkin`, {
        email_prenotazione: emailPrenotazione || null,
        codice_prenotazione: codicePrenotazione || null,
        data_arrivo: format(arrivo, 'yyyy-MM-dd'),
        data_partenza: format(partenza, 'yyyy-MM-dd'),
        num_ospiti: parseInt(numOspiti),
        note: note || null,
        ospite_principale: ospitePrincipale,
        accompagnatori: accompagnatori
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(true);
      toast.success('Check-in effettuato con successo!');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante il check-in');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="font-cinzel text-3xl text-[#1A202C] mb-4">
            Check-in Completato!
          </h1>
          <p className="font-manrope text-[#4A5568] mb-2">
            Il tuo check-in è stato registrato con successo.
          </p>
          <p className="font-manrope text-sm text-[#4A5568]">
            Riceverai una conferma quando lo staff verificherà la prenotazione.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
            Soggiorno
          </p>
          <h1 className="font-cinzel text-4xl text-[#1A202C] mb-4">
            Effettua il Check-in
          </h1>
          <p className="font-manrope text-[#4A5568]">
            Compila i dati del soggiorno e carica i documenti degli ospiti
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-cinzel ${
                  currentStep >= step 
                    ? 'bg-[#C5A059] text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-1 mx-2 ${currentStep > step ? 'bg-[#C5A059]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Date e numero ospiti */}
          {currentStep === 1 && (
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle className="font-cinzel text-xl">Verifica Prenotazione</CardTitle>
                <CardDescription className="font-manrope">
                  Inserisci i dati della prenotazione e le date del soggiorno
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sezione verifica prenotazione */}
                <div className="bg-[#F9F9F7] p-4 rounded-lg border border-[#C5A059]/20">
                  <p className="font-manrope text-sm text-[#4A5568] mb-4">
                    Inserisci l'email o il codice della tua prenotazione per procedere con il check-in
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#C5A059]" />
                        Email Prenotazione
                      </Label>
                      <Input
                        type="email"
                        placeholder="esempio@email.com"
                        value={emailPrenotazione}
                        onChange={(e) => setEmailPrenotazione(e.target.value)}
                        className="border-[#E2E8F0]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#C5A059]" />
                        Codice Prenotazione
                      </Label>
                      <Input
                        placeholder="MDP-XXXXXX"
                        value={codicePrenotazione}
                        onChange={(e) => setCodicePrenotazione(e.target.value.toUpperCase())}
                        className="border-[#E2E8F0] uppercase"
                      />
                    </div>
                  </div>
                  <p className="font-manrope text-xs text-[#718096] mt-2">
                    * È sufficiente inserire uno dei due campi
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Data di Arrivo</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal border-[#E2E8F0] ${!arrivo && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-[#C5A059]" />
                          {arrivo ? format(arrivo, 'dd MMMM yyyy', { locale: it }) : 'Seleziona data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={arrivo}
                          onSelect={setArrivo}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data di Partenza</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal border-[#E2E8F0] ${!partenza && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-[#C5A059]" />
                          {partenza ? format(partenza, 'dd MMMM yyyy', { locale: it }) : 'Seleziona data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={partenza}
                          onSelect={setPartenza}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date <= (arrivo || today);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Numero di Ospiti</Label>
                  <Select value={numOspiti} onValueChange={(v) => {
                    setNumOspiti(v);
                    // Rimuovi accompagnatori extra
                    if (accompagnatori.length >= parseInt(v)) {
                      setAccompagnatori(accompagnatori.slice(0, parseInt(v) - 1));
                    }
                  }}>
                    <SelectTrigger className="border-[#E2E8F0]">
                      <Users className="w-4 h-4 mr-2 text-[#C5A059]" />
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} {n === 1 ? 'ospite' : 'ospiti'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Note (opzionale)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Orario di arrivo previsto, richieste speciali..."
                    className="border-[#E2E8F0]"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!arrivo || !partenza}
                  className="w-full bg-[#C5A059] hover:bg-[#B08D45]"
                >
                  Continua
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Ospite Principale */}
          {currentStep === 2 && (
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle className="font-cinzel text-xl flex items-center gap-2">
                  <User className="w-5 h-5 text-[#C5A059]" />
                  Ospite Principale
                </CardTitle>
                <CardDescription className="font-manrope">
                  Inserisci i dati e carica le foto del documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={ospitePrincipale.nome}
                      onChange={(e) => setOspitePrincipale({...ospitePrincipale, nome: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Cognome *</Label>
                    <Input
                      value={ospitePrincipale.cognome}
                      onChange={(e) => setOspitePrincipale({...ospitePrincipale, cognome: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Data di Nascita *</Label>
                    <Input
                      type="date"
                      value={ospitePrincipale.data_nascita}
                      onChange={(e) => setOspitePrincipale({...ospitePrincipale, data_nascita: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Luogo di Nascita *</Label>
                    <Input
                      value={ospitePrincipale.luogo_nascita}
                      onChange={(e) => setOspitePrincipale({...ospitePrincipale, luogo_nascita: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Nazionalità *</Label>
                    <Select 
                      value={ospitePrincipale.nazionalita} 
                      onValueChange={(v) => setOspitePrincipale({...ospitePrincipale, nazionalita: v})}
                    >
                      <SelectTrigger className="border-[#E2E8F0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map(n => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo Documento *</Label>
                    <Select 
                      value={ospitePrincipale.tipo_documento} 
                      onValueChange={(v) => setOspitePrincipale({...ospitePrincipale, tipo_documento: v})}
                    >
                      <SelectTrigger className="border-[#E2E8F0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Numero Documento *</Label>
                    <Input
                      value={ospitePrincipale.numero_documento}
                      onChange={(e) => setOspitePrincipale({...ospitePrincipale, numero_documento: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Scadenza Documento *</Label>
                    <Input
                      type="date"
                      value={ospitePrincipale.scadenza_documento}
                      onChange={(e) => setOspitePrincipale({...ospitePrincipale, scadenza_documento: e.target.value})}
                      required
                    />
                  </div>
                </div>

                {/* Document Photos - Optional */}
                <div className="border-t pt-6 mt-6">
                  <Label className="text-base font-medium mb-2 block">
                    Foto Documento (Opzionale)
                  </Label>
                  <p className="text-sm text-gray-500 mb-4">
                    Se hai già le foto del documento, puoi caricarle dalla galleria
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                      ospitePrincipale.foto_fronte_url ? 'border-green-500 bg-green-50' : 'border-gray-300'
                    }`}>
                      {ospitePrincipale.foto_fronte_url ? (
                        <>
                          <Check className="w-8 h-8 text-green-600 mx-auto mb-1" />
                          <p className="text-sm text-green-700">Fronte OK</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-700 mb-2">Fronte</p>
                          <label className="inline-block bg-[#C5A059] text-white px-3 py-1.5 rounded text-xs cursor-pointer">
                            Carica dalla Libreria
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.heic,.heif,.webp"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'fronte')}
                            />
                          </label>
                        </>
                      )}
                    </div>
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                      ospitePrincipale.foto_retro_url ? 'border-green-500 bg-green-50' : 'border-gray-300'
                    }`}>
                      {ospitePrincipale.foto_retro_url ? (
                        <>
                          <Check className="w-8 h-8 text-green-600 mx-auto mb-1" />
                          <p className="text-sm text-green-700">Retro OK</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-700 mb-2">Retro</p>
                          <label className="inline-block bg-[#C5A059] text-white px-3 py-1.5 rounded text-xs cursor-pointer">
                            Carica dalla Libreria
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.heic,.heif,.webp"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'retro')}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    Indietro
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={!ospitePrincipale.nome || !ospitePrincipale.cognome || !ospitePrincipale.numero_documento}
                    className="flex-1 bg-[#C5A059] hover:bg-[#B08D45]"
                  >
                    {parseInt(numOspiti) > 1 ? 'Continua con Accompagnatori' : 'Riepilogo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Accompagnatori e Riepilogo */}
          {currentStep === 3 && (
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle className="font-cinzel text-xl">
                  {parseInt(numOspiti) > 1 ? 'Accompagnatori e Riepilogo' : 'Riepilogo Check-in'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Accompagnatori section */}
                {parseInt(numOspiti) > 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Accompagnatori ({accompagnatori.length}/{parseInt(numOspiti) - 1})
                      </Label>
                      {accompagnatori.length < parseInt(numOspiti) - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAccompagnatore}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Aggiungi
                        </Button>
                      )}
                    </div>

                    {accompagnatori.map((acc, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-medium">Accompagnatore {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAccompagnatore(index)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Nome *</Label>
                            <Input
                              value={acc.nome}
                              onChange={(e) => updateAccompagnatore(index, 'nome', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Cognome *</Label>
                            <Input
                              value={acc.cognome}
                              onChange={(e) => updateAccompagnatore(index, 'cognome', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Data di Nascita *</Label>
                            <Input
                              type="date"
                              value={acc.data_nascita}
                              onChange={(e) => updateAccompagnatore(index, 'data_nascita', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Luogo di Nascita *</Label>
                            <Input
                              value={acc.luogo_nascita}
                              onChange={(e) => updateAccompagnatore(index, 'luogo_nascita', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Nazionalità *</Label>
                            <Select 
                              value={acc.nazionalita} 
                              onValueChange={(v) => updateAccompagnatore(index, 'nazionalita', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {NATIONALITIES.map(n => (
                                  <SelectItem key={n} value={n}>{n}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Tipo Documento</Label>
                            <Select 
                              value={acc.tipo_documento} 
                              onValueChange={(v) => updateAccompagnatore(index, 'tipo_documento', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_TYPES.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2">
                            <Label>Numero Documento</Label>
                            <Input
                              value={acc.numero_documento}
                              onChange={(e) => updateAccompagnatore(index, 'numero_documento', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Riepilogo */}
                <div className="bg-[#F9F9F7] p-6 rounded-lg border border-[#E2E8F0]">
                  <h3 className="font-cinzel text-lg text-[#1A202C] mb-4">Riepilogo Check-in</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#4A5568]">Date</span>
                      <span className="font-medium">
                        {format(arrivo, 'dd MMM', { locale: it })} - {format(partenza, 'dd MMM yyyy', { locale: it })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4A5568]">Notti</span>
                      <span className="font-medium">
                        {Math.ceil((partenza - arrivo) / (1000 * 60 * 60 * 24))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4A5568]">Ospiti</span>
                      <span className="font-medium">{numOspiti}</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <span className="text-[#4A5568]">Ospite Principale</span>
                      <p className="font-medium">{ospitePrincipale.nome} {ospitePrincipale.cognome}</p>
                      <p className="text-xs text-[#4A5568]">
                        Doc: {ospitePrincipale.numero_documento} • {ospitePrincipale.nazionalita}
                      </p>
                    </div>
                    {accompagnatori.length > 0 && (
                      <div className="border-t pt-3">
                        <span className="text-[#4A5568]">Accompagnatori</span>
                        {accompagnatori.map((acc, i) => (
                          <p key={i} className="font-medium">{acc.nome} {acc.cognome}</p>
                        ))}
                      </div>
                    )}
                    {note && (
                      <div className="border-t pt-3">
                        <span className="text-[#4A5568]">Note</span>
                        <p className="font-medium">{note}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1"
                  >
                    Indietro
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#C5A059] hover:bg-[#B08D45]"
                  >
                    {loading ? 'Elaborazione...' : 'Conferma Check-in'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </Layout>
  );
}
