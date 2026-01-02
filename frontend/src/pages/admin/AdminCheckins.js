import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { ClipboardCheck, Calendar, Users, Eye, User, FileText, Phone, Mail, MapPin, CreditCard, ChevronDown, ChevronUp, Copy, ExternalLink, UserPlus, Image, Save } from 'lucide-react';

import { API } from '../../lib/api';

const STATUSES = [
  { value: 'pending', label: 'In attesa', class: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confermato', class: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completato', class: 'bg-blue-100 text-blue-800' },
  { value: 'cancelled', label: 'Annullato', class: 'bg-red-100 text-red-800' }
];

const DOCUMENT_TYPES = [
  { value: 'carta_identita', label: 'Carta d\'Identità' },
  { value: 'passaporto', label: 'Passaporto' },
  { value: 'patente', label: 'Patente di Guida' }
];

export default function AdminCheckins() {
  const { token } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [paytouristDialogOpen, setPaytouristDialogOpen] = useState(false);
  const [paytouristData, setPaytouristData] = useState(null);
  const [paytouristLoading, setPaytouristLoading] = useState(false);
  
  // Guest data form
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [editingCheckinId, setEditingCheckinId] = useState(null);
  const [guestFormLoading, setGuestFormLoading] = useState(false);
  const [guestForm, setGuestForm] = useState({
    nome: '',
    cognome: '',
    sesso: 'M',
    data_nascita: '',
    luogo_nascita: '',
    nazionalita: 'Italia',
    residenza_citta: '',
    tipo_documento: 'carta_identita',
    numero_documento: '',
    luogo_rilascio: '',
    scadenza_documento: ''
  });
  const [accompagnatori, setAccompagnatori] = useState([]);
  
  // Photo viewer
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);

  useEffect(() => {
    fetchCheckins();
  }, [token]);

  const fetchCheckins = async () => {
    try {
      const response = await axios.get(`${API}/admin/checkins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCheckins(response.data);
    } catch (error) {
      console.error('Error fetching checkins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (checkinId, newStatus) => {
    try {
      await axios.put(`${API}/admin/checkins/${checkinId}/status?status=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status aggiornato!');
      fetchCheckins();
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const getStatusBadge = (status) => {
    const s = STATUSES.find(st => st.value === status) || STATUSES[0];
    return (
      <span className={`${s.class} px-3 py-1 rounded-full text-xs font-medium`}>
        {s.label}
      </span>
    );
  };

  const viewDetails = (checkin) => {
    setSelectedCheckin(checkin);
    setDetailsOpen(true);
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Guest form functions
  const openGuestForm = (checkin) => {
    setEditingCheckinId(checkin.id);
    // Pre-fill form if data exists
    if (checkin.ospite_principale) {
      setGuestForm({
        nome: checkin.ospite_principale.nome || '',
        cognome: checkin.ospite_principale.cognome || '',
        sesso: checkin.ospite_principale.sesso || 'M',
        data_nascita: checkin.ospite_principale.data_nascita || '',
        luogo_nascita: checkin.ospite_principale.luogo_nascita || '',
        nazionalita: checkin.ospite_principale.nazionalita || 'Italia',
        residenza_citta: checkin.ospite_principale.residenza_citta || '',
        tipo_documento: checkin.ospite_principale.tipo_documento || 'carta_identita',
        numero_documento: checkin.ospite_principale.numero_documento || '',
        luogo_rilascio: checkin.ospite_principale.luogo_rilascio || '',
        scadenza_documento: checkin.ospite_principale.scadenza_documento || ''
      });
    } else {
      // Reset form
      setGuestForm({
        nome: '',
        cognome: '',
        sesso: 'M',
        data_nascita: '',
        luogo_nascita: '',
        nazionalita: 'Italia',
        residenza_citta: '',
        tipo_documento: 'carta_identita',
        numero_documento: '',
        luogo_rilascio: '',
        scadenza_documento: ''
      });
    }
    // Load existing accompagnatori
    setAccompagnatori(checkin.accompagnatori || []);
    setGuestFormOpen(true);
  };

  const addAccompagnatore = () => {
    setAccompagnatori([...accompagnatori, {
      nome: '',
      cognome: '',
      sesso: 'M',
      data_nascita: '',
      luogo_nascita: '',
      nazionalita: 'Italia',
      tipo_documento: 'carta_identita',
      numero_documento: ''
    }]);
  };

  const updateAccompagnatore = (index, field, value) => {
    const updated = [...accompagnatori];
    updated[index] = { ...updated[index], [field]: value };
    setAccompagnatori(updated);
  };

  const removeAccompagnatore = (index) => {
    setAccompagnatori(accompagnatori.filter((_, i) => i !== index));
  };

  const saveGuestData = async () => {
    if (!guestForm.nome || !guestForm.cognome) {
      toast.error('Nome e cognome sono obbligatori');
      return;
    }
    
    setGuestFormLoading(true);
    try {
      await axios.put(
        `${API}/admin/checkins/${editingCheckinId}/guest-data`,
        { 
          ospite_principale: guestForm,
          accompagnatori: accompagnatori.filter(a => a.nome && a.cognome)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Dati ospiti salvati!');
      setGuestFormOpen(false);
      fetchCheckins();
    } catch (error) {
      console.error('Error saving guest data:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setGuestFormLoading(false);
    }
  };

  // Photo viewer
  const openPhotoViewer = (photoUrl) => {
    setCurrentPhoto(photoUrl);
    setPhotoViewerOpen(true);
  };

  // PayTourist functions
  const openPaytouristDialog = async (checkinId) => {
    setPaytouristLoading(true);
    setPaytouristDialogOpen(true);
    try {
      const response = await axios.get(`${API}/admin/checkins/${checkinId}/paytourist-format`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaytouristData(response.data);
    } catch (error) {
      console.error('Error fetching PayTourist data:', error);
      toast.error('Errore nel recupero dei dati');
      setPaytouristDialogOpen(false);
    } finally {
      setPaytouristLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Dati copiati negli appunti!');
  };

  const openPaytourist = () => {
    window.open('https://capaccio.paytourist.com', '_blank');
  };

  return (
    <AdminLayout title="Gestione Check-in">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {checkins.length} check-in totali
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
        </div>
      ) : checkins.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessun check-in registrato.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checkins.map((checkin) => (
            <Card key={checkin.id} className="border-[#E2E8F0]">
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-cinzel text-lg text-[#1A202C]">
                        {checkin.guest_nome || checkin.booking?.nome_ospite || 'Ospite'}
                      </h3>
                      {getStatusBadge(checkin.status)}
                      {checkin.admin_validated && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          ✓ Validato Admin
                        </span>
                      )}
                      {checkin.source === 'online' && !checkin.admin_validated && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Online
                        </span>
                      )}
                      {checkin.codice_prenotazione || checkin.booking?.codice_prenotazione ? (
                        <span className="text-xs bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded font-mono">
                          {checkin.codice_prenotazione || checkin.booking?.codice_prenotazione}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-[#4A5568]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-[#C5A059]" />
                        Arrivo: {formatDate(checkin.data_arrivo || checkin.booking?.data_arrivo)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-[#C5A059]" />
                        Partenza: {formatDate(checkin.data_partenza || checkin.booking?.data_partenza)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-[#C5A059]" />
                        {checkin.num_ospiti || checkin.booking?.num_ospiti || '?'} ospiti
                      </span>
                      {(checkin.note || checkin.admin_note) && (
                        <span className="flex items-center gap-1 text-[#718096]">
                          <FileText className="w-4 h-4" />
                          {checkin.note || checkin.admin_note}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select 
                      value={checkin.status} 
                      onValueChange={(v) => handleStatusChange(checkin.id, v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRow(checkin.id)}
                      className="border-[#C5A059] text-[#C5A059]"
                    >
                      {expandedRows[checkin.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Dettagli
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRows[checkin.id] && (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                    {/* Ospite Principale */}
                    {checkin.ospite_principale && (
                      <div className="mb-4">
                        <h4 className="font-cinzel text-sm text-[#C5A059] mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Ospite Principale
                        </h4>
                        <div className="bg-[#F9F9F7] p-4 rounded-lg">
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-[#718096]">Nome e Cognome</p>
                              <p className="font-medium text-[#1A202C]">
                                {checkin.ospite_principale.nome} {checkin.ospite_principale.cognome}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#718096]">Data di Nascita</p>
                              <p className="text-[#1A202C]">{checkin.ospite_principale.data_nascita || 'N/D'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#718096]">Luogo di Nascita</p>
                              <p className="text-[#1A202C]">{checkin.ospite_principale.luogo_nascita || 'N/D'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#718096]">Nazionalità</p>
                              <p className="text-[#1A202C]">{checkin.ospite_principale.nazionalita || 'N/D'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#718096]">Documento</p>
                              <p className="text-[#1A202C]">
                                {checkin.ospite_principale.tipo_documento?.replace('_', ' ') || 'N/D'} - {checkin.ospite_principale.numero_documento || 'N/D'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#718096]">Scadenza Doc.</p>
                              <p className="text-[#1A202C]">{checkin.ospite_principale.scadenza_documento || 'N/D'}</p>
                            </div>
                          </div>
                          
                          {/* Document Photos */}
                          {(checkin.ospite_principale.foto_fronte_url || checkin.ospite_principale.foto_retro_url) && (
                            <div className="mt-4">
                              <p className="text-xs text-[#718096] mb-2">Foto Documento</p>
                              <div className="flex gap-4">
                                {checkin.ospite_principale.foto_fronte_url && (
                                  <a 
                                    href={checkin.ospite_principale.foto_fronte_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img 
                                      src={checkin.ospite_principale.foto_fronte_url} 
                                      alt="Fronte documento" 
                                      className="w-32 h-20 object-cover rounded border hover:opacity-80 transition-opacity"
                                    />
                                    <span className="text-xs text-[#C5A059]">Fronte</span>
                                  </a>
                                )}
                                {checkin.ospite_principale.foto_retro_url && (
                                  <a 
                                    href={checkin.ospite_principale.foto_retro_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img 
                                      src={checkin.ospite_principale.foto_retro_url} 
                                      alt="Retro documento" 
                                      className="w-32 h-20 object-cover rounded border hover:opacity-80 transition-opacity"
                                    />
                                    <span className="text-xs text-[#C5A059]">Retro</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Accompagnatori */}
                    {checkin.accompagnatori && checkin.accompagnatori.length > 0 && (
                      <div>
                        <h4 className="font-cinzel text-sm text-[#C5A059] mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Accompagnatori ({checkin.accompagnatori.length})
                        </h4>
                        <div className="space-y-2">
                          {checkin.accompagnatori.map((acc, index) => (
                            <div key={index} className="bg-[#F9F9F7] p-3 rounded-lg">
                              <div className="grid md:grid-cols-4 gap-2 text-sm">
                                <div>
                                  <span className="text-[#718096]">Nome: </span>
                                  <span className="text-[#1A202C]">{acc.nome} {acc.cognome}</span>
                                </div>
                                <div>
                                  <span className="text-[#718096]">Nascita: </span>
                                  <span className="text-[#1A202C]">{acc.data_nascita || 'N/D'}</span>
                                </div>
                                <div>
                                  <span className="text-[#718096]">Documento: </span>
                                  <span className="text-[#1A202C]">{acc.numero_documento || 'N/D'}</span>
                                </div>
                                <div>
                                  <span className="text-[#718096]">Nazionalità: </span>
                                  <span className="text-[#1A202C]">{acc.nazionalita || 'N/D'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No details - Show add button */}
                    {!checkin.ospite_principale && (!checkin.accompagnatori || checkin.accompagnatori.length === 0) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                        <UserPlus className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-[#718096] text-sm mb-3">Nessun dato ospite disponibile</p>
                        <Button
                          size="sm"
                          onClick={() => openGuestForm(checkin)}
                          className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Aggiungi Dati Ospite
                        </Button>
                      </div>
                    )}

                    {/* Edit guest button if data exists */}
                    {checkin.ospite_principale && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openGuestForm(checkin)}
                          className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10"
                        >
                          <User className="w-4 h-4 mr-2" />
                          Modifica Dati Ospite
                        </Button>
                      </div>
                    )}

                    {/* PayTourist Button */}
                    <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => openPaytouristDialog(checkin.id)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                        data-testid={`paytourist-btn-${checkin.id}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copia per PayTourist
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openPaytourist}
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Apri PayTourist
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Guest Data Form Dialog */}
      <Dialog open={guestFormOpen} onOpenChange={setGuestFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#C5A059]" />
              Dati Ospite Principale
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Nome e Cognome */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={guestForm.nome}
                  onChange={(e) => setGuestForm({...guestForm, nome: e.target.value})}
                  placeholder="Mario"
                />
              </div>
              <div>
                <Label htmlFor="cognome">Cognome *</Label>
                <Input
                  id="cognome"
                  value={guestForm.cognome}
                  onChange={(e) => setGuestForm({...guestForm, cognome: e.target.value})}
                  placeholder="Rossi"
                />
              </div>
            </div>

            {/* Sesso e Data nascita */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sesso">Sesso</Label>
                <Select 
                  value={guestForm.sesso} 
                  onValueChange={(v) => setGuestForm({...guestForm, sesso: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Maschio</SelectItem>
                    <SelectItem value="F">Femmina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data_nascita">Data di Nascita</Label>
                <Input
                  id="data_nascita"
                  type="date"
                  value={guestForm.data_nascita}
                  onChange={(e) => setGuestForm({...guestForm, data_nascita: e.target.value})}
                />
              </div>
            </div>

            {/* Luogo nascita e Nazionalità */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="luogo_nascita">Luogo di Nascita</Label>
                <Input
                  id="luogo_nascita"
                  value={guestForm.luogo_nascita}
                  onChange={(e) => setGuestForm({...guestForm, luogo_nascita: e.target.value})}
                  placeholder="Roma"
                />
              </div>
              <div>
                <Label htmlFor="nazionalita">Nazionalità</Label>
                <Input
                  id="nazionalita"
                  value={guestForm.nazionalita}
                  onChange={(e) => setGuestForm({...guestForm, nazionalita: e.target.value})}
                  placeholder="Italia"
                />
              </div>
            </div>

            {/* Residenza */}
            <div>
              <Label htmlFor="residenza_citta">Città di Residenza</Label>
              <Input
                id="residenza_citta"
                value={guestForm.residenza_citta}
                onChange={(e) => setGuestForm({...guestForm, residenza_citta: e.target.value})}
                placeholder="Milano"
              />
            </div>

            {/* Documento */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-[#1A202C] mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Documento di Identità
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_documento">Tipo Documento</Label>
                  <Select 
                    value={guestForm.tipo_documento} 
                    onValueChange={(v) => setGuestForm({...guestForm, tipo_documento: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numero_documento">Numero Documento</Label>
                  <Input
                    id="numero_documento"
                    value={guestForm.numero_documento}
                    onChange={(e) => setGuestForm({...guestForm, numero_documento: e.target.value})}
                    placeholder="AB1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="luogo_rilascio">Rilasciato da</Label>
                  <Input
                    id="luogo_rilascio"
                    value={guestForm.luogo_rilascio}
                    onChange={(e) => setGuestForm({...guestForm, luogo_rilascio: e.target.value})}
                    placeholder="Comune di Roma"
                  />
                </div>
                <div>
                  <Label htmlFor="scadenza_documento">Scadenza</Label>
                  <Input
                    id="scadenza_documento"
                    type="date"
                    value={guestForm.scadenza_documento}
                    onChange={(e) => setGuestForm({...guestForm, scadenza_documento: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setGuestFormOpen(false)}
              >
                Annulla
              </Button>
              <Button
                onClick={saveGuestData}
                disabled={guestFormLoading}
                className="bg-[#C5A059] hover:bg-[#B08D45]"
              >
                {guestFormLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Salvataggio...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salva Dati
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Foto Documento
            </DialogTitle>
          </DialogHeader>
          {currentPhoto && (
            <div className="flex justify-center">
              <img 
                src={currentPhoto} 
                alt="Documento" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PayTourist Dialog */}
      <Dialog open={paytouristDialogOpen} onOpenChange={setPaytouristDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              Dati per PayTourist
            </DialogTitle>
          </DialogHeader>
          
          {paytouristLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : paytouristData ? (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Istruzioni:</strong> Copia i dati qui sotto e incollali manualmente su PayTourist.
                </p>
              </div>

              {/* Structured Data View */}
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Prenotazione</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Check-in:</span> {paytouristData.structured_data?.prenotazione?.check_in}</div>
                    <div><span className="text-gray-500">Check-out:</span> {paytouristData.structured_data?.prenotazione?.check_out}</div>
                    <div><span className="text-gray-500">Notti:</span> {paytouristData.structured_data?.prenotazione?.notti}</div>
                    <div><span className="text-gray-500">Ospiti:</span> {paytouristData.structured_data?.prenotazione?.num_ospiti}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Ospite Principale</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Nome:</span> {paytouristData.structured_data?.ospite_principale?.nome}</div>
                    <div><span className="text-gray-500">Cognome:</span> {paytouristData.structured_data?.ospite_principale?.cognome}</div>
                    <div><span className="text-gray-500">Tipo:</span> {paytouristData.structured_data?.ospite_principale?.tipo_ospite_desc}</div>
                    <div><span className="text-gray-500">Sesso:</span> {paytouristData.structured_data?.ospite_principale?.sesso}</div>
                    <div><span className="text-gray-500">Data nascita:</span> {paytouristData.structured_data?.ospite_principale?.data_nascita}</div>
                    <div><span className="text-gray-500">Luogo nascita:</span> {paytouristData.structured_data?.ospite_principale?.luogo_nascita}</div>
                    <div><span className="text-gray-500">Nazionalità:</span> {paytouristData.structured_data?.ospite_principale?.nazionalita}</div>
                    <div><span className="text-gray-500">Documento:</span> {paytouristData.structured_data?.ospite_principale?.documento?.tipo} - {paytouristData.structured_data?.ospite_principale?.documento?.numero}</div>
                  </div>
                </div>

                {paytouristData.structured_data?.accompagnatori?.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Accompagnatori ({paytouristData.structured_data.accompagnatori.length})</h4>
                    {paytouristData.structured_data.accompagnatori.map((acc, idx) => (
                      <div key={idx} className="text-sm border-b last:border-b-0 pb-2 mb-2 last:pb-0 last:mb-0">
                        <span className="font-medium">{acc.nome} {acc.cognome}</span>
                        <span className="text-gray-500 ml-2">({acc.sesso}, {acc.data_nascita}, {acc.nazionalita})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Copyable Text */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Testo da copiare:</label>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-60">
                  {paytouristData.text_format}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => copyToClipboard(paytouristData.text_format)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copia Testo
                </Button>
                <Button
                  onClick={openPaytourist}
                  variant="outline"
                  className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apri PayTourist
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Nessun dato disponibile</p>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
