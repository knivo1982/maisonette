import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileText, LogIn, LogOut, Home, Shield } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'checkin', label: 'Check-in', icon: LogIn },
  { value: 'checkout', label: 'Check-out', icon: LogOut },
  { value: 'soggiorno', label: 'Soggiorno', icon: Home },
  { value: 'sicurezza', label: 'Sicurezza', icon: Shield }
];

export default function AdminHouseRules() {
  const { token } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    titolo: '',
    contenuto: '',
    categoria: '',
    ordine: 0,
    attivo: true
  });

  useEffect(() => {
    fetchRules();
  }, [token]);

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API}/admin/house-rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      ordine: parseInt(formData.ordine)
    };

    try {
      if (editingRule) {
        await axios.put(`${API}/admin/house-rules/${editingRule.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Regola aggiornata!');
      } else {
        await axios.post(`${API}/admin/house-rules`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Regola creata!');
      }
      setDialogOpen(false);
      resetForm();
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa regola?')) return;
    try {
      await axios.delete(`${API}/admin/house-rules/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Regola eliminata!');
      fetchRules();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (rule) => {
    setEditingRule(rule);
    setFormData({
      titolo: rule.titolo,
      contenuto: rule.contenuto,
      categoria: rule.categoria,
      ordine: rule.ordine,
      attivo: rule.attivo
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      titolo: '',
      contenuto: '',
      categoria: '',
      ordine: 0,
      attivo: true
    });
  };

  const getCategoryColor = (cat) => {
    const colors = {
      checkin: 'bg-green-100 text-green-700',
      checkout: 'bg-blue-100 text-blue-700',
      soggiorno: 'bg-amber-100 text-amber-700',
      sicurezza: 'bg-red-100 text-red-700'
    };
    return colors[cat] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout title="Regole della Casa">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {rules.length} regole totali
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white" data-testid="add-rule-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Regola
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-cinzel">
                {editingRule ? 'Modifica Regola' : 'Nuova Regola'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="font-manrope">Titolo</Label>
                <Input
                  value={formData.titolo}
                  onChange={(e) => setFormData({...formData, titolo: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label className="font-manrope">Contenuto</Label>
                <Textarea
                  value={formData.contenuto}
                  onChange={(e) => setFormData({...formData, contenuto: e.target.value})}
                  required
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-manrope">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-manrope">Ordine</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.ordine}
                    onChange={(e) => setFormData({...formData, ordine: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-sm">
                <Label className="font-manrope">Attiva</Label>
                <Switch
                  checked={formData.attivo}
                  onCheckedChange={(checked) => setFormData({...formData, attivo: checked})}
                />
              </div>
              <Button type="submit" className="w-full bg-[#C5A059] hover:bg-[#B08D45]">
                {editingRule ? 'Salva Modifiche' : 'Crea Regola'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : rules.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessuna regola. Clicca "Nuova Regola" per iniziare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="border-[#E2E8F0]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${rule.attivo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded uppercase ${getCategoryColor(rule.categoria)}`}>
                        {CATEGORIES.find(c => c.value === rule.categoria)?.label || rule.categoria}
                      </span>
                      <h3 className="font-cinzel text-lg text-[#1A202C]">{rule.titolo}</h3>
                    </div>
                    <p className="text-sm text-[#4A5568] line-clamp-1">{rule.contenuto}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(rule)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
