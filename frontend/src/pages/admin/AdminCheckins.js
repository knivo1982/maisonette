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
import { 
  ClipboardCheck, Calendar, Users, User, FileText, 
  ChevronDown, ChevronUp, Download, Edit2, Plus, 
  Image as ImageIcon, X, Save, Upload
} from 'lucide-react';

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
  const [expandedRows, setExpandedRows] = useState({});
  
  // Edit guest dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState(null);
  const [guestForm, setGuestForm] = useState({
    nome: '', cognome: '', data_nascita: '', luogo_nascita: '',
    nazionalita: 'ITALIA', sesso: 'M', tipo_documento: 'carta_identita',
    numero_documento: '', scadenza_documento: '', luogo_rilascio: '',
    foto_fronte_url: '', foto_retro_url: ''
  });
  const [accompagnatori, setAccompagnatori] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Questura export dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    data_da: '', data_a: ''
  });
  const [exportData, setExportData] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('it-IT');
    } catch {
      return dateStr;
    }
  };

  // Open edit guest dialog
  const openEditGuest = (checkin) => {
    setEditingCheckin(checkin);
    const ospite = checkin.ospite_principale || {};
    setGuestForm({
      nome: ospite.nome || '',
      cognome: ospite.cognome || '',
      data_nascita: ospite.data_nascita || '',
      luogo_nascita: ospite.luogo_nascita || '',
      nazionalita: ospite.nazionalita || 'ITALIA',
      sesso: ospite.sesso || 'M',
      tipo_documento: ospite.tipo_documento || 'carta_identita',
      numero_documento: ospite.numero_documento || '',
      scadenza_documento: ospite.scadenza_documento || '',
      luogo_rilascio: ospite.luogo_rilascio || '',
      foto_fronte_url: ospite.foto_fronte_url || '',
      foto_retro_url: ospite.foto_retro_url || ''
    });
    setAccompagnatori(checkin.accompagnatori || []);
    setEditDialogOpen(true);
  };

  // Upload document photo
  const handlePhotoUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/upload/document`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setGuestForm(prev => ({ ...prev, [field]: response.data.url }));
      toast.success('Foto caricata!');
    } catch (error) {
      toast.error('Errore nel caricamento');
    } finally {
      setUploading(false);
    }
  };

  // Save guest data
  const handleSaveGuest = async () => {
    if (!editingCheckin) return;
    
    try {
      await axios.put(`${API}/admin/checkins/${editingCheckin.id}/guest-data`, {
        ospite_principale: guestForm,
        accompagnatori: accompagnatori
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Dati ospite salvati!');
      setEditDialogOpen(false);
      fetchCheckins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel salvataggio');
    }
  };

  // Add accompanying guest
  const addAccompagnatore = () => {
    setAccompagnatori([...accompagnatori, {
      nome: '', cognome: '', data_nascita: '', luogo_nascita: '',
      nazionalita: 'ITALIA', sesso: '', tipo_documento: '', numero_documento: ''
    }]);
  };

  // Update accompanying guest
  const updateAccompagnatore = (index, field, value) => {
    const updated = [...accompagnatori];
    updated[index] = { ...updated[index], [field]: value };
    setAccompagnatori(updated);
  };

  // Remove accompanying guest
  const removeAccompagnatore = (index) => {
    setAccompagnatori(accompagnatori.filter((_, i) => i !== index));
  };

  // Export Questura
  const handleExportQuestura = async () => {
    setExporting(true);
    try {
      let url = `${API}/admin/checkins/export-questura`;
      const params = new URLSearchParams();
      if (exportFilters.data_da) params.append('data_da', exportFilters.data_da);
      if (exportFilters.data_a) params.append('data_a', exportFilters.data_a);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExportData(response.data);
      
      if (response.data.count === 0) {
        toast.info('Nessun dato da esportare per il periodo selezionato');
      }
    } catch (error) {
      toast.error('Errore nell\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  // Download as text file
  const downloadQuesturaFile = () => {
    if (!exportData || !exportData.data) return;
    
    // Create text format for Alloggiati Web
    const header = "Tipo\tArrivo\tPermanenza\tCognome\tNome\tSesso\tNascita\tComune Nascita\tProv\tStato Nascita\tCittadinanza\tTipo Doc\tNumero Doc\tLuogo Rilascio";
    const lines = exportData.data.map(row => 
      `${row.tipo_alloggiato}\t${row.data_arrivo}\t${row.permanenza}\t${row.cognome}\t${row.nome}\t${row.sesso}\t${row.data_nascita}\t${row.comune_nascita}\t${row.provincia_nascita}\t${row.stato_nascita}\t${row.cittadinanza}\t${row.tipo_documento}\t${row.numero_documento}\t${row.luogo_rilascio}`
    );
    
    const content = [header, ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alloggiati_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('File scaricato!');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with export button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-cinzel text-[#1A202C] flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-[#C5A059]" />
              Gestione Check-in
            </h1>
            <p className="text-[#4A5568] text-sm mt-1">
              {checkins.length} check-in registrati
            </p>
          </div>
          <Button 
            onClick={() => setExportDialogOpen(true)}
            className="bg-[#C5A059] hover:bg-[#B08D45]"
            data-testid="export-questura-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Questura
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059] mx-auto"></div>
          </div>
        )}

        {/* Empty state */}
        {!loading && checkins.length === 0 && (
          <Card className="border-2 border-dashed border-[#C5A059]/30">
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="w-16 h-16 mx-auto text-[#C5A059]/40 mb-4" />
              <h3 className="font-cinzel text-xl text-[#1A202C] mb-2">Nessun Check-in</h3>
              <p className="text-[#4A5568]">I check-in appariranno qui quando gli ospiti li completeranno</p>
            </CardContent>
          </Card>
        )}

        {/* Check-ins list */}
        {!loading && checkins.length > 0 && (
          <div className="space-y-4">
            {checkins.map((checkin) => (
              <Card key={checkin.id} className="border-l-4 border-l-[#C5A059]" data-testid={`checkin-card-${checkin.id}`}>
                <CardContent className="py-4">
                  {/* Header row */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-cinzel text-lg text-[#1A202C]">
                          {checkin.ospite_principale?.nome || checkin.guest_nome || 'Ospite'}{' '}
                          {checkin.ospite_principale?.cognome || ''}
                        </h3>
                        {getStatusBadge(checkin.status)}
                        {checkin.source === 'online' && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 text-xs rounded">
                            Validato Admin
                          </span>
                        )}
                        {!checkin.ospite_principale && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-0.5 text-xs rounded flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Dati mancanti
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-[#4A5568]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(checkin.data_arrivo)} → {formatDate(checkin.data_partenza)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {checkin.num_ospiti} ospiti
                        </span>
                        {checkin.codice_prenotazione && (
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {checkin.codice_prenotazione}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
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
                        onClick={() => openEditGuest(checkin)}
                        className="border-[#C5A059] text-[#C5A059]"
                        data-testid={`edit-guest-btn-${checkin.id}`}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Dati Ospite
                      </Button>
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
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRows[checkin.id] && (
                    <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                      {/* Ospite Principale */}
                      {checkin.ospite_principale ? (
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
                                <p className="text-xs text-[#718096] mb-2 flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Foto Documento
                                </p>
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
                      ) : (
                        <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-orange-800 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Dati ospite non ancora inseriti. Clicca "Dati Ospite" per aggiungerli.
                          </p>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Guest Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-[#C5A059]">
              Modifica Dati Ospite
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Ospite Principale */}
            <div>
              <h3 className="font-cinzel text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#C5A059]" />
                Ospite Principale
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={guestForm.nome}
                    onChange={(e) => setGuestForm({...guestForm, nome: e.target.value})}
                    placeholder="Mario"
                  />
                </div>
                <div>
                  <Label>Cognome *</Label>
                  <Input
                    value={guestForm.cognome}
                    onChange={(e) => setGuestForm({...guestForm, cognome: e.target.value})}
                    placeholder="Rossi"
                  />
                </div>
                <div>
                  <Label>Data di Nascita</Label>
                  <Input
                    type="date"
                    value={guestForm.data_nascita}
                    onChange={(e) => setGuestForm({...guestForm, data_nascita: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Luogo di Nascita</Label>
                  <Input
                    value={guestForm.luogo_nascita}
                    onChange={(e) => setGuestForm({...guestForm, luogo_nascita: e.target.value})}
                    placeholder="Roma"
                  />
                </div>
                <div>
                  <Label>Nazionalità</Label>
                  <Input
                    value={guestForm.nazionalita}
                    onChange={(e) => setGuestForm({...guestForm, nazionalita: e.target.value})}
                    placeholder="ITALIA"
                  />
                </div>
                <div>
                  <Label>Sesso</Label>
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
                  <Label>Tipo Documento</Label>
                  <Select
                    value={guestForm.tipo_documento}
                    onValueChange={(v) => setGuestForm({...guestForm, tipo_documento: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Numero Documento</Label>
                  <Input
                    value={guestForm.numero_documento}
                    onChange={(e) => setGuestForm({...guestForm, numero_documento: e.target.value})}
                    placeholder="AA1234567"
                  />
                </div>
                <div>
                  <Label>Scadenza Documento</Label>
                  <Input
                    type="date"
                    value={guestForm.scadenza_documento}
                    onChange={(e) => setGuestForm({...guestForm, scadenza_documento: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Luogo Rilascio</Label>
                  <Input
                    value={guestForm.luogo_rilascio}
                    onChange={(e) => setGuestForm({...guestForm, luogo_rilascio: e.target.value})}
                    placeholder="Comune di Roma"
                  />
                </div>
              </div>

              {/* Document Photos */}
              <div className="mt-4">
                <Label className="mb-2 block">Foto Documento</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">Fronte Documento</p>
                    {guestForm.foto_fronte_url ? (
                      <div className="relative">
                        <img 
                          src={guestForm.foto_fronte_url} 
                          alt="Fronte" 
                          className="w-full h-32 object-cover rounded"
                        />
                        <button
                          onClick={() => setGuestForm({...guestForm, foto_fronte_url: ''})}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer hover:bg-gray-50 rounded p-4">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Carica foto</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'foto_fronte_url')}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">Retro Documento</p>
                    {guestForm.foto_retro_url ? (
                      <div className="relative">
                        <img 
                          src={guestForm.foto_retro_url} 
                          alt="Retro" 
                          className="w-full h-32 object-cover rounded"
                        />
                        <button
                          onClick={() => setGuestForm({...guestForm, foto_retro_url: ''})}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer hover:bg-gray-50 rounded p-4">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Carica foto</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'foto_retro_url')}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Accompagnatori */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-cinzel text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#C5A059]" />
                  Accompagnatori ({accompagnatori.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAccompagnatore}
                  className="border-[#C5A059] text-[#C5A059]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
              
              {accompagnatori.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nessun accompagnatore aggiunto</p>
              ) : (
                <div className="space-y-4">
                  {accompagnatori.map((acc, index) => (
                    <div key={index} className="border rounded-lg p-4 relative">
                      <button
                        onClick={() => removeAccompagnatore(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-sm font-medium text-[#C5A059] mb-3">Accompagnatore {index + 1}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={acc.nome}
                            onChange={(e) => updateAccompagnatore(index, 'nome', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cognome</Label>
                          <Input
                            value={acc.cognome}
                            onChange={(e) => updateAccompagnatore(index, 'cognome', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Nascita</Label>
                          <Input
                            type="date"
                            value={acc.data_nascita}
                            onChange={(e) => updateAccompagnatore(index, 'data_nascita', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Nazionalità</Label>
                          <Input
                            value={acc.nazionalita}
                            onChange={(e) => updateAccompagnatore(index, 'nazionalita', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                onClick={handleSaveGuest}
                className="bg-[#C5A059] hover:bg-[#B08D45]"
                disabled={uploading}
              >
                <Save className="w-4 h-4 mr-2" />
                Salva Dati
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Questura Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-[#C5A059]">
              Export per Questura (Alloggiati Web)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Esporta i dati dei check-in completati nel formato richiesto dal portale Alloggiati Web della Questura.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Da</Label>
                <Input
                  type="date"
                  value={exportFilters.data_da}
                  onChange={(e) => setExportFilters({...exportFilters, data_da: e.target.value})}
                />
              </div>
              <div>
                <Label>Data A</Label>
                <Input
                  type="date"
                  value={exportFilters.data_a}
                  onChange={(e) => setExportFilters({...exportFilters, data_a: e.target.value})}
                />
              </div>
            </div>

            <Button
              onClick={handleExportQuestura}
              className="w-full bg-[#C5A059] hover:bg-[#B08D45]"
              disabled={exporting}
            >
              {exporting ? 'Caricamento...' : 'Genera Export'}
            </Button>

            {/* Export Results */}
            {exportData && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-medium">
                    Trovati {exportData.count} record
                  </p>
                  {exportData.count > 0 && (
                    <Button
                      onClick={downloadQuesturaFile}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Scarica TXT
                    </Button>
                  )}
                </div>
                
                {exportData.count > 0 && (
                  <div className="max-h-48 overflow-auto text-xs">
                    <table className="w-full">
                      <thead className="bg-gray-200 sticky top-0">
                        <tr>
                          <th className="p-1 text-left">Cognome</th>
                          <th className="p-1 text-left">Nome</th>
                          <th className="p-1 text-left">Arrivo</th>
                          <th className="p-1 text-left">Doc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportData.data.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-1">{row.cognome}</td>
                            <td className="p-1">{row.nome}</td>
                            <td className="p-1">{row.data_arrivo}</td>
                            <td className="p-1">{row.numero_documento}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {exportData.count > 10 && (
                      <p className="text-gray-500 mt-2 text-center">
                        ... e altri {exportData.count - 10} record
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {exportData.format_info}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
