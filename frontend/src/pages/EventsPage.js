import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import axios from 'axios';
import { Calendar, MapPin, Clock, Search, Tag, Navigation, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';

import { API, BASE_URL } from '../lib/api';

// Helper to get full image URL
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, search, categoria]);

  const fetchEvents = async () => {
    try {
      setError(null);
      console.log('Fetching events from:', `${API}/events`);
      // Fetch only current and future events (default behavior)
      const response = await axios.get(`${API}/events`);
      console.log('Events response:', response.data);
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Errore nel caricamento degli eventi');
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];
    
    if (search) {
      filtered = filtered.filter(e => 
        e.titolo.toLowerCase().includes(search.toLowerCase()) ||
        e.descrizione.toLowerCase().includes(search.toLowerCase()) ||
        e.luogo.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (categoria && categoria !== 'all') {
      filtered = filtered.filter(e => e.categoria === categoria);
    }
    
    setFilteredEvents(filtered);
  };

  const [showMapChoice, setShowMapChoice] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapAction, setMapAction] = useState('view'); // 'view' or 'directions'

  const openAppleMaps = (event, action = 'view') => {
    const query = event.indirizzo || event.luogo || 'Paestum';
    let url;
    if (action === 'directions') {
      url = `maps://maps.apple.com/?daddr=${encodeURIComponent(query)}`;
    } else {
      url = `maps://maps.apple.com/?q=${encodeURIComponent(query)}`;
    }
    window.location.href = url;
  };

  const openGoogleMaps = (event, action = 'view') => {
    const query = event.indirizzo || event.luogo || 'Paestum';
    let url;
    if (action === 'directions') {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMapAction = (event, action) => {
    setSelectedEvent(event);
    setMapAction(action);
    setShowMapChoice(true);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long'
    });
  };

  const formatDateRange = (event) => {
    const startDate = formatDate(event.data);
    
    // Se c'è data_fine e è diversa dalla data di inizio
    if (event.data_fine && event.data_fine !== event.data) {
      const endDateShort = formatDateShort(event.data_fine);
      const startDateShort = formatDateShort(event.data);
      
      // Controlla se sono nello stesso anno
      const startYear = new Date(event.data).getFullYear();
      const endYear = new Date(event.data_fine).getFullYear();
      
      if (startYear === endYear) {
        return `Dal ${startDateShort} al ${endDateShort} ${startYear}`;
      } else {
        return `Dal ${formatDate(event.data)} al ${formatDate(event.data_fine)}`;
      }
    }
    
    return startDate;
  };

  const categories = [...new Set(events.map(e => e.categoria).filter(Boolean))];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
            Scopri
          </p>
          <h1 className="font-cinzel text-3xl md:text-5xl text-[#1A202C] mb-3">
            Eventi sul Territorio
          </h1>
          <p className="font-manrope text-[#4A5568] text-sm md:text-base max-w-2xl">
            Scopri gli eventi culturali, gastronomici e artistici nella zona di Paestum
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 md:mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]" />
            <Input
              type="text"
              placeholder="Cerca eventi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-[#E2E8F0] focus:border-[#C5A059]"
              data-testid="search-events"
            />
          </div>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-full md:w-[200px] border-[#E2E8F0]" data-testid="filter-categoria">
              <Tag className="w-4 h-4 mr-2 text-[#C5A059]" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="font-cinzel text-xl text-red-600 mb-2">{error}</p>
            <Button onClick={fetchEvents} className="mt-4 bg-[#C5A059]">
              Riprova
            </Button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-cinzel text-xl text-[#1A202C] mb-2">Nessun evento trovato</p>
            <p className="font-manrope text-[#4A5568]">
              {search || categoria !== 'all' ? 'Prova a modificare i filtri di ricerca' : 'Non ci sono eventi al momento'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:gap-8">
            {filteredEvents.map((event, index) => (
              <Card 
                key={event.id}
                className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-2xl animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`event-card-${event.id}`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Event Image */}
                  <div className="md:w-2/5 h-56 md:h-auto relative overflow-hidden">
                    {event.immagine_url ? (
                      <img 
                        src={getImageUrl(event.immagine_url)}
                        alt={event.titolo}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1504644708628-9c1dd99f497f?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1A202C] to-[#2D3748]">
                        <Calendar className="w-16 h-16 text-[#C5A059]/60" />
                      </div>
                    )}
                    {/* Category Badge on Image */}
                    {event.categoria && (
                      <span className="absolute top-4 left-4 bg-[#C5A059] text-white px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-md">
                        {event.categoria}
                      </span>
                    )}
                  </div>
                  
                  {/* Event Details */}
                  <CardContent className="flex-1 p-5 md:p-8 flex flex-col justify-between">
                    <div>
                      <h2 className="font-cinzel text-xl md:text-2xl text-[#1A202C] mb-3 leading-tight">
                        {event.titolo}
                      </h2>
                      
                      <p className="font-manrope text-[#4A5568] mb-5 leading-relaxed text-sm md:text-base line-clamp-3">
                        {event.descrizione}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex flex-wrap gap-4 text-sm mb-5">
                        <div className="flex items-center text-[#1A202C] bg-gray-50 px-3 py-2 rounded-lg">
                          <Calendar className="w-4 h-4 mr-2 text-[#C5A059]" />
                          <span className="font-medium">
                            {formatDateRange(event)}
                          </span>
                        </div>
                        {event.ora && (
                          <div className="flex items-center text-[#1A202C] bg-gray-50 px-3 py-2 rounded-lg">
                            <Clock className="w-4 h-4 mr-2 text-[#C5A059]" />
                            <span className="font-medium">
                              {event.ora}
                              {event.ora_fine && ` - ${event.ora_fine}`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center text-[#4A5568] mb-5">
                        <MapPin className="w-4 h-4 mr-2 text-[#C5A059] flex-shrink-0" />
                        <span className="font-manrope text-sm">{event.luogo}</span>
                      </div>
                      
                      {/* Navigate Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => openGoogleMaps(event)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white rounded-xl"
                          data-testid={`view-map-${event.id}`}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Mappa
                        </Button>
                        <Button
                          onClick={() => getDirections(event)}
                          size="sm"
                          className="flex-1 bg-[#C5A059] hover:bg-[#B08D45] text-white rounded-xl"
                          data-testid={`navigate-event-${event.id}`}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Vai
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
