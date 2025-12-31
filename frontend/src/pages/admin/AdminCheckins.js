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
import { ClipboardCheck, Calendar, Users, Eye, User, FileText, Phone, Mail, MapPin, CreditCard, ChevronDown, ChevronUp, Edit, Download, Upload, X, Image } from 'lucide-react';

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
  { value: 'patente', label: 'Patente' }
];

export default function AdminCheckins() {
  const { token } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  
  // Edit guest modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState(null);
  const [guestData, setGuestData] = useState({
    nome: '',
    cognome: '',
    data_nascita: '',
    luogo_nascita: '',
    nazionalita: 'Italia',
    sesso: 'M',
    tipo_documento: 'carta_identita',
    numero_documento: '',
    scadenza_documento: '',
    luogo_rilascio: '',
    foto_fronte_url: '',
    foto_retro_url: ''
  });
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Export Questura state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState(null);

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

  // Edit guest functions
  const openEditModal = (checkin) => {
    setEditingCheckin(checkin);
    const ospite = checkin.ospite_principale || {};
    setGuestData({
      nome: ospite.nome || checkin.guest_nome?.split(' ')[0] || '',
      cognome: ospite.cognome || checkin.guest_nome?.split(' ').slice(1).join(' ') || '',
      data_nascita: ospite.data_nascita || '',
      luogo_nascita: ospite.luogo_nascita || '',
      nazionalita: ospite.nazionalita || 'Italia',
      sesso: ospite.sesso || 'M',
      tipo_documento: ospite.tipo_documento || 'carta_identita',
      numero_documento: ospite.numero_documento || '',
      scadenza_documento: ospite.scadenza_documento || '',
      luogo_rilascio: ospite.luogo_rilascio || '',
      foto_fronte_url: ospite.foto_fronte_url || '',
      foto_retro_url: ospite.foto_retro_url || ''
    });
    setEditModalOpen(true);
  };

  const handleUploadDocument = async (file, isFront) => {
    if (!file) return;
    
    const setUploading = isFront ? setUploadingFront : setUploadingBack;
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nome', `Documento ${isFront ? 'Fronte' : 'Retro'} - ${editingCheckin?.id}`);
      
      const response = await axios.post(`${API}/admin/media/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const url = response.data.url;
      setGuestData(prev => ({
        ...prev,
        [isFront ? 'foto_fronte_url' : 'foto_retro_url']: url
      }));
      toast.success(`Foto ${isFront ? 'fronte' : 'retro'} caricata!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  const saveGuestData = async () => {
    if (!editingCheckin) return;
    
    setSaving(true);
    try {
      await axios.put(`${API}/admin/checkins/${editingCheckin.id}/guest-data`, {
        ospite_principale: guestData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Dati ospite salvati!');
      setEditModalOpen(false);
      fetchCheckins();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // Export Questura functions
  const handleExportQuestura = async () => {
    setExporting(true);
    try {
      let url = `${API}/admin/checkins/export-questura`;
      const params = new URLSearchParams();
      if (exportDateFrom) params.append('data_da', exportDateFrom);
      if (exportDateTo) params.append('data_a', exportDateTo);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setExportData(response.data);
      
      if (response.data.count === 0) {
        toast.info('Nessun check-in da esportare nel periodo selezionato');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  const downloadQuesturaFile = () => {
    if (!exportData || !exportData.data) return;
    
    // Generate tab-separated file for Alloggiati Web
    const headers = [
      'Tipo Alloggiato',
      'Data Arrivo',
      'Permanenza GG',
      'Cognome',
      'Nome',
      'Sesso',
      'Data Nascita',
      'Comune Nascita',
      'Provincia Nascita',
      'Stato Nascita',
      'Cittadinanza',
      'Tipo Documento',
      'Numero Documento',
      'Luogo Rilascio'
    ];
    
    let content = headers.join('\t') + '\n';
    
    exportData.data.forEach(record => {
      const row = [
        record.tipo_alloggiato,
        record.data_arrivo,
        record.permanenza,
        record.cognome,
        record.nome,
        record.sesso,
        record.data_nascita,
        record.comune_nascita,
        record.provincia_nascita,
        record.stato_nascita,
        record.cittadinanza,
        record.tipo_documento,
        record.numero_documento,
        record.luogo_rilascio
      ];
      content += row.join('\t') + '\n';
    });
    
    // Download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alloggiati_${exportDateFrom || 'tutti'}_${exportDateTo || new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('File scaricato!');
  };

  return (
    <AdminLayout title="Gestione Check-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="font-manrope text-[#4A5568]">
          {checkins.length} check-in totali
        </p>
        <Button
          onClick={() => setExportModalOpen(true)}
          className="bg-[#C5A059] hover:bg-[#B08E4A] text-white"
          data-testid="export-questura-btn"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Questura
        </Button>
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
            <Card key={checkin.id} className="border-[#E2E8F0]" data-testid={`checkin-card-${checkin.id}`}>
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select 
                      value={checkin.status} 
                      onValueChange={(v) => handleStatusChange(checkin.id, v)}
                    >
                      <SelectTrigger className="w-[130px] border-[#E2E8F0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditModal(checkin)}
                      className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10"
                      data-testid={`edit-guest-btn-${checkin.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifica
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleRow(checkin.id)}
                      className="text-[#4A5568]"
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
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-4">
                    {/* Ospite Principale */}
                    {checkin.ospite_principale && (
                      <div>
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
                              <div className="flex gap-4 flex-wrap">
                                {checkin.ospite_principale.foto_fronte_url && (
                                  <a 
                                    href={checkin.ospite_principale.foto_fronte_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                    data-testid="doc-photo-front"
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
                                    data-testid="doc-photo-back"
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

                    {/* No details - Show edit prompt */}
                    {!checkin.ospite_principale && (!checkin.accompagnatori || checkin.accompagnatori.length === 0) && (
                      <div className="text-center py-4">
                        <p className="text-[#718096] text-sm mb-2">Nessun dettaglio ospite disponibile</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(checkin)}
                          className="border-[#C5A059] text-[#C5A059]"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Aggiungi dati ospite
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Guest Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-[#C5A059]">
              Modifica Dati Ospite
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Personal Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={guestData.nome}
                  onChange={(e) => setGuestData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Mario"
                  data-testid="guest-nome-input"
                />
              </div>
              <div>
                <Label htmlFor="cognome">Cognome *</Label>
                <Input
                  id="cognome"
                  value={guestData.cognome}
                  onChange={(e) => setGuestData(prev => ({ ...prev, cognome: e.target.value }))}
                  placeholder="Rossi"
                  data-testid="guest-cognome-input"
                />
              </div>
              <div>
                <Label htmlFor="data_nascita">Data di Nascita</Label>
                <Input
                  id="data_nascita"
                  type="date"
                  value={guestData.data_nascita}
                  onChange={(e) => setGuestData(prev => ({ ...prev, data_nascita: e.target.value }))}
                  data-testid="guest-data-nascita-input"
                />
              </div>
              <div>
                <Label htmlFor="luogo_nascita">Luogo di Nascita</Label>
                <Input
                  id="luogo_nascita"
                  value={guestData.luogo_nascita}
                  onChange={(e) => setGuestData(prev => ({ ...prev, luogo_nascita: e.target.value }))}
                  placeholder="Roma"
                  data-testid="guest-luogo-nascita-input"
                />
              </div>
              <div>
                <Label htmlFor="nazionalita">Nazionalità</Label>
                <Input
                  id="nazionalita"
                  value={guestData.nazionalita}
                  onChange={(e) => setGuestData(prev => ({ ...prev, nazionalita: e.target.value }))}
                  placeholder="Italia"
                />
              </div>
              <div>
                <Label htmlFor="sesso">Sesso</Label>
                <Select 
                  value={guestData.sesso} 
                  onValueChange={(v) => setGuestData(prev => ({ ...prev, sesso: v }))}
                >
                  <SelectTrigger data-testid="guest-sesso-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Maschio</SelectItem>
                    <SelectItem value="F">Femmina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Document Info */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-[#1A202C] mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#C5A059]" />
                Documento
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_documento">Tipo Documento</Label>
                  <Select 
                    value={guestData.tipo_documento} 
                    onValueChange={(v) => setGuestData(prev => ({ ...prev, tipo_documento: v }))}
                  >
                    <SelectTrigger data-testid="guest-tipo-doc-select">
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
                  <Label htmlFor="numero_documento">Numero Documento</Label>
                  <Input
                    id="numero_documento"
                    value={guestData.numero_documento}
                    onChange={(e) => setGuestData(prev => ({ ...prev, numero_documento: e.target.value }))}
                    placeholder="AB1234567"
                    data-testid="guest-numero-doc-input"
                  />
                </div>
                <div>
                  <Label htmlFor="scadenza_documento">Scadenza</Label>
                  <Input
                    id="scadenza_documento"
                    type="date"
                    value={guestData.scadenza_documento}
                    onChange={(e) => setGuestData(prev => ({ ...prev, scadenza_documento: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="luogo_rilascio">Luogo Rilascio</Label>
                  <Input
                    id="luogo_rilascio"
                    value={guestData.luogo_rilascio}
                    onChange={(e) => setGuestData(prev => ({ ...prev, luogo_rilascio: e.target.value }))}
                    placeholder="Roma"
                  />
                </div>
              </div>
            </div>

            {/* Document Photos */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-[#1A202C] mb-3 flex items-center gap-2">
                <Image className="w-4 h-4 text-[#C5A059]" />
                Foto Documento
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Front Photo */}
                <div>
                  <Label>Fronte</Label>
                  <div className="mt-2">
                    {guestData.foto_fronte_url ? (
                      <div className="relative inline-block">
                        <img 
                          src={guestData.foto_fronte_url} 
                          alt="Fronte" 
                          className="w-40 h-24 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => setGuestData(prev => ({ ...prev, foto_fronte_url: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-40 h-24 border-2 border-dashed border-[#E2E8F0] rounded cursor-pointer hover:border-[#C5A059] transition-colors">
                        {uploadingFront ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C5A059]"></div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-[#718096]" />
                            <span className="text-xs text-[#718096] mt-1">Carica fronte</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadDocument(e.target.files?.[0], true)}
                          disabled={uploadingFront}
                          data-testid="upload-front-input"
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                {/* Back Photo */}
                <div>
                  <Label>Retro</Label>
                  <div className="mt-2">
                    {guestData.foto_retro_url ? (
                      <div className="relative inline-block">
                        <img 
                          src={guestData.foto_retro_url} 
                          alt="Retro" 
                          className="w-40 h-24 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => setGuestData(prev => ({ ...prev, foto_retro_url: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-40 h-24 border-2 border-dashed border-[#E2E8F0] rounded cursor-pointer hover:border-[#C5A059] transition-colors">
                        {uploadingBack ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C5A059]"></div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-[#718096]" />
                            <span className="text-xs text-[#718096] mt-1">Carica retro</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadDocument(e.target.files?.[0], false)}
                          disabled={uploadingBack}
                          data-testid="upload-back-input"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={saveGuestData}
              disabled={saving || !guestData.nome || !guestData.cognome}
              className="bg-[#C5A059] hover:bg-[#B08E4A] text-white"
              data-testid="save-guest-btn"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Questura Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-[#C5A059]">
              Export per Questura (Alloggiati Web)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-[#4A5568]">
              Seleziona il periodo per esportare i dati dei check-in nel formato compatibile con Alloggiati Web.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_da">Data Da</Label>
                <Input
                  id="data_da"
                  type="date"
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                  data-testid="export-date-from"
                />
              </div>
              <div>
                <Label htmlFor="data_a">Data A</Label>
                <Input
                  id="data_a"
                  type="date"
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                  data-testid="export-date-to"
                />
              </div>
            </div>

            {exportData && (
              <div className="bg-[#F9F9F7] p-4 rounded-lg">
                <p className="font-medium text-[#1A202C] mb-2">
                  Trovati {exportData.count} record
                </p>
                {exportData.count > 0 && (
                  <div className="max-h-40 overflow-y-auto text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1">Nome</th>
                          <th className="text-left py-1">Documento</th>
                          <th className="text-left py-1">Arrivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportData.data.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-b border-[#E2E8F0]">
                            <td className="py-1">{r.nome} {r.cognome}</td>
                            <td className="py-1">{r.tipo_documento}</td>
                            <td className="py-1">{r.data_arrivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {exportData.count > 10 && (
                      <p className="text-[#718096] mt-2">... e altri {exportData.count - 10} record</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Chiudi
            </Button>
            {!exportData ? (
              <Button 
                onClick={handleExportQuestura}
                disabled={exporting}
                className="bg-[#C5A059] hover:bg-[#B08E4A] text-white"
                data-testid="search-export-btn"
              >
                {exporting ? 'Ricerca...' : 'Cerca'}
              </Button>
            ) : exportData.count > 0 && (
              <Button 
                onClick={downloadQuesturaFile}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="download-export-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Scarica File
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
