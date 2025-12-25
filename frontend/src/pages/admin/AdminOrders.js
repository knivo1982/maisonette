import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import axios from 'axios';
import { toast } from 'sonner';
import { ShoppingCart, Euro, Package } from 'lucide-react';

import { API } from '../../lib/api';

const STATUSES = [
  { value: 'pending', label: 'In attesa', class: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confermato', class: 'bg-blue-100 text-blue-700' },
  { value: 'delivered', label: 'Consegnato', class: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Annullato', class: 'bg-red-100 text-red-700' }
];

export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status?status=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status aggiornato!');
      fetchOrders();
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

  return (
    <AdminLayout title="Gestione Ordini Shop">
      <div className="flex justify-between items-center mb-6">
        <p className="font-manrope text-[#4A5568]">
          {orders.length} ordini totali
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568]">Nessun ordine ricevuto.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-[#E2E8F0]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-manrope text-sm text-[#4A5568] mb-1">
                      Ordine #{order.id.slice(0, 8)}
                    </p>
                    <p className="font-manrope text-xs text-[#4A5568]">
                      {new Date(order.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(order.status)}
                    <Select 
                      value={order.status} 
                      onValueChange={(v) => handleStatusChange(order.id, v)}
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
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-[#F9F9F7] rounded-sm p-4 mb-4">
                  <p className="font-manrope text-sm font-medium text-[#4A5568] mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Prodotti ordinati
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-[#1A202C]">
                          {item.nome} × {item.quantita}
                        </span>
                        <span className="text-[#4A5568]">
                          €{item.subtotale.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                {order.note && (
                  <p className="text-sm text-[#4A5568] mb-4 italic">
                    Note: {order.note}
                  </p>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t border-[#E2E8F0]">
                  <span className="font-manrope font-medium">Totale</span>
                  <span className="font-cinzel text-xl text-[#C5A059] flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    {order.totale.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
