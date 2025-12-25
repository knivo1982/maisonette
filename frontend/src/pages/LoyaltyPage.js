import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import axios from 'axios';
import { toast } from 'sonner';
import { Gift, Star, TrendingUp, ArrowRight, History, Euro, ShoppingBag, Wine, Compass, Home } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LoyaltyPage() {
  const { user, token, loading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [localPoints, setLocalPoints] = useState(null); // Local state for immediate UI update

  // Use local points if available, otherwise use user points
  const points = localPoints !== null ? localPoints : (user?.punti_fedelta || 0);

  useEffect(() => {
    // Sync local points with user when user changes
    if (user?.punti_fedelta !== undefined) {
      setLocalPoints(user.punti_fedelta);
    }
  }, [user?.punti_fedelta]);

  useEffect(() => {
    fetchRewards();
    if (token) {
      // Refresh user data to get latest points
      refreshUser();
      fetchTransactions();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchRewards = async () => {
    try {
      const response = await axios.get(`${API}/loyalty/rewards`);
      setRewards(response.data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/loyalty/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (reward) => {
    console.log('handleRedeemReward called', { reward, points, isAuthenticated });
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (points < reward.punti_richiesti) {
      toast.error(`Hai bisogno di ${reward.punti_richiesti} punti. Ne hai ${points}.`);
      return;
    }

    if (!window.confirm(`Vuoi riscattare "${reward.nome}" per ${reward.punti_richiesti} punti?`)) {
      return;
    }

    setRedeeming(reward.id);
    try {
      console.log('Calling redeem API...');
      const response = await axios.post(`${API}/loyalty/redeem-reward?reward_id=${reward.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Redeem response:', response.data);
      
      // Immediately update local points for instant UI feedback
      const newPoints = response.data.punti_rimanenti;
      setLocalPoints(newPoints);
      
      // Show success with confetti effect
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">🎉 {response.data.message}</span>
          <span className="text-sm">Punti rimanenti: {newPoints}</span>
        </div>,
        { duration: 5000 }
      );
      
      // Refresh user data in background
      refreshUser();
      
      // Refresh transactions to show the redemption
      await fetchTransactions();
      
    } catch (error) {
      console.error('Redeem error:', error);
      toast.error(error.response?.data?.detail || 'Errore durante il riscatto');
    } finally {
      setRedeeming(null);
    }
  };

  const getCategoryIcon = (categoria) => {
    switch (categoria) {
      case 'bevande': return <Wine className="w-8 h-8" />;
      case 'gastronomia': return <ShoppingBag className="w-8 h-8" />;
      case 'esperienze': return <Compass className="w-8 h-8" />;
      case 'soggiorni': return <Home className="w-8 h-8" />;
      default: return <Gift className="w-8 h-8" />;
    }
  };

  // points is now defined at the top of the component

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
            Premi Esclusivi
          </p>
          <h1 className="font-cinzel text-4xl md:text-5xl text-[#1A202C] mb-4">
            Programma Fedeltà
          </h1>
          <p className="font-manrope text-[#4A5568] max-w-2xl mx-auto">
            Ogni €10 spesi durante il tuo soggiorno ti fanno guadagnare 1 punto. 
            Accumula punti e riscatta fantastici premi!
          </p>
        </div>

        {/* User Points Card (if logged in) */}
        {isAuthenticated && (
          <Card className="loyalty-card mb-12 border-none overflow-hidden">
            <CardContent className="p-8 md:p-10 relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="font-manrope text-gray-400 text-sm uppercase tracking-wider mb-2">
                    I tuoi punti
                  </p>
                  <p className="points-display">
                    {points}
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-lg">
                  <p className="font-manrope text-gray-300 text-sm mb-1">Ciao, {user?.nome}!</p>
                  <p className="font-manrope text-white">
                    {points >= 100 
                      ? 'Puoi riscattare un premio!' 
                      : `Ancora ${100 - points} punti per il primo premio`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <div className="mb-16">
          <h2 className="font-cinzel text-2xl text-[#1A202C] text-center mb-8">Come Funziona</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Euro className="w-10 h-10 text-[#C5A059]" />
              </div>
              <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">1. Spendi</h3>
              <p className="font-manrope text-sm text-[#4A5568]">
                Ogni €10 spesi durante il soggiorno ti fanno guadagnare 1 punto
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-[#C5A059]" />
              </div>
              <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">2. Accumula</h3>
              <p className="font-manrope text-sm text-[#4A5568]">
                I punti non scadono mai e si sommano ad ogni soggiorno
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-10 h-10 text-[#C5A059]" />
              </div>
              <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">3. Riscatta</h3>
              <p className="font-manrope text-sm text-[#4A5568]">
                Scegli il premio che preferisci dal nostro catalogo
              </p>
            </div>
          </div>
        </div>

        {/* Rewards Catalog */}
        <div className="mb-16">
          <h2 className="font-cinzel text-2xl text-[#1A202C] text-center mb-2">Catalogo Premi</h2>
          <p className="font-manrope text-[#4A5568] text-center mb-8">Scegli tra i premi disponibili</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => {
              const canRedeem = isAuthenticated && points >= reward.punti_richiesti;
              
              return (
                <Card 
                  key={reward.id} 
                  className={`border-2 transition-all ${
                    canRedeem 
                      ? 'border-[#C5A059] shadow-lg' 
                      : 'border-gray-200'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      canRedeem ? 'bg-[#C5A059] text-white' : 'bg-[#F9F9F7] text-[#C5A059]'
                    }`}>
                      {getCategoryIcon(reward.categoria)}
                    </div>
                    
                    <h3 className="font-cinzel text-lg text-[#1A202C] text-center mb-2">
                      {reward.nome}
                    </h3>
                    <p className="font-manrope text-sm text-[#4A5568] text-center mb-4 line-clamp-2">
                      {reward.descrizione}
                    </p>
                    
                    <div className="text-center mb-4">
                      <span className="font-cinzel text-3xl text-[#C5A059]">{reward.punti_richiesti}</span>
                      <span className="font-manrope text-sm text-[#4A5568] ml-1">punti</span>
                    </div>

                    {isAuthenticated ? (
                      <Button
                        onClick={() => handleRedeemReward(reward)}
                        disabled={!canRedeem || redeeming === reward.id}
                        className={`w-full ${
                          canRedeem 
                            ? 'bg-[#C5A059] hover:bg-[#B08D45] text-white' 
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {redeeming === reward.id ? 'Riscatto...' : canRedeem ? 'Riscatta' : `Ti mancano ${reward.punti_richiesti - points} punti`}
                      </Button>
                    ) : (
                      <Link to="/login">
                        <Button variant="outline" className="w-full border-[#C5A059] text-[#C5A059]">
                          Accedi per Riscattare
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Transaction History (if logged in) */}
        {isAuthenticated && (
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="font-cinzel text-xl text-[#1A202C] flex items-center gap-2">
                <History className="w-5 h-5 text-[#C5A059]" />
                Storico Transazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
                  <p className="font-manrope text-[#4A5568]">
                    Nessuna transazione ancora.<br />
                    Inizia a soggiornare per accumulare punti!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.tipo === 'guadagno' ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                          {tx.tipo === 'guadagno' ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <Gift className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-manrope font-medium text-[#1A202C]">
                            {tx.descrizione}
                          </p>
                          <p className="font-manrope text-sm text-[#4A5568]">
                            {new Date(tx.created_at).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <p className={`font-cinzel text-xl ${
                        tx.punti > 0 ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {tx.punti > 0 ? '+' : ''}{tx.punti}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <div className="mt-12 text-center bg-[#F9F9F7] p-8 rounded-lg">
            <h3 className="font-cinzel text-2xl text-[#1A202C] mb-4">
              Inizia a Guadagnare Punti!
            </h3>
            <p className="font-manrope text-[#4A5568] mb-6">
              Registrati o accedi per iniziare ad accumulare punti e riscattare fantastici premi.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/register">
                <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white">
                  Registrati Ora
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="border-[#C5A059] text-[#C5A059]">
                  Accedi
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
