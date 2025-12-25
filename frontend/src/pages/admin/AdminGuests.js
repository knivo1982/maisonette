import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { Users, Gift, Mail, Phone, Star } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminGuests() {
  const { token } = useAuth();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [importo, setImporto] = useState('');

  useEffect(() => {
    fetchGuests();
  }, [token]);

  const fetchGuests = async () => {
    try {
      const response = await axios.get(`${API}/admin/guests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuests(response.data);
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoints = async (e) => {
    e.preventDefault();
    if (!selectedGuest || !importo) return;

    try {
      const response = await axios.post(`${API}/admin/loyalty/add`, {
        guest_id: selectedGuest.id,
        importo_spesa: parseFloat(importo)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      setPointsDialogOpen(false);
      setImporto('');
      fetchGuests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const openPointsDialog = (guest) => {
    setSelectedGuest(guest);
    setPointsDialogOpen(true);
  };

  return (
    <AdminLayout title="Gestione Ospiti">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {guests.length} ospiti registrati
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : guests.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessun ospite registrato.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table bg-white rounded-lg overflow-hidden">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Codice</th>
                <th>Punti</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} data-testid={`guest-row-${guest.id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#C5A059]/10 rounded-full flex items-center justify-center">
                        <span className="font-cinzel text-[#C5A059] text-sm">
                          {guest.nome[0]}{guest.cognome[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-manrope font-medium">{guest.nome} {guest.cognome}</p>
                        {guest.is_admin && (
                          <span className="text-xs bg-[#1A202C] text-white px-2 py-0.5 rounded">Admin</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <a href={`mailto:${guest.email}`} className="flex items-center gap-1 text-[#4A5568] hover:text-[#C5A059]">
                      <Mail className="w-4 h-4" />
                      {guest.email}
                    </a>
                  </td>
                  <td>
                    {guest.telefono ? (
                      <a href={`tel:${guest.telefono}`} className="flex items-center gap-1 text-[#4A5568] hover:text-[#C5A059]">
                        <Phone className="w-4 h-4" />
                        {guest.telefono}
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <code className="bg-[#F9F9F7] px-2 py-1 text-sm">
                      {guest.codice_prenotazione}
                    </code>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-[#C5A059]" />
                      <span className="font-cinzel">{guest.punti_fedelta}</span>
                    </div>
                  </td>
                  <td>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openPointsDialog(guest)}
                      className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                      data-testid={`add-points-${guest.id}`}
                    >
                      <Gift className="w-4 h-4 mr-1" />
                      Aggiungi Punti
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Points Dialog */}
      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cinzel">
              Aggiungi Punti a {selectedGuest?.nome} {selectedGuest?.cognome}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPoints} className="space-y-4">
            <div>
              <Label className="font-manrope">Importo Spesa (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                placeholder="Es: 50.00"
                required
                data-testid="importo-input"
              />
              <p className="text-sm text-[#4A5568] mt-2">
                Punti che verranno aggiunti: <strong className="text-[#C5A059]">{Math.floor(parseFloat(importo || 0) / 10)}</strong>
                <br />
                <span className="text-xs">(1 punto ogni 10€)</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setPointsDialogOpen(false)} className="flex-1">
                Annulla
              </Button>
              <Button type="submit" className="flex-1 bg-[#C5A059] hover:bg-[#B08D45]" data-testid="confirm-points-btn">
                Aggiungi Punti
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
