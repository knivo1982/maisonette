import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  DollarSign, Save, Calculator, Calendar, Percent, Users, Moon, Sun, Snowflake, Leaf
} from 'lucide-react';

import { API } from '../../lib/api';

export default function AdminPricing() {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    prezzo_base: 100,
    prezzo_weekend: 120,
    supplemento_ospite: 15,
    ospiti_inclusi: 2,
    sconto_settimanale: 10,
    sconto_mensile: 20,
    min_notti: 2,
    min_notti_alta_stagione: 3,
    stagioni: [
      { nome: 'Alta', mesi: [7, 8], moltiplicatore: 1.5 },
      { nome: 'Media', mesi: [4, 5, 6, 9, 10], moltiplicatore: 1.2 },
      { nome: 'Bassa', mesi: [1, 2, 3, 11, 12], moltiplicatore: 1.0 }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Calcolatore
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calcForm, setCalcForm] = useState({
    data_arrivo: '',
    data_partenza: '',
    num_ospiti: 2
  });
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/pricing/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/pricing/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Impostazioni salvate!');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const calculatePrice = async () => {
    if (!calcForm.data_arrivo || !calcForm.data_partenza) {
      toast.error('Seleziona le date');
      return;
    }
    
    setCalculating(true);
    try {
      const response = await axios.post(`${API}/admin/pricing/calculate`, calcForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCalcResult(response.data);
    } catch (error) {
      toast.error('Errore nel calcolo');
    } finally {
      setCalculating(false);
    }
  };

  const updateSeason = (index, field, value) => {
    const newStagioni = [...settings.stagioni];
    newStagioni[index] = { ...newStagioni[index], [field]: value };
    setSettings({ ...settings, stagioni: newStagioni });
  };

  const toggleMonth = (seasonIndex, month) => {
    const newStagioni = [...settings.stagioni];
    const mesi = newStagioni[seasonIndex].mesi;
    
    // Remove month from all seasons first
    newStagioni.forEach((s, i) => {
      s.mesi = s.mesi.filter(m => m !== month);
    });
    
    // Add to selected season
    newStagioni[seasonIndex].mesi = [...mesi.filter(m => m !== month), month].sort((a,b) => a-b);
    
    setSettings({ ...settings, stagioni: newStagioni });
  };

  const getSeasonForMonth = (month) => {
    for (let i = 0; i < settings.stagioni.length; i++) {
      if (settings.stagioni[i].mesi.includes(month)) {
        return i;
      }
    }
    return -1;
  };

  const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const seasonColors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500'];
  const seasonIcons = [Sun, Leaf, Snowflake];

  if (loading) {
    return (
      <AdminLayout title="Gestione Prezzi">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestione Prezzi">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Configurazione Prezzi</h2>
            <p className="text-gray-500 text-sm">Gestisci tariffe, stagioni e sconti</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCalcDialogOpen(true)}>
              <Calculator className="w-4 h-4 mr-2" />
              Calcola Prezzo
            </Button>
            <Button onClick={saveSettings} disabled={saving} className="bg-[#C5A059] hover:bg-[#B08A3E]">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salva'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Prezzi Base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#C5A059]" />
                Prezzi Base
              </CardTitle>
              <CardDescription>Tariffe giornaliere standard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prezzo Base (Lun-Ven)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    <Input
                      type="number"
                      value={settings.prezzo_base}
                      onChange={(e) => setSettings({...settings, prezzo_base: parseFloat(e.target.value)})}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Prezzo Weekend (Sab-Dom)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    <Input
                      type="number"
                      value={settings.prezzo_weekend}
                      onChange={(e) => setSettings({...settings, prezzo_weekend: parseFloat(e.target.value)})}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimo Notti</Label>
                  <Input
                    type="number"
                    min="1"
                    value={settings.min_notti}
                    onChange={(e) => setSettings({...settings, min_notti: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Min. Notti Alta Stagione</Label>
                  <Input
                    type="number"
                    min="1"
                    value={settings.min_notti_alta_stagione}
                    onChange={(e) => setSettings({...settings, min_notti_alta_stagione: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ospiti e Supplementi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C5A059]" />
                Ospiti e Supplementi
              </CardTitle>
              <CardDescription>Gestione ospiti extra</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ospiti Inclusi</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.ospiti_inclusi}
                    onChange={(e) => setSettings({...settings, ospiti_inclusi: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Numero di ospiti senza supplemento</p>
                </div>
                <div>
                  <Label>Supplemento per Ospite Extra</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    <Input
                      type="number"
                      value={settings.supplemento_ospite}
                      onChange={(e) => setSettings({...settings, supplemento_ospite: parseFloat(e.target.value)})}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Per notte, per ogni ospite oltre il limite</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sconti Soggiorni Lunghi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#C5A059]" />
                Sconti Soggiorni Lunghi
              </CardTitle>
              <CardDescription>Incentiva prenotazioni più lunghe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sconto Settimanale (7+ notti)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={settings.sconto_settimanale}
                      onChange={(e) => setSettings({...settings, sconto_settimanale: parseInt(e.target.value)})}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <Label>Sconto Mensile (30+ notti)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={settings.sconto_mensile}
                      onChange={(e) => setSettings({...settings, sconto_mensile: parseInt(e.target.value)})}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  💡 Gli sconti vengono applicati automaticamente sul totale del soggiorno
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stagioni */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C5A059]" />
                Stagioni e Moltiplicatori
              </CardTitle>
              <CardDescription>Clicca sui mesi per assegnarli alla stagione</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Season headers */}
              <div className="grid grid-cols-3 gap-2">
                {settings.stagioni.map((stagione, idx) => {
                  const Icon = seasonIcons[idx];
                  return (
                    <div key={idx} className={`p-3 rounded-lg ${idx === 0 ? 'bg-red-50' : idx === 1 ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${idx === 0 ? 'text-red-500' : idx === 1 ? 'text-yellow-600' : 'text-blue-500'}`} />
                        <span className="font-medium text-sm">{stagione.nome}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">x</span>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3"
                          value={stagione.moltiplicatore}
                          onChange={(e) => updateSeason(idx, 'moltiplicatore', parseFloat(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Month selector */}
              <div className="grid grid-cols-6 gap-2">
                {monthNames.map((nome, idx) => {
                  const month = idx + 1;
                  const seasonIdx = getSeasonForMonth(month);
                  return (
                    <div key={month} className="text-center">
                      <button
                        onClick={() => {
                          const nextSeason = (seasonIdx + 1) % 3;
                          toggleMonth(nextSeason, month);
                        }}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                          seasonIdx === 0 ? 'bg-red-500 text-white' :
                          seasonIdx === 1 ? 'bg-yellow-500 text-white' :
                          seasonIdx === 2 ? 'bg-blue-500 text-white' :
                          'bg-gray-200'
                        }`}
                      >
                        {nome}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-500 rounded"></span> Alta (x{settings.stagioni[0]?.moltiplicatore})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-yellow-500 rounded"></span> Media (x{settings.stagioni[1]?.moltiplicatore})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 rounded"></span> Bassa (x{settings.stagioni[2]?.moltiplicatore})
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calculator Dialog */}
        <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#C5A059]" />
                Calcola Prezzo Soggiorno
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-in</Label>
                  <Input
                    type="date"
                    value={calcForm.data_arrivo}
                    onChange={(e) => setCalcForm({...calcForm, data_arrivo: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Check-out</Label>
                  <Input
                    type="date"
                    value={calcForm.data_partenza}
                    onChange={(e) => setCalcForm({...calcForm, data_partenza: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label>Numero Ospiti</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={calcForm.num_ospiti}
                  onChange={(e) => setCalcForm({...calcForm, num_ospiti: parseInt(e.target.value)})}
                />
              </div>
              
              <Button onClick={calculatePrice} disabled={calculating} className="w-full bg-[#C5A059] hover:bg-[#B08A3E]">
                {calculating ? 'Calcolando...' : 'Calcola'}
              </Button>
              
              {calcResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Notti:</span>
                    <span className="font-medium">{calcResult.num_notti}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Prezzo notti:</span>
                    <span>€{calcResult.prezzo_notti}</span>
                  </div>
                  {calcResult.supplemento_ospiti > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Supplemento ospiti:</span>
                      <span>€{calcResult.supplemento_ospiti}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span>Subtotale:</span>
                    <span>€{calcResult.subtotale}</span>
                  </div>
                  {calcResult.sconto > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{calcResult.tipo_sconto}:</span>
                      <span>-€{calcResult.sconto}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>TOTALE:</span>
                    <span className="text-[#C5A059]">€{calcResult.totale}</span>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
