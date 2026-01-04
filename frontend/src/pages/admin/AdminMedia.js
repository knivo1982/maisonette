import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import axios from 'axios';
import { toast } from 'sonner';
import { Upload, Trash2, Copy, Image, Check, X } from 'lucide-react';

import { API, BASE_URL } from '../../lib/api';

export default function AdminMedia() {
  const { token } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const response = await axios.get(`${API}/admin/media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedia(response.data);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nome', file.name);

      try {
        await axios.post(`${API}/admin/media/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } catch (error) {
        toast.error(`Errore upload ${file.name}`);
      }
    }

    toast.success('Upload completato!');
    setUploading(false);
    fetchMedia();
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa immagine?')) return;
    
    try {
      await axios.delete(`${API}/admin/media/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Immagine eliminata');
      fetchMedia();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  const copyUrl = (url) => {
    // Use /api/uploads path for correct routing
    const apiUrl = url.replace('/uploads/', '/api/uploads/');
    const fullUrl = `${BASE_URL}${apiUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(url);
    toast.success('URL copiato!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getImageUrl = (url) => {
    // Handle both old (/uploads/) and new (/api/uploads/) formats
    if (!url) return '';
    if (url.startsWith('/api/uploads/')) {
      return `${BASE_URL}${url}`;
    }
    // Convert old format to new format
    const apiUrl = url.replace('/uploads/', '/api/uploads/');
    return `${BASE_URL}${apiUrl}`;
  };

  return (
    <AdminLayout title="Media Library">
      <div className="space-y-6">
        {/* Upload Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-cinzel text-lg text-[#1A202C]">Carica Immagini</h2>
                <p className="text-sm text-gray-500">Carica immagini da usare negli eventi, strutture, ecc.</p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button 
                  className="bg-[#C5A059] hover:bg-[#B08D45]"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Caricamento...' : 'Carica Immagini'}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Media Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : media.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nessuna immagine caricata</p>
              <p className="text-sm text-gray-400 mt-1">Carica la prima immagine per iniziare</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item) => (
              <Card key={item.id} className="overflow-hidden group">
                <div className="aspect-square relative">
                  <img
                    src={getImageUrl(item.url)}
                    alt={item.nome}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyUrl(item.url)}
                      className="bg-white text-gray-800 hover:bg-gray-100"
                    >
                      {copiedId === item.url ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-600 truncate" title={item.nome}>
                    {item.nome}
                  </p>
                  <button
                    onClick={() => copyUrl(item.url)}
                    className="text-xs text-[#C5A059] hover:underline mt-1 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copia URL
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
