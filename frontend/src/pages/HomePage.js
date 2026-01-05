import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { ArrowRight, Calendar, MapPin, Gift, Star, Sparkles, Sun, Cloud, CloudRain, Snowflake, Wind, Droplets, ThermometerSun, Navigation, ClipboardCheck, FileText, CalendarCheck, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function HomePage() {
  const { isAuthenticated, token, user } = useAuth();
  const { language, t } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [hasActiveCheckin, setHasActiveCheckin] = useState(false);

  // Helper to get translated content
  const getLocalizedText = (item, field) => {
    if (language === 'en' && item[`${field}_en`]) {
      return item[`${field}_en`];
    }
    return item[field] || item[`${field}_it`] || '';
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (token) {
      checkActiveCheckin();
    }
  }, [token]);

  const checkActiveCheckin = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/checkin/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHasActiveCheckin(!!data);
      }
    } catch (error) {
      console.error('Error checking checkin:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch weather and itineraries
      const weatherRes = await fetch(`${BACKEND_URL}/api/itineraries/suggested`);
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        setWeather(data.meteo);
        setItineraries(data.itinerari_suggeriti || []);
      }
      
      // Fetch events
      const eventsRes = await fetch(`${BACKEND_URL}/api/events`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.slice(0, 3)); // Show only 3 events
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'sunny': return <Sun className="w-10 h-10 text-yellow-500" />;
      case 'cloudy': return <Cloud className="w-10 h-10 text-gray-400" />;
      case 'rainy': return <CloudRain className="w-10 h-10 text-blue-500" />;
      case 'cold': return <Snowflake className="w-10 h-10 text-blue-300" />;
      default: return <Sun className="w-10 h-10 text-yellow-500" />;
    }
  };

  const getCategoryIcon = (categoria) => {
    switch (categoria) {
      case 'spiaggia': return '🏖️';
      case 'cultura': return '🏛️';
      case 'natura': return '🌿';
      case 'gastronomia': return '🍷';
      case 'relax': return '💆';
      default: return '📍';
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1504644708628-9c1dd99f497f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxQYWVzdHVtJTIwdGVtcGxlJTIwZ3JlZWslMjBydWlucyUyMGdvbGRlbiUyMGhvdXJ8ZW58MHx8fHwxNzY2MzU1NTAwfDA&ixlib=rb-4.1.0&q=85')`
          }}
        />
        <div className="hero-overlay absolute inset-0" />
        
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto animate-fade-in">
          <img 
            src="https://customer-assets.emergentagent.com/job_9e63d10a-d9aa-4e49-9076-0c5c1ecf4133/artifacts/vr9w9ixp_P%C3%86STUM__5_-removebg-preview.png" 
            alt="La Maisonette Paestum" 
            className="h-24 md:h-32 mx-auto mb-6 brightness-0 invert"
          />
          <p className="font-cormorant text-2xl md:text-3xl italic mb-4 text-[#C5A059]">
            {language === 'en' 
              ? '20 steps from the walls of the Ancient City of Paestum'
              : 'A 20 passi dalle mura dell\'Antica Città di Paestum'}
          </p>
          <p className="font-manrope text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            {language === 'en'
              ? 'Immersed in the magic of Greek temples and the majesty of the ancient city, we offer you an unforgettable stay between modern comfort and historic charm.'
              : 'Immersa nella magia dei templi greci e della maestosità dell\'antica città, vi offriamo un soggiorno indimenticabile tra comfort moderni e fascino storico.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking">
              <Button 
                className="bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel tracking-widest uppercase px-8 py-6 text-sm"
              >
                {t('home.bookNow')}
                <CalendarCheck className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            {isAuthenticated && hasActiveCheckin ? (
              <Link to="/dashboard">
                <Button 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-[#1A202C] font-cinzel tracking-widest uppercase px-8 py-6 text-sm"
                >
                  {language === 'en' ? 'Your Dashboard' : 'La Tua Dashboard'}
                  <LayoutDashboard className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to={isAuthenticated ? "/checkin" : "/login"}>
                <Button 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-[#1A202C] font-cinzel tracking-widest uppercase px-8 py-6 text-sm"
                >
                  {language === 'en' ? 'Online Check-in' : 'Check-in Online'}
                  <ClipboardCheck className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Weather Section with Tour Suggestions */}
      {weather && (
        <section className="py-6 md:py-8 bg-gradient-to-r from-[#1A202C] to-[#2D3748]">
          <div className="max-w-7xl mx-auto px-4">
            {/* Main Weather Display */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  {getWeatherIcon(weather.condizione)}
                </div>
                <div className="text-white">
                  <p className="font-cinzel text-xs text-[#C5A059] uppercase tracking-wider">Paestum Ora</p>
                  <p className="font-cinzel text-3xl md:text-4xl">{weather.temperatura}°C</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 md:gap-6 text-white text-sm">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span>{weather.umidita}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-gray-400" />
                  <span>{weather.vento} km/h</span>
                </div>
              </div>
            </div>
            
            {/* Weather-based Tour Suggestions */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="font-cormorant text-[#C5A059] text-xs uppercase tracking-wider mb-3">
                Consigliato Oggi
              </p>
              <div className="flex flex-wrap gap-2">
                {weather.condizione === 'sunny' || weather.condizione === 'clear' ? (
                  <>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🏖️ Spiaggia
                    </Link>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🏛️ Templi
                    </Link>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🚴 Escursioni
                    </Link>
                  </>
                ) : weather.condizione === 'rainy' || weather.condizione === 'cloudy' ? (
                  <>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🏛️ Museo
                    </Link>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🧀 Caseifici
                    </Link>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🍝 Ristoranti
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🏛️ Templi
                    </Link>
                    <Link to="/structures" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🍕 Gastronomia
                    </Link>
                    <Link to="/events" className="bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                      🎭 Eventi
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="py-12 px-4 bg-[#F9F9F7]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Check-in / Dashboard - depends on status */}
            {isAuthenticated && hasActiveCheckin ? (
              <Link 
                to="/dashboard" 
                className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow text-center group"
              >
                <div className="w-14 h-14 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C5A059]/20 transition-colors">
                  <LayoutDashboard className="w-7 h-7 text-[#C5A059]" />
                </div>
                <h3 className="font-cinzel text-[#1A202C]">Dashboard</h3>
                <p className="text-xs text-[#4A5568] mt-1">Il tuo soggiorno</p>
              </Link>
            ) : (
              <Link 
                to={isAuthenticated ? "/checkin" : "/login"} 
                className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow text-center group"
              >
                <div className="w-14 h-14 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C5A059]/20 transition-colors">
                  <ClipboardCheck className="w-7 h-7 text-[#C5A059]" />
                </div>
                <h3 className="font-cinzel text-[#1A202C]">Check-in</h3>
                <p className="text-xs text-[#4A5568] mt-1">Online</p>
              </Link>
            )}

            {/* Prenota - Always visible */}
            <Link 
              to="/booking" 
              className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow text-center group"
            >
              <div className="w-14 h-14 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C5A059]/20 transition-colors">
                <CalendarCheck className="w-7 h-7 text-[#C5A059]" />
              </div>
              <h3 className="font-cinzel text-[#1A202C]">Prenota</h3>
              <p className="text-xs text-[#4A5568] mt-1">Verifica disponibilità</p>
            </Link>

            {/* Only visible if authenticated */}
            {isAuthenticated ? (
              <>
                <Link 
                  to="/services" 
                  className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow text-center group"
                >
                  <div className="w-14 h-14 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C5A059]/20 transition-colors">
                    <Sparkles className="w-7 h-7 text-[#C5A059]" />
                  </div>
                  <h3 className="font-cinzel text-[#1A202C]">Servizi</h3>
                  <p className="text-xs text-[#4A5568] mt-1">Richiedi servizi</p>
                </Link>

                <Link 
                  to="/loyalty" 
                  className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow text-center group"
                >
                  <div className="w-14 h-14 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C5A059]/20 transition-colors">
                    <Gift className="w-7 h-7 text-[#C5A059]" />
                  </div>
                  <h3 className="font-cinzel text-[#1A202C]">Fedeltà</h3>
                  <p className="text-xs text-[#4A5568] mt-1">Punti e Premi</p>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/events" 
                  className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow text-center group"
                >
                  <div className="w-14 h-14 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C5A059]/20 transition-colors">
                    <Calendar className="w-7 h-7 text-[#C5A059]" />
                  </div>
                  <h3 className="font-cinzel text-[#1A202C]">Eventi</h3>
                  <p className="text-xs text-[#4A5568] mt-1">Scopri cosa fare</p>
                </Link>

                <Link 
                  to="/loyalty" 
                  className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow text-center group"
                >
                  <div className="w-14 h-14 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C5A059]/20 transition-colors">
                    <Gift className="w-7 h-7 text-[#C5A059]" />
                  </div>
                  <h3 className="font-cinzel text-[#1A202C]">Fedeltà</h3>
                  <p className="text-xs text-[#4A5568] mt-1">Il programma</p>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* House Rules Section - Solo link */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Link to="/house-rules" className="inline-block group">
              <div className="bg-[#F9F9F7] hover:bg-[#1A202C] transition-all duration-300 px-8 py-6 rounded-lg border border-[#C5A059]/30 hover:border-[#C5A059]">
                <div className="flex items-center justify-center gap-4">
                  <span className="text-3xl">📋</span>
                  <div className="text-left">
                    <p className="font-cormorant text-[#C5A059] tracking-[0.15em] uppercase text-xs mb-1">
                      Informazioni Utili
                    </p>
                    <h3 className="font-cinzel text-xl text-[#1A202C] group-hover:text-white transition-colors duration-300">
                      Regole della Casa
                    </h3>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#C5A059] ml-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Events Section - Always visible */}
      <section className="py-12 md:py-16 px-4 bg-[#1A202C]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-3">
              Non Perderti
            </p>
            <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-4">
              Eventi in Zona
            </h2>
            <div className="w-20 h-1 bg-[#C5A059] mx-auto" />
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {events.length > 0 ? events.map((event, index) => {
              // Format date range
              const formatEventDate = () => {
                const startDate = new Date(event.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                if (event.data_fine && event.data_fine !== event.data) {
                  const endDate = new Date(event.data_fine).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                  return `${startDate} - ${endDate}`;
                }
                return startDate;
              };
              
              // Get image URL with fallback
              const getEventImageUrl = (url) => {
                if (!url) return null;
                if (url.startsWith('http')) return url;
                if (url.startsWith('/api')) {
                  const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
                  return `${baseUrl}${url}`;
                }
                return url;
              };
              
              const imageUrl = getEventImageUrl(event.immagine_url);
              
              return (
                <Link 
                  to="/events"
                  key={event.id || index} 
                  className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden group hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="h-36 md:h-44 overflow-hidden relative">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={event.titolo}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1504644708628-9c1dd99f497f?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#C5A059]/30 to-[#1A202C] flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-[#C5A059]/50" />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {/* Date badge on image */}
                    <div className="absolute bottom-3 left-3 bg-[#C5A059] text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {formatEventDate()}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-cinzel text-base md:text-lg text-white mb-1 line-clamp-1">{event.titolo}</h3>
                    <p className="font-manrope text-xs md:text-sm text-gray-300 line-clamp-2 mb-2">{event.descrizione}</p>
                    <div className="flex items-center gap-1 text-[#C5A059] text-xs">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{event.luogo}</span>
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div className="col-span-3 text-center py-8">
                <p className="text-gray-400">Nessun evento in programma</p>
              </div>
            )}
          </div>

          <div className="text-center mt-6 md:mt-8">
            <Link to="/events">
              <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white rounded-xl">
                Tutti gli Eventi
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section with Bed Photo */}
      <section className="py-20 px-4 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-4">
                Le Nostre Casette
              </p>
              <h2 className="font-cinzel text-4xl text-[#1A202C] mb-6">
                Un Rifugio di Pace
              </h2>
              <p className="font-manrope text-[#4A5568] leading-relaxed mb-6">
                Le nostre due casette gemelle offrono il perfetto equilibrio tra tradizione e comfort. 
                Con soffitti in legno a vista, arredi curati nei minimi dettagli e un'atmosfera calda 
                e accogliente, ogni soggiorno diventa un'esperienza indimenticabile.
              </p>
              <ul className="space-y-3 mb-8">
                {['WiFi gratuito', 'Aria condizionata', 'Giardino privato', 'Parcheggio gratuito', 'Colazione inclusa'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-manrope text-[#4A5568]">
                    <div className="w-2 h-2 bg-[#C5A059] rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/about">
                <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white">
                  Scopri la Struttura
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <img 
                src="https://customer-assets.emergentagent.com/job_88383793-9b8e-4520-b738-24dee3c24d4e/artifacts/x28xxl91_678938161.jpg"
                alt="Camera La Maisonette Paestum"
                className="w-full h-[500px] object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Itineraries Section */}
      {itineraries.length > 0 && (
        <section className="py-16 px-4 bg-[#F9F9F7]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-3">
                Cosa Fare Oggi
              </p>
              <h2 className="font-cinzel text-3xl text-[#1A202C] mb-4">
                Itinerari Consigliati
              </h2>
              <p className="font-manrope text-[#4A5568]">
                In base al meteo di oggi, ti suggeriamo:
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itineraries.slice(0, 6).map((itinerary, index) => (
                <div 
                  key={itinerary.id || index}
                  className="bg-white p-6 rounded-lg shadow-soft hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{getCategoryIcon(itinerary.categoria)}</span>
                    <div className="flex-1">
                      <h4 className="font-cinzel text-lg text-[#1A202C] mb-2">{itinerary.nome}</h4>
                      <p className="font-manrope text-sm text-[#4A5568] mb-3 line-clamp-2">
                        {itinerary.descrizione}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-[#4A5568]">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{itinerary.luogo}</span>
                        </div>
                        {itinerary.durata && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{itinerary.durata}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Loyalty Program CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#C5A059] to-[#B08D45]">
        <div className="max-w-4xl mx-auto text-center text-white">
          <Gift className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h2 className="font-cinzel text-3xl mb-4">
            Programma Fedeltà
          </h2>
          <p className="font-manrope text-lg mb-6 opacity-90">
            Ogni €10 spesi = 1 punto. Accumula punti e riscatta premi esclusivi!
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              🍾 Spumante: 30 punti
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              🏛️ Ingressi Paestum: 50 punti
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              🏠 Soggiorno Gratis: 100 punti
            </div>
          </div>
          <Link to="/loyalty">
            <Button className="bg-white text-[#C5A059] hover:bg-gray-100 font-cinzel">
              Scopri Tutti i Premi
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-[#1A202C] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#C5A059] rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-4">
            Inizia la Tua Esperienza
          </p>
          <h2 className="font-cinzel text-4xl md:text-5xl text-white mb-6">
            Prenota il Tuo Soggiorno
          </h2>
          <p className="font-manrope text-gray-400 mb-10 max-w-2xl mx-auto">
            Vivi un'esperienza unica tra storia, natura e comfort. 
            Le nostre casette ti aspettano per un soggiorno indimenticabile.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking">
              <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel tracking-widest uppercase px-8 py-6">
                Verifica Disponibilità
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
