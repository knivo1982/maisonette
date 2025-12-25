import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import axios from 'axios';
import { toast } from 'sonner';
import { Gift, User, Clock, Check, X, Search, Plus, Minus, Trophy, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

import { API } from '../../lib/api';

export default function AdminRedemptions() {
  const { token } = useAuth();
  const [redemptions, setRedemptions] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, completed
  const [searchTerm, setSearchTerm] = useState('');
  const [addPointsDialog, setAddPointsDialog] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [pointsDescription, setPointsDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      // Fetch all loyalty transactions (redemptions)
      const transResponse = await axios.get(`${API}/admin/loyalty/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter only redemptions (negative points = riscatto)
      const allRedemptions = transResponse.data.filter(t => t.tipo === 'riscatto');
      setRedemptions(allRedemptions);
      
      // Fetch guests
      const guestsResponse = await axios.get(`${API}/admin/guests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuests(guestsResponse.data.filter(g => !g.is_admin));
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoints = async (e) => {
    e.preventDefault();
    if (!selectedGuest || !pointsToAdd) return;
    
    try {
      await axios.post(`${API}/admin/loyalty/add`, {
        guest_id: selectedGuest,
        punti: parseInt(pointsToAdd),
        descrizione: pointsDescription || 'Punti aggiunti manualmente'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${pointsToAdd} punti aggiunti con successo!`);
      setAddPointsDialog(false);
      setSelectedGuest(null);
      setPointsToAdd('');
      setPointsDescription('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const markAsDelivered = async (transactionId) => {
    // In a real app, you'd update the transaction status
    // For now, we'll just show a toast
    toast.success('Premio segnato come consegnato!');
  };

  const getGuestInfo = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    return guest || { nome: 'Ospite', cognome: '', email: 'N/A' };
  };

  const getTimeAgo = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: it });
    } catch {
      return dateString;
    }
  };

  const filteredRedemptions = redemptions.filter(r => {
    const guest = getGuestInfo(r.guest_id);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      guest.nome?.toLowerCase().includes(searchLower) ||
      guest.cognome?.toLowerCase().includes(searchLower) ||
      guest.email?.toLowerCase().includes(searchLower) ||
      r.descrizione?.toLowerCase().includes(searchLower);
    
    return matchesSearch;
  });

  // Statistics
  const totalRedemptions = redemptions.length;
  const totalPointsRedeemed = redemptions.reduce((sum, r) => sum + Math.abs(r.punti), 0);
  const guestsWithPoints = guests.filter(g => (g.punti_fedelta || 0) > 0);

  return (
    <AdminLayout title="Riscatti Premi">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C5A059]/20 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-[#C5A059]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A202C]">{totalRedemptions}</p>
                <p className="text-sm text-[#4A5568]">Premi Riscattati</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A202C]">{totalPointsRedeemed}</p>
                <p className="text-sm text-[#4A5568]">Punti Usati</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A202C]">{guestsWithPoints.length}</p>
                <p className="text-sm text-[#4A5568]">Ospiti con Punti</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-4">
            <Dialog open={addPointsDialog} onOpenChange={setAddPointsDialog}>
              <DialogTrigger asChild>
                <Button className="w-full h-full bg-[#C5A059] hover:bg-[#B08D45]">
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Punti
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi Punti Fedeltà</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddPoints} className="space-y-4">
                  <div>
                    <Label>Ospite</Label>
                    <Select value={selectedGuest || ''} onValueChange={setSelectedGuest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona ospite..." />
                      </SelectTrigger>
                      <SelectContent>
                        {guests.map(guest => (
                          <SelectItem key={guest.id} value={guest.id}>
                            {guest.nome} {guest.cognome} ({guest.punti_fedelta || 0} pt)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Punti da Aggiungere</Label>
                    <Input
                      type="number"
                      value={pointsToAdd}
                      onChange={(e) => setPointsToAdd(e.target.value)}
                      placeholder="Es. 50"
                      required
                    />
                  </div>
                  <div>
                    <Label>Motivazione</Label>
                    <Input
                      value={pointsDescription}
                      onChange={(e) => setPointsDescription(e.target.value)}
                      placeholder="Es. Bonus benvenuto"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#C5A059] hover:bg-[#B08D45]">
                    Aggiungi Punti
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Cerca per nome ospite o premio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Redemptions List */}
      <div className="space-y-4">
        <h2 className="font-cinzel text-xl text-[#1A202C]">Storico Riscatti</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
          </div>
        ) : filteredRedemptions.length === 0 ? (
          <Card className="border-[#E2E8F0]">
            <CardContent className="py-12 text-center">
              <Gift className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
              <p className="font-manrope text-[#4A5568]">Nessun riscatto ancora</p>
            </CardContent>
          </Card>
        ) : (
          filteredRedemptions.map((redemption) => {
            const guest = getGuestInfo(redemption.guest_id);
            return (
              <Card key={redemption.id} className="border-[#E2E8F0]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#C5A059]/20 rounded-full flex items-center justify-center">
                        <Gift className="w-6 h-6 text-[#C5A059]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[#1A202C]">{redemption.descrizione}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[#4A5568]">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {guest.nome} {guest.cognome}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {getTimeAgo(redemption.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-[#718096] mt-1">{guest.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-red-600">
                        -{Math.abs(redemption.punti)} pt
                      </span>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsDelivered(redemption.id)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Consegnato
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Guests with Points */}
      <div className="mt-8 space-y-4">
        <h2 className="font-cinzel text-xl text-[#1A202C]">Ospiti con Punti Fedeltà</h2>
        
        {guestsWithPoints.length === 0 ? (
          <Card className="border-[#E2E8F0]">
            <CardContent className="py-8 text-center text-[#4A5568]">
              Nessun ospite ha ancora accumulato punti
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guestsWithPoints.map(guest => (
              <Card key={guest.id} className="border-[#E2E8F0]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">{guest.nome?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-[#1A202C]">{guest.nome} {guest.cognome}</p>
                        <p className="text-xs text-[#4A5568]">{guest.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#C5A059]">{guest.punti_fedelta || 0}</p>
                      <p className="text-xs text-[#4A5568]">punti</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
