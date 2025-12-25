import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Plus, 
  Trash2, 
  Link2, 
  Copy, 
  Check, 
  ExternalLink,
  Calendar,
  CloudDownload,
  CloudUpload,
  AlertCircle,
  CheckCircle2,
  Home
} from 'lucide-react';

import { API } from '../../lib/api';

export default function AdminIcal() {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [feeds, setFeeds] = useState([]);
  const [exportUrl, setExportUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Add feed dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [feedForm, setFeedForm] = useState({
    nome: '',
    url: '',
    attivo: true
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (selectedUnit && token) {
      fetchFeeds();
      fetchExportUrl();
    }
  }, [selectedUnit, token]);

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

  const fetchFeeds = async () => {
    if (!selectedUnit) return;
    try {
      const response = await axios.get(`${API}/admin/ical/feeds?unit_id=${selectedUnit.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeds(response.data);
    } catch (error) {
      console.error('Error fetching feeds:', error);
    }
  };

  const fetchExportUrl = async () => {
    if (!selectedUnit) return;
    try {
      const response = await axios.get(`${API}/admin/ical/export-url/${selectedUnit.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExportUrl(response.data.export_url);
    } catch (error) {
      console.error('Error fetching export URL:', error);
    }
  };

  const handleAddFeed = async () => {
    if (!feedForm.nome || !feedForm.url) {
      toast.error('Inserisci nome e URL del feed');
      return;
    }

    try {
      await axios.post(`${API}/admin/ical/feeds`, {
        unit_id: selectedUnit.id,
        ...feedForm
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Feed aggiunto!');
      setAddDialogOpen(false);
      setFeedForm({ nome: '', url: '', attivo: true });
      fetchFeeds();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante l\'aggiunta');
    }
  };

  const handleDeleteFeed = async (feedId) => {
    if (!window.confirm('Eliminare questo feed e i blocchi importati?')) return;
    
    try {
      await axios.delete(`${API}/admin/ical/feeds/${feedId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Feed eliminato');
      fetchFeeds();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleToggleFeed = async (feed) => {
    try {
      await axios.put(`${API}/admin/ical/feeds/${feed.id}`, {
        attivo: !feed.attivo
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFeeds();
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleSync = async (feedId = null) => {
    setSyncing(true);
    try {
      const params = new URLSearchParams();
      if (selectedUnit) params.append('unit_id', selectedUnit.id);
      if (feedId) params.append('feed_id', feedId);
      
      const response = await axios.post(`${API}/admin/ical/sync?${params.toString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = response.data;
      if (result.errori > 0) {
        toast.warning(`Sincronizzazione completata con ${result.errori} errori`);
      } else {
        toast.success(result.message);
      }
      fetchFeeds();
    } catch (error) {
      toast.error('Errore durante la sincronizzazione');
    } finally {
      setSyncing(false);
    }
  };

  const copyExportUrl = () => {
    navigator.clipboard.writeText(exportUrl);
    setCopied(true);
    toast.success('URL copiato!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceIcon = (nome) => {
    const nomeLower = nome.toLowerCase();
    if (nomeLower.includes('booking')) {
      return <span className="text-blue-600 font-bold">B</span>;
    } else if (nomeLower.includes('airbnb')) {
      return <span className="text-[#FF5A5F] font-bold">A</span>;
    }
    return <Calendar className="h-4 w-4" />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Mai';
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Sincronizzazione Calendari">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#C5A059]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Sincronizzazione Calendari">
      <div className="space-y-6">
        {/* Unit Selector */}
        {units.length > 1 && (
          <div className="flex gap-2">
            {units.map(unit => (
              <Button
                key={unit.id}
                variant={selectedUnit?.id === unit.id ? "default" : "outline"}
                onClick={() => setSelectedUnit(unit)}
                className={selectedUnit?.id === unit.id ? "bg-[#C5A059] hover:bg-[#B08A3E]" : ""}
              >
                <Home className="h-4 w-4 mr-2" />
                {unit.nome}
              </Button>
            ))}
          </div>
        )}

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5 text-[#C5A059]" />
              Esporta Calendario
            </CardTitle>
            <CardDescription>
              Condividi questo URL con Booking.com e Airbnb per sincronizzare automaticamente le tue disponibilità
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={exportUrl} 
                  readOnly 
                  className="font-mono text-sm bg-gray-50"
                />
                <Button onClick={copyExportUrl} variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button onClick={() => window.open(exportUrl, '_blank')} variant="outline">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Come collegare:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>Booking.com:</strong> Struttura → Calendario → Sincronizza calendario → Aggiungi URL iCal</li>
                  <li><strong>Airbnb:</strong> Annuncio → Disponibilità → Collega calendari → Importa calendario</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CloudDownload className="h-5 w-5 text-[#C5A059]" />
                  Importa Calendari
                </CardTitle>
                <CardDescription>
                  Importa le prenotazioni da Booking.com, Airbnb e altri canali
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSync()} 
                  disabled={syncing || feeds.length === 0}
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sincronizza Tutti
                </Button>
                <Button onClick={() => setAddDialogOpen(true)} className="bg-[#C5A059] hover:bg-[#B08A3E]">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Feed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {feeds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessun feed configurato</p>
                <p className="text-sm">Aggiungi gli URL iCal da Booking.com o Airbnb</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feeds.map(feed => (
                  <div 
                    key={feed.id} 
                    className={`border rounded-lg p-4 ${feed.attivo ? 'bg-white' : 'bg-gray-50 opacity-75'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {getSourceIcon(feed.nome)}
                        </div>
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {feed.nome}
                            {feed.attivo ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 font-mono truncate max-w-md">
                            {feed.url}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-gray-500">Ultima sync:</p>
                          <p className="font-medium">{formatDate(feed.ultima_sincronizzazione)}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-500">Eventi:</p>
                          <p className="font-medium">{feed.eventi_importati}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={feed.attivo} 
                            onCheckedChange={() => handleToggleFeed(feed)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleSync(feed.id)}
                            disabled={syncing}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteFeed(feed.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">Dove trovare gli URL iCal:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li><strong>Booking.com:</strong> Struttura → Calendario → Sincronizza calendario → "Esporta URL calendario"</li>
                <li><strong>Airbnb:</strong> Annuncio → Disponibilità → Collega calendari → "Esporta calendario" → Copia link</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Add Feed Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Feed iCal</DialogTitle>
              <DialogDescription>
                Inserisci l'URL del calendario da importare
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nome del canale</Label>
                <Select 
                  value={feedForm.nome} 
                  onValueChange={(v) => setFeedForm({...feedForm, nome: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona canale..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Booking.com">Booking.com</SelectItem>
                    <SelectItem value="Airbnb">Airbnb</SelectItem>
                    <SelectItem value="VRBO">VRBO</SelectItem>
                    <SelectItem value="Expedia">Expedia</SelectItem>
                    <SelectItem value="Altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {feedForm.nome === 'Altro' && (
                <div>
                  <Label>Nome personalizzato</Label>
                  <Input 
                    placeholder="Es. HomeAway"
                    onChange={(e) => setFeedForm({...feedForm, nome: e.target.value})}
                  />
                </div>
              )}
              
              <div>
                <Label>URL del calendario iCal</Label>
                <Input 
                  placeholder="https://..."
                  value={feedForm.url}
                  onChange={(e) => setFeedForm({...feedForm, url: e.target.value})}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Attivo</Label>
                <Switch 
                  checked={feedForm.attivo}
                  onCheckedChange={(v) => setFeedForm({...feedForm, attivo: v})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleAddFeed} className="bg-[#C5A059] hover:bg-[#B08A3E]">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
