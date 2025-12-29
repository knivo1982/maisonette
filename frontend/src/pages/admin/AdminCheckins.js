import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { ClipboardCheck, Calendar, Users, Eye, User, FileText, Phone, Mail, MapPin, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';

import { API } from '../../lib/api';

const STATUSES = [
  { value: 'pending', label: 'In attesa', class: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confermato', class: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completato', class: 'bg-blue-100 text-blue-800' },
  { value: 'cancelled', label: 'Annullato', class: 'bg-red-100 text-red-800' }
];

export default function AdminCheckins() {
  const { token } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

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

                    {/* No details */}
                    {!checkin.ospite_principale && (!checkin.accompagnatori || checkin.accompagnatori.length === 0) && (
                      <p className="text-[#718096] text-sm italic">Nessun dettaglio aggiuntivo disponibile</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
