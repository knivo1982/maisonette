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

  const openGoogleMaps = (event) => {
    const query = event.indirizzo || event.luogo || 'Paestum';
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getDirections = (event) => {
    const query = event.indirizzo || event.luogo || 'Paestum';
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
            Scopri
          </p>
          <h1 className="font-cinzel text-4xl md:text-5xl text-[#1A202C] mb-4">
            Eventi sul Territorio
          </h1>
          <p className="font-manrope text-[#4A5568] max-w-2xl">
            Scopri gli eventi culturali, gastronomici e artistici nella zona di Paestum e provincia di Salerno
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
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
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-cinzel text-xl text-[#1A202C] mb-2">Nessun evento trovato</p>
            <p className="font-manrope text-[#4A5568]">
              {search || categoria !== 'all' ? 'Prova a modificare i filtri di ricerca' : 'Non ci sono eventi al momento'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredEvents.map((event, index) => (
              <Card 
                key={event.id}
                className="overflow-hidden event-card border-none shadow-sm animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`event-card-${event.id}`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Event Image */}
                  <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden bg-gray-100">
                    {event.immagine_url ? (
                      <img 
                        src={getImageUrl(event.immagine_url)}
                        alt={event.titolo}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1504644708628-9c1dd99f497f?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#C5A059]/20 to-[#C5A059]/5">
                        <Calendar className="w-12 h-12 text-[#C5A059]/40" />
                      </div>
                    )}
                  </div>
                  
                  {/* Event Details */}
                  <CardContent className="flex-1 p-6 md:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        {event.categoria && (
                          <span className="inline-block bg-[#C5A059]/10 text-[#C5A059] px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider mb-3">
                            {event.categoria}
                          </span>
                        )}
                        <h2 className="font-cinzel text-2xl text-[#1A202C] mb-2">
                          {event.titolo}
                        </h2>
                      </div>
                    </div>
                    
                    <p className="font-manrope text-[#4A5568] mb-6 leading-relaxed">
                      {event.descrizione}
                    </p>
                    
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center text-[#4A5568]">
                        <Calendar className="w-4 h-4 mr-2 text-[#C5A059]" />
                        <span className="font-manrope">
                          {formatDateRange(event)}
                        </span>
                      </div>
                      {event.ora && (
                        <div className="flex items-center text-[#4A5568]">
                          <Clock className="w-4 h-4 mr-2 text-[#C5A059]" />
                          <span className="font-manrope">
                            {event.ora}
                            {event.ora_fine && ` - ${event.ora_fine}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center text-[#4A5568]">
                        <MapPin className="w-4 h-4 mr-2 text-[#C5A059]" />
                        <span className="font-manrope">{event.luogo}</span>
                      </div>
                    </div>
                    
                    {/* Navigate Buttons */}
                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={() => openGoogleMaps(event)}
                        variant="outline"
                        className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                        data-testid={`view-map-${event.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Apri Mappa
                      </Button>
                      <Button
                        onClick={() => getDirections(event)}
                        className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                        data-testid={`navigate-event-${event.id}`}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Indicazioni
                      </Button>
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
