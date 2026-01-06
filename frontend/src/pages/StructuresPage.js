import { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { MapPin, Navigation, List, Map, Phone, Clock, X, Filter } from 'lucide-react';
import { API, BASE_URL } from '../lib/api';

// Google Maps API Key - hardcoded for native app compatibility
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyAz6yCJ1xH8DkzJ4N1bJfvKiX3k7CR4ohg';

// Coordinate di Paestum (centro mappa)
const PAESTUM_CENTER = { lat: 40.4219, lng: 15.0067 };

// Default structures as fallback
const defaultStructures = [
  { nome: 'Templi di Paestum', tipo: 'cultura', latitudine: 40.4219, longitudine: 15.0067, descrizione: 'Sito archeologico UNESCO' },
  { nome: 'Museo Archeologico Nazionale', tipo: 'cultura', latitudine: 40.4230, longitudine: 15.0050, descrizione: 'Museo con reperti greci' },
  { nome: 'Spiaggia di Paestum', tipo: 'natura', latitudine: 40.4180, longitudine: 14.9950, descrizione: 'Spiaggia bandiera blu' },
];

export default function StructuresPage() {
  const [structures, setStructures] = useState([]);
  const [filteredStructures, setFilteredStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'map' or 'list'
  const [mapError, setMapError] = useState(null);
  const [selectedTipo, setSelectedTipo] = useState('all');
  const [availableTipi, setAvailableTipi] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    fetchStructures();
  }, []);

  // Filter structures when tipo changes
  useEffect(() => {
    if (selectedTipo === 'all') {
      setFilteredStructures(structures);
    } else {
      setFilteredStructures(structures.filter(s => s.tipo === selectedTipo));
    }
  }, [selectedTipo, structures]);

  const fetchStructures = async () => {
    try {
      console.log('Fetching structures from:', `${API}/structures`);
      const response = await fetch(`${API}/structures`);
      if (response.ok) {
        const data = await response.json();
        console.log('Structures received:', data.length);
        setStructures(data);
        setFilteredStructures(data);
        
        // Extract unique tipi
        const tipi = [...new Set(data.map(s => s.tipo).filter(Boolean))];
        setAvailableTipi(tipi);
      } else {
        console.error('Failed to fetch structures:', response.status);
      }
    } catch (error) {
      console.error('Error fetching structures:', error);
    } finally {
      setLoading(false);
    }
  };

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || mapInstanceRef.current) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: PAESTUM_CENTER,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();

      // Add marker for La Maisonette
      new window.google.maps.Marker({
        position: PAESTUM_CENTER,
        map: map,
        title: 'La Maisonette di Paestum',
        icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      });

      addMarkers(map);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Errore nel caricamento della mappa');
    }
  }, [structures]);

  const addMarkers = useCallback((map) => {
    if (!map || !window.google?.maps) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Use filteredStructures if available, otherwise use structures, fallback to defaultStructures
    let displayStructures = filteredStructures;
    if (!displayStructures || displayStructures.length === 0) {
      displayStructures = structures.length > 0 ? structures : defaultStructures;
    }

    console.log('Adding markers for', displayStructures.length, 'structures');

    displayStructures.forEach((structure) => {
      const lat = structure.latitudine ?? structure.lat;
      const lng = structure.longitudine ?? structure.lng;
      
      // Check if coordinates are valid numbers
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (isNaN(latNum) || isNaN(lngNum) || latNum === 0 || lngNum === 0) {
        console.log('Skipping structure without valid coords:', structure.nome, lat, lng);
        return;
      }
      
      console.log('Adding marker for:', structure.nome, latNum, lngNum);

      const marker = new window.google.maps.Marker({
        position: { lat: latNum, lng: lngNum },
        map: map,
        title: structure.nome,
        icon: getCategoryIcon(structure.categoria || structure.tipo)
      });

      marker.addListener('click', () => {
        const content = `
          <div style="max-width: 280px; padding: 10px; font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1A202C; font-weight: 600;">${structure.nome}</h3>
            ${structure.descrizione ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #4A5568;">${structure.descrizione}</p>` : ''}
            ${structure.indirizzo ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #718096;">📍 ${structure.indirizzo}</p>` : ''}
            ${structure.distanza ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #C5A059;">📏 ${structure.distanza}</p>` : ''}
            ${structure.orari ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #718096;">🕐 ${structure.orari}</p>` : ''}
            ${structure.telefono ? `
              <a href="tel:${structure.telefono}" style="display: inline-flex; align-items: center; gap: 6px; background: #C5A059; color: white; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; margin-top: 8px;">
                📞 Chiama: ${structure.telefono}
              </a>
            ` : ''}
            <div style="margin-top: 10px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" 
                 target="_blank" rel="noopener" 
                 style="display: inline-block; background: #1A202C; color: white; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 13px;">
                🧭 Indicazioni
              </a>
            </div>
          </div>
        `;
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }
        setSelectedStructure(structure);
      });

      markersRef.current.push(marker);
    });
  }, [filteredStructures, structures]);

  // Load Google Maps script
  useEffect(() => {
    if (viewMode !== 'map') return;
    
    const loadScript = () => {
      if (window.google?.maps) {
        initMap();
        return;
      }

      // Check if script already loading
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkGoogle = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkGoogle);
            initMap();
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(initMap, 100);
      };
      script.onerror = () => {
        setMapError('Errore nel caricamento di Google Maps');
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, [viewMode, initMap]);

  // Update markers when structures change
  useEffect(() => {
    if (mapInstanceRef.current && (filteredStructures.length > 0 || structures.length > 0)) {
      console.log('Updating markers, structures:', structures.length, 'filtered:', filteredStructures.length);
      addMarkers(mapInstanceRef.current);
    }
  }, [filteredStructures, structures, addMarkers]);

  const getCategoryIcon = (categoria) => {
    switch (categoria) {
      case 'cultura': return 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
      case 'natura': return 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
      case 'gastronomia': return 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
      case 'shopping': return 'https://maps.google.com/mapfiles/ms/icons/pink-dot.png';
      case 'servizi': return 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      default: return 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }
  };

  const getCategoryEmoji = (categoria) => {
    switch (categoria) {
      case 'cultura': return '🏛️';
      case 'natura': return '🏖️';
      case 'gastronomia': return '🍽️';
      case 'shopping': return '🛍️';
      case 'servizi': return '🏥';
      default: return '📍';
    }
  };

  const getCategoryLabel = (categoria) => {
    switch (categoria) {
      case 'cultura': return 'Cultura';
      case 'natura': return 'Natura';
      case 'gastronomia': return 'Gastronomia';
      case 'shopping': return 'Shopping';
      case 'servizi': return 'Servizi';
      default: return 'Altro';
    }
  };

  const [showMapChoice, setShowMapChoice] = useState(false);

  const openAppleMaps = (structure) => {
    const lat = structure.lat || structure.latitudine;
    const lng = structure.lng || structure.longitudine;
    
    let url;
    if (lat && lng) {
      url = `maps://maps.apple.com/?daddr=${lat},${lng}`;
    } else {
      const query = structure.indirizzo || structure.nome || 'Paestum';
      url = `maps://maps.apple.com/?daddr=${encodeURIComponent(query)}`;
    }
    window.location.href = url;
  };

  const openGoogleMaps = (structure) => {
    const lat = structure.lat || structure.latitudine;
    const lng = structure.lng || structure.longitudine;
    
    let url;
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      const query = structure.indirizzo || structure.nome || 'Paestum';
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleGetDirections = (structure) => {
    setSelectedStructure(structure);
    setShowMapChoice(true);
  };

  const callPhone = (telefono) => {
    window.location.href = `tel:${telefono}`;
  };

  const focusOnMarker = (structure) => {
    const lat = structure.lat || structure.latitudine;
    const lng = structure.lng || structure.longitudine;
    
    if (mapInstanceRef.current && lat && lng) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(16);
      setSelectedStructure(structure);
      
      // Find and click the marker
      const marker = markersRef.current.find(m => m.getTitle() === structure.nome);
      if (marker) {
        window.google.maps.event.trigger(marker, 'click');
      }
    }
  };

  // Default structures if none from backend
  const defaultStructures = [
    { id: '1', nome: 'Parco Archeologico di Paestum', categoria: 'cultura', descrizione: 'I magnifici templi dorici patrimonio UNESCO', indirizzo: 'Via Magna Grecia, Capaccio Paestum', latitudine: 40.4203, longitudine: 15.0053, distanza: '5 min a piedi', orari: '8:30-19:30', telefono: '0828 811023' },
    { id: '2', nome: 'Museo Archeologico Nazionale', categoria: 'cultura', descrizione: 'La famosa Tomba del Tuffatore e reperti della Magna Grecia', indirizzo: 'Via Magna Grecia, Capaccio Paestum', latitudine: 40.4208, longitudine: 15.0058, distanza: '5 min a piedi', orari: '8:30-19:30', telefono: '0828 811023' },
    { id: '3', nome: 'Spiaggia di Paestum', categoria: 'natura', descrizione: 'Sabbia dorata e mare cristallino', indirizzo: 'Lungomare Paestum', latitudine: 40.4150, longitudine: 14.9890, distanza: '10 min in auto' },
    { id: '4', nome: 'Caseificio Vannulo', categoria: 'gastronomia', descrizione: 'La vera mozzarella di bufala DOP', indirizzo: 'Via Galileo Galilei, Capaccio Paestum', latitudine: 40.4320, longitudine: 15.0150, distanza: '10 min in auto', telefono: '0828 724765' },
  ];

  const displayStructures = filteredStructures.length > 0 ? filteredStructures : (structures.length > 0 ? [] : defaultStructures);

  return (
    <Layout>
      <div className="min-h-screen bg-[#F9F9F7]">
        {/* Header */}
        <div className="bg-[#1A202C] text-white py-8 md:py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
              Esplora
            </p>
            <h1 className="font-cinzel text-3xl md:text-5xl mb-3">
              Il Territorio
            </h1>
            <p className="font-manrope text-gray-300 text-sm md:text-base max-w-2xl">
              Scopri le meraviglie di Paestum e dintorni
            </p>
          </div>
        </div>

        {/* View Toggle & Filters */}
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-[#E2E8F0]">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                  viewMode === 'map' 
                    ? 'bg-[#C5A059] text-white shadow-md' 
                    : 'text-[#4A5568] hover:bg-gray-100'
                }`}
              >
                <Map className="w-4 h-4" />
                Mappa
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-[#C5A059] text-white shadow-md' 
                    : 'text-[#4A5568] hover:bg-gray-100'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>

            {/* Filter by Tipo */}
            {availableTipi.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#4A5568]" />
                <select
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value)}
                  className="border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm bg-white shadow-sm"
                >
                  <option value="all">Tutte le categorie</option>
                  {availableTipi.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          {viewMode === 'map' ? (
            /* Map View */
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Map */}
              <div className="lg:w-2/3">
                {mapError ? (
                  <div className="w-full h-[500px] rounded-lg shadow-lg border border-[#E2E8F0] bg-gray-100 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-[#4A5568] mb-4">{mapError}</p>
                      <Button onClick={() => setViewMode('list')} variant="outline">
                        Vai alla Lista
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    ref={mapRef}
                    className="w-full h-[500px] lg:h-[600px] rounded-lg shadow-lg border border-[#E2E8F0]"
                    style={{ background: '#e5e5e5' }}
                  />
                )}
              </div>

              {/* Sidebar - Structure List */}
              <div className="lg:w-1/3">
                <div className="bg-white rounded-lg shadow-lg border border-[#E2E8F0] overflow-hidden">
                  <div className="p-4 bg-[#F9F9F7] border-b border-[#E2E8F0]">
                    <h3 className="font-cinzel text-lg text-[#1A202C]">
                      Punti di Interesse ({displayStructures.filter(s => s.lat || s.latitudine).length})
                    </h3>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    {displayStructures.filter(s => (s.lat || s.latitudine) && (s.lng || s.longitudine)).map((structure) => (
                      <div
                        key={structure.id}
                        onClick={() => focusOnMarker(structure)}
                        className={`p-4 border-b border-[#E2E8F0] cursor-pointer transition-colors hover:bg-[#F9F9F7] ${
                          selectedStructure?.id === structure.id ? 'bg-[#C5A059]/10 border-l-4 border-l-[#C5A059]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getCategoryEmoji(structure.categoria || structure.tipo)}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-cinzel text-[#1A202C] text-sm">{structure.nome}</h4>
                            <p className="text-xs text-[#C5A059] uppercase tracking-wider">
                              {getCategoryLabel(structure.categoria || structure.tipo)}
                            </p>
                            {structure.orari && (
                              <p className="text-xs text-[#718096] mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {structure.orari}
                              </p>
                            )}
                            {structure.telefono && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); callPhone(structure.telefono); }}
                                className="text-xs text-[#C5A059] mt-1 flex items-center gap-1 hover:underline"
                              >
                                <Phone className="w-3 h-3" /> {structure.telefono}
                              </button>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleGetDirections(structure); }}
                            className="text-[#C5A059] hover:bg-[#C5A059]/10"
                          >
                            <Navigation className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* List View */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
                </div>
              ) : (
                displayStructures.map((structure) => (
                  <Card key={structure.id} className="border-[#E2E8F0] hover:shadow-lg transition-shadow">
                    {structure.immagine_url && (
                      <div className="h-40 overflow-hidden">
                        <img 
                          src={structure.immagine_url} 
                          alt={structure.nome}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-3xl">{getCategoryEmoji(structure.categoria || structure.tipo)}</span>
                        <div>
                          <span className="text-xs text-[#C5A059] uppercase tracking-wider font-medium">
                            {getCategoryLabel(structure.categoria || structure.tipo)}
                          </span>
                          <h3 className="font-cinzel text-lg text-[#1A202C]">{structure.nome}</h3>
                        </div>
                      </div>
                      
                      {structure.descrizione && (
                        <p className="font-manrope text-sm text-[#4A5568] mb-3 line-clamp-2">
                          {structure.descrizione}
                        </p>
                      )}

                      {structure.indirizzo && (
                        <p className="text-xs text-[#718096] mb-2 flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {structure.indirizzo}
                        </p>
                      )}

                      {structure.orari && (
                        <p className="text-xs text-[#718096] mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {structure.orari}
                        </p>
                      )}

                      {structure.distanza && (
                        <p className="text-xs text-[#C5A059] mb-4">
                          📍 {structure.distanza} dalla struttura
                        </p>
                      )}

                      <div className="flex gap-2">
                        {structure.telefono && (
                          <Button
                            size="sm"
                            onClick={() => callPhone(structure.telefono)}
                            className="flex-1 bg-[#C5A059] hover:bg-[#B08D45] text-white"
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Chiama
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGetDirections(structure)}
                          className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                        >
                          <Navigation className="w-4 h-4" />
                        </Button>
                        {(structure.lat || structure.latitudine) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setViewMode('map'); setTimeout(() => focusOnMarker(structure), 500); }}
                            className="border-[#1A202C] text-[#1A202C] hover:bg-[#1A202C] hover:text-white"
                          >
                            <Map className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Map Choice Dialog */}
        {showMapChoice && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center p-4" onClick={() => setShowMapChoice(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 mb-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-cinzel text-xl text-center mb-6">Scegli l'App Mappe</h3>
              <div className="space-y-3">
                <button
                  onClick={() => { openAppleMaps(selectedStructure); setShowMapChoice(false); }}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#1A202C]">Apple Maps</p>
                    <p className="text-sm text-gray-500">Mappe di Apple</p>
                  </div>
                </button>
                <button
                  onClick={() => { openGoogleMaps(selectedStructure); setShowMapChoice(false); }}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-red-500 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#1A202C]">Google Maps</p>
                    <p className="text-sm text-gray-500">Mappe di Google</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowMapChoice(false)}
                className="w-full mt-4 py-3 text-gray-500 font-medium"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
