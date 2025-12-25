import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Users, Calendar, TrendingUp, DollarSign, Moon, Percent, 
  Home, ArrowRight, Download, RefreshCw, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { API } from '../../lib/api';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, [token]);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/admin/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Errore nel caricamento statistiche');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    setReportLoading(true);
    try {
      const response = await axios.get(`${API}/admin/statistics/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Generate simple text report
      const report = response.data;
      let content = `
═══════════════════════════════════════════════════════════════
                 LA MAISONETTE DI PAESTUM
                    REPORT MENSILE
                   ${report.report_month}
═══════════════════════════════════════════════════════════════

RIEPILOGO
─────────────────────────────────────────────────────────────
Prenotazioni totali:     ${report.summary.total_bookings}
Prenotazioni cancellate: ${report.summary.cancelled_bookings}
Notti vendute:           ${report.summary.total_nights}
Tasso occupazione:       ${report.summary.occupancy_rate}%
Durata media soggiorno:  ${report.summary.average_stay} notti
─────────────────────────────────────────────────────────────
TOTALE INCASSI:          €${report.summary.total_revenue.toLocaleString('it-IT')}
═══════════════════════════════════════════════════════════════

DETTAGLIO PRENOTAZIONI
─────────────────────────────────────────────────────────────
`;
      
      report.bookings.forEach((b, i) => {
        content += `
${i + 1}. ${b.nome_ospite}
   ${b.data_arrivo} → ${b.data_partenza} (${b.notti} notti)
   Provenienza: ${b.provenienza}
   Importo: €${b.revenue}
`;
      });

      content += `
═══════════════════════════════════════════════════════════════
Report generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
═══════════════════════════════════════════════════════════════
`;

      // Download as text file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${report.report_month.replace(' ', '-')}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report scaricato!');
    } catch (error) {
      toast.error('Errore nel download del report');
    } finally {
      setReportLoading(false);
    }
  };

  const sourceLabels = {
    airbnb: { label: 'Airbnb', color: 'bg-red-500', icon: '🏠' },
    booking: { label: 'Booking', color: 'bg-blue-600', icon: '🅱️' },
    direct: { label: 'Diretto', color: 'bg-green-500', icon: '👤' },
    phone: { label: 'Telefono', color: 'bg-yellow-500', icon: '📞' },
    whatsapp: { label: 'WhatsApp', color: 'bg-emerald-500', icon: '💬' }
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#C5A059]" />
        </div>
      </AdminLayout>
    );
  }

  const totalSourceBookings = stats?.source_breakdown ? 
    Object.values(stats.source_breakdown).reduce((a, b) => a + b, 0) : 0;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header con azioni */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-cinzel text-gray-800">Benvenuto, Admin!</h2>
            <p className="text-gray-500">Panoramica della tua struttura</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStatistics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna
            </Button>
            <Button onClick={downloadReport} disabled={reportLoading} className="bg-[#C5A059] hover:bg-[#B08A3E]">
              <Download className="w-4 h-4 mr-2" />
              {reportLoading ? 'Generando...' : 'Scarica Report'}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Prenotazioni Mese</p>
                  <p className="text-3xl font-bold text-gray-800">{stats?.overview?.total_bookings_month || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Notti Vendute</p>
                  <p className="text-3xl font-bold text-gray-800">{stats?.overview?.nights_sold_month || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Moon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Occupazione</p>
                  <p className="text-3xl font-bold text-gray-800">{stats?.overview?.occupancy_rate || 0}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Percent className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Incassi Mese</p>
                  <p className="text-3xl font-bold text-gray-800">€{(stats?.overview?.revenue_month || 0).toLocaleString('it-IT')}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second row - Year stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-600">Prenotazioni Anno</p>
              <p className="text-2xl font-bold text-[#C5A059]">{stats?.overview?.total_bookings_year || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-600">Notti Anno</p>
              <p className="text-2xl font-bold text-[#C5A059]">{stats?.overview?.nights_sold_year || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-600">Incassi Anno</p>
              <p className="text-2xl font-bold text-[#C5A059]">€{(stats?.overview?.revenue_year || 0).toLocaleString('it-IT')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-600">Ospiti Totali</p>
              <p className="text-2xl font-bold text-[#C5A059]">{stats?.overview?.total_guests || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Provenienza prenotazioni */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#C5A059]" />
                Provenienza Prenotazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.source_breakdown && totalSourceBookings > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.source_breakdown)
                    .filter(([_, count]) => count > 0)
                    .sort(([,a], [,b]) => b - a)
                    .map(([source, count]) => {
                      const info = sourceLabels[source] || { label: source, color: 'bg-gray-500', icon: '📌' };
                      const percentage = Math.round((count / totalSourceBookings) * 100);
                      return (
                        <div key={source}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <span>{info.icon}</span>
                              {info.label}
                            </span>
                            <span className="font-medium">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`${info.color} h-2 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nessuna prenotazione registrata</p>
              )}
            </CardContent>
          </Card>

          {/* Trend mensile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C5A059]" />
                Trend Ultimi 6 Mesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.monthly_trend && (
                <div className="space-y-2">
                  {stats.monthly_trend.map((month, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm font-medium text-gray-600">{month.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-blue-600">{month.bookings} pren.</span>
                        <span className="text-sm font-medium text-green-600">€{month.revenue.toLocaleString('it-IT')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prossimi check-in */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C5A059]" />
                Prossimi Check-in ({stats?.upcoming_checkins || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.upcoming_checkins_list?.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcoming_checkins_list.map((booking, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-800">{booking.nome_ospite}</p>
                      <p className="text-sm text-blue-600">
                        {new Date(booking.data_arrivo).toLocaleDateString('it-IT')} → {new Date(booking.data_partenza).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nessun check-in nei prossimi 7 giorni</p>
              )}
              
              <Link to="/admin/calendar">
                <Button variant="ghost" className="w-full mt-4">
                  Vai al Calendario
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/admin/calendar">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Calendar className="w-6 h-6 mb-2" />
                  Calendario
                </Button>
              </Link>
              <Link to="/admin/bookings">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Users className="w-6 h-6 mb-2" />
                  Prenotazioni
                </Button>
              </Link>
              <Link to="/admin/ical">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <RefreshCw className="w-6 h-6 mb-2" />
                  Sync Calendari
                </Button>
              </Link>
              <Link to="/admin/pricing">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <DollarSign className="w-6 h-6 mb-2" />
                  Prezzi
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
