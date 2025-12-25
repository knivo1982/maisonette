import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, MapPin, Star, Import, Check, Loader2, Navigation } from 'lucide-react';

import { API } from '../../lib/api';

const PLACE_CATEGORIES = [
  { value: 'restaurant', label: 'Ristoranti', icon: '🍽️' },
  { value: 'pharmacy', label: 'Farmacie', icon: '💊' },
  { value: 'atm', label: 'Bancomat', icon: '🏧' },
  { value: 'bank', label: 'Banche', icon: '🏦' },
  { value: 'gas_station', label: 'Benzinai', icon: '⛽' },
  { value: 'supermarket', label: 'Supermercati', icon: '🛒' },
  { value: 'bakery', label: 'Panifici', icon: '🥖' },
  { value: 'doctor', label: 'Medici', icon: '👨‍⚕️' },
  { value: 'hospital', label: 'Ospedali', icon: '🏥' },
  { value: 'bar', label: 'Bar/Caffè', icon: '☕' },
  { value: 'museum', label: 'Musei', icon: '🏛️' },
  { value: 'tourist_attraction', label: 'Attrazioni', icon: '📸' },
];

export default function AdminPlaces() {
  const { token } = useAuth();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('restaurant');
  const [radius, setRadius] = useState(5000);
  const [selectedPlaces, setSelectedPlaces] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const searchPlaces = async (category) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/admin/places/search?place_type=${category}&radius=${radius}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlaces(response.data);
      setSelectedPlaces(new Set());
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella ricerca');
    } finally {
      setLoading(false);
    }
  };

  const scanAll = async () => {
    setScanning(true);
    try {
      const response = await axios.post(
        `${API}/admin/places/scan-all?radius=${radius}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlaces(response.data.places);
      setSelectedPlaces(new Set());
      toast.success(`Trovati ${response.data.total} luoghi!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nello scan');
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = (placeId) => {
    const newSelected = new Set(selectedPlaces);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    setSelectedPlaces(newSelected);
  };

  const selectAll = () => {
    if (selectedPlaces.size === places.length) {
      setSelectedPlaces(new Set());
    } else {
      setSelectedPlaces(new Set(places.map(p => p.place_id)));
    }
  };

  const importSelected = async () => {
    if (selectedPlaces.size === 0) {
      toast.error('Seleziona almeno un luogo');
      return;
    }

    setImporting(true);
    try {
      const placesToImport = places.filter(p => selectedPlaces.has(p.place_id));
      const response = await axios.post(
        `${API}/admin/places/import`,
        placesToImport,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      
      // Remove imported from list
      setPlaces(places.filter(p => !selectedPlaces.has(p.place_id)));
      setSelectedPlaces(new Set());
    } catch (error) {
      toast.error('Errore nell\'importazione');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout title="Importa Luoghi da Google">
      <div className="space-y-6">
        {/* Search Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cinzel">Cerca Luoghi nelle Vicinanze</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label>Categoria</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1"
                >
                  {PLACE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <Label>Raggio (m)</Label>
                <Input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  min={1000}
                  max={50000}
                  step={1000}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => searchPlaces(selectedCategory)}
                  disabled={loading}
                  className="bg-[#C5A059] hover:bg-[#B08D45]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Cerca
                </Button>
                <Button
                  onClick={scanAll}
                  disabled={scanning}
                  variant="outline"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
                  Scan Tutto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {places.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-cinzel">
                  Risultati ({places.length} luoghi)
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedPlaces.size === places.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={importSelected}
                    disabled={selectedPlaces.size === 0 || importing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Import className="w-4 h-4 mr-2" />}
                    Importa ({selectedPlaces.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {places.map((place) => (
                  <div
                    key={place.place_id}
                    onClick={() => toggleSelect(place.place_id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlaces.has(place.place_id)
                        ? 'border-[#C5A059] bg-[#C5A059]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{place.icon}</span>
                          <h3 className="font-medium text-[#1A202C]">{place.nome}</h3>
                          {selectedPlaces.has(place.place_id) && (
                            <Check className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {place.distanza_display}
                          </span>
                          {place.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              {place.rating} ({place.total_ratings})
                            </span>
                          )}
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {place.tipo}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{place.indirizzo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {places.length === 0 && !loading && !scanning && (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Cerca luoghi nelle vicinanze di Paestum</p>
              <p className="text-sm text-gray-400 mt-1">
                Seleziona una categoria e clicca "Cerca" oppure "Scan Tutto" per trovare tutti i tipi di luoghi
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
