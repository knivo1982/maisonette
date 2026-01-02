import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PushNotificationToggle from '../components/PushNotificationToggle';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, MapPin, Gift, ClipboardCheck, ArrowRight, Star, Copy, Bell } from 'lucide-react';

import { API } from '../lib/api';

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (token) {
      fetchCheckins();
    }
  }, [token]);

  const fetchCheckins = async () => {
    try {
      const response = await axios.get(`${API}/checkin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCheckins(response.data);
    } catch (error) {
      console.error('Error fetching checkins:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (user?.codice_prenotazione) {
      navigator.clipboard.writeText(user.codice_prenotazione);
      toast.success('Codice copiato negli appunti!');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { class: 'status-pending', label: 'In attesa' },
      confirmed: { class: 'status-confirmed', label: 'Confermato' },
      completed: { class: 'status-completed', label: 'Completato' },
      cancelled: { class: 'status-cancelled', label: 'Annullato' }
    };
    const s = statusMap[status] || statusMap.pending;
    return (
      <span className={`${s.class} px-3 py-1 rounded-full text-xs font-medium`}>
        {s.label}
      </span>
    );
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
              {language === 'en' ? 'Welcome' : 'Benvenuto'}
            </p>
            <h1 className="font-cinzel text-4xl md:text-5xl text-[#1A202C] mb-4">
              {language === 'en' ? 'Hello' : 'Ciao'}, {user.nome}!
            </h1>
            <p className="font-manrope text-[#4A5568]">
              {language === 'en' 
                ? 'Manage your stay and discover exclusive benefits'
                : 'Gestisci il tuo soggiorno e scopri i vantaggi esclusivi'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PushNotificationToggle token={token} language={language} />
          </div>
        </div>

        {/* Booking Code Card */}
        <Card className="mb-8 bg-[#1A202C] text-white border-none overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="font-manrope text-sm text-gray-400 mb-2">Il tuo codice prenotazione</p>
                <div className="flex items-center gap-4">
                  <p className="font-cinzel text-3xl text-[#C5A059]" data-testid="booking-code">
                    {user.codice_prenotazione}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyCode}
                    className="text-gray-400 hover:text-[#C5A059]"
                    data-testid="copy-code-btn"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
                <p className="font-manrope text-xs text-gray-500 mt-2">
                  Usa questo codice per accedere rapidamente
                </p>
              </div>
              <div className="text-right">
                <p className="font-manrope text-sm text-gray-400 mb-1">Punti Fedeltà</p>
                <p className="font-cinzel text-4xl text-[#C5A059]" data-testid="points-display">
                  {user.punti_fedelta}
                </p>
                <p className="font-manrope text-xs text-gray-500">
                  {100 - (user.punti_fedelta % 100)} punti alla prossima notte omaggio
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { to: '/checkin', icon: ClipboardCheck, label: 'Nuovo Check-in', desc: 'Effettua il check-in' },
            { to: '/events', icon: Calendar, label: 'Eventi', desc: 'Scopri gli eventi' },
            { to: '/structures', icon: MapPin, label: 'Territorio', desc: 'Esplora la zona' },
            { to: '/loyalty', icon: Gift, label: 'Punti Fedeltà', desc: 'Gestisci i punti' }
          ].map((action, index) => (
            <Link key={index} to={action.to}>
              <Card className="h-full card-hover border-[#E2E8F0] hover:border-[#C5A059] transition-all" data-testid={`quick-action-${action.label.toLowerCase().replace(' ', '-')}`}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-[#F9F9F7] flex items-center justify-center mb-4 rounded-sm">
                    <action.icon className="w-7 h-7 text-[#C5A059]" />
                  </div>
                  <h3 className="font-cinzel text-lg text-[#1A202C] mb-1">{action.label}</h3>
                  <p className="font-manrope text-sm text-[#4A5568]">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Check-ins */}
        <Card className="border-[#E2E8F0]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-cinzel text-xl text-[#1A202C]">
              I Tuoi Check-in
            </CardTitle>
            <Link to="/checkin">
              <Button variant="outline" size="sm" className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white" data-testid="new-checkin-btn">
                Nuovo Check-in
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="spinner" />
              </div>
            ) : checkins.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
                <p className="font-manrope text-[#4A5568] mb-4">
                  Non hai ancora effettuato check-in
                </p>
                <Link to="/checkin">
                  <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white" data-testid="first-checkin-btn">
                    Effettua il primo Check-in
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {checkins.slice(0, 5).map((checkin) => (
                  <div 
                    key={checkin.id}
                    className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-sm"
                    data-testid={`checkin-item-${checkin.id}`}
                  >
                    <div>
                      <p className="font-manrope font-medium text-[#1A202C]">
                        {new Date(checkin.data_arrivo).toLocaleDateString('it-IT', { 
                          day: 'numeric', month: 'long', year: 'numeric' 
                        })} - {new Date(checkin.data_partenza).toLocaleDateString('it-IT', { 
                          day: 'numeric', month: 'long', year: 'numeric' 
                        })}
                      </p>
                      <p className="font-manrope text-sm text-[#4A5568]">
                        {checkin.num_ospiti} {checkin.num_ospiti === 1 ? 'ospite' : 'ospiti'}
                      </p>
                    </div>
                    {getStatusBadge(checkin.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
