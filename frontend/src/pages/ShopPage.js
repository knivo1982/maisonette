import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Wine, 
  ShoppingBag, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Euro,
  Trash2,
  Check,
  Package
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryLabels = {
  vino: { label: 'Vini', color: 'bg-purple-100 text-purple-700' },
  formaggi: { label: 'Formaggi', color: 'bg-amber-100 text-amber-700' },
  olio: { label: 'Olio', color: 'bg-green-100 text-green-700' },
  liquori: { label: 'Liquori', color: 'bg-yellow-100 text-yellow-700' },
  specialita: { label: 'Specialità', color: 'bg-red-100 text-red-700' },
  souvenir: { label: 'Souvenir', color: 'bg-blue-100 text-blue-700' }
};

export default function ShopPage() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasActiveCheckin, setHasActiveCheckin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (token) {
      checkActiveCheckin();
      fetchProducts();
    }
  }, [token]);

  const checkActiveCheckin = async () => {
    try {
      const response = await axios.get(`${API}/checkin/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasActiveCheckin(response.data.has_active_checkin);
    } catch (error) {
      console.error('Error checking checkin:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantita: item.quantita + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantita: 1 }]);
    }
    toast.success(`${product.nome} aggiunto al carrello`);
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantita + delta;
        return newQty > 0 ? { ...item, quantita: newQty } : item;
      }
      return item;
    }).filter(item => item.quantita > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.prezzo * item.quantita), 0);

  const submitOrder = async () => {
    if (!hasActiveCheckin) {
      toast.error('Devi avere un check-in attivo per ordinare');
      return;
    }

    if (cart.length === 0) {
      toast.error('Il carrello è vuoto');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/orders`, {
        items: cart.map(item => ({
          product_id: item.product.id,
          quantita: item.quantita
        })),
        note: orderNote || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Ordine inviato! L\'importo sarà aggiunto al tuo conto.');
      setCart([]);
      setOrderNote('');
      setCartOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'invio dell\'ordine');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.categoria === activeCategory);

  const categories = ['all', ...new Set(products.map(p => p.categoria))];

  if (authLoading) {
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
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
            Prodotti Locali
          </p>
          <h1 className="font-cinzel text-4xl md:text-5xl text-[#1A202C] mb-4">
            La Nostra Vetrina
          </h1>
          <p className="font-manrope text-[#4A5568] max-w-2xl mx-auto">
            Vini pregiati, prodotti tipici e souvenir artigianali. 
            Ordina e metti sul conto del tuo soggiorno!
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-sm font-manrope text-sm transition-all ${
                activeCategory === cat
                  ? 'bg-[#C5A059] text-white shadow-md'
                  : 'bg-white border border-[#E2E8F0] text-[#4A5568] hover:border-[#C5A059]'
              }`}
            >
              {cat === 'all' ? 'Tutti' : categoryLabels[cat]?.label || cat}
            </button>
          ))}
        </div>

        {/* Cart Button */}
        {cart.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setCartOpen(true)}
              className="bg-[#C5A059] hover:bg-[#B08D45] text-white shadow-lg px-6 py-6 rounded-full"
              data-testid="open-cart-btn"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {cart.length} - €{cartTotal.toFixed(2)}
            </Button>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-[#E2E8F0] mx-auto mb-4" />
            <p className="font-cinzel text-xl text-[#1A202C] mb-2">Nessun prodotto disponibile</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => {
              const inCart = cart.find(item => item.product.id === product.id);
              
              return (
                <Card 
                  key={product.id}
                  className="group overflow-hidden border-[#E2E8F0] hover:border-[#C5A059] transition-all duration-300 card-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  data-testid={`product-card-${product.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className={`${categoryLabels[product.categoria]?.color || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {categoryLabels[product.categoria]?.label || product.categoria}
                      </Badge>
                      {inCart && (
                        <Badge className="bg-[#C5A059] text-white border-0">
                          {inCart.quantita} nel carrello
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-cinzel text-lg text-[#1A202C] mb-2 group-hover:text-[#C5A059] transition-colors">
                      {product.nome}
                    </h3>
                    
                    {product.descrizione && (
                      <p className="font-manrope text-sm text-[#4A5568] mb-4 leading-relaxed">
                        {product.descrizione}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#E2E8F0]">
                      <span className="font-cinzel text-xl text-[#C5A059]">
                        €{product.prezzo.toFixed(2)}
                      </span>
                      <Button
                        onClick={() => addToCart(product)}
                        size="sm"
                        className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                        data-testid={`add-to-cart-${product.id}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-12 bg-[#F9F9F7] border border-[#E2E8F0] rounded-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#C5A059]/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-[#C5A059]" />
          </div>
          <div>
            <h3 className="font-cinzel text-lg text-[#1A202C] mb-1">Come Funziona</h3>
            <p className="font-manrope text-sm text-[#4A5568]">
              Ordina i prodotti e l'importo verrà aggiunto al conto del tuo soggiorno. 
              Potrai ritirare tutto al check-out o richiedere la consegna in camera.
            </p>
          </div>
        </div>
      </div>

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#C5A059]" />
              Il Tuo Carrello
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
              <p className="font-manrope text-[#4A5568]">Il carrello è vuoto</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-[#F9F9F7] rounded-sm">
                    <div className="flex-1">
                      <p className="font-manrope font-medium text-[#1A202C]">{item.product.nome}</p>
                      <p className="font-manrope text-sm text-[#4A5568]">
                        €{item.product.prezzo.toFixed(2)} × {item.quantita}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantita}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label className="font-manrope">Note per l'ordine (opzionale)</Label>
                <Textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Es: Consegna in camera 102..."
                  className="min-h-[60px]"
                />
              </div>

              {/* Total */}
              <div className="border-t border-[#E2E8F0] pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-manrope text-[#4A5568]">Totale</span>
                  <span className="font-cinzel text-2xl text-[#C5A059]">
                    €{cartTotal.toFixed(2)}
                  </span>
                </div>
                
                {!hasActiveCheckin && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-sm mb-4">
                    ⚠️ Devi avere un check-in attivo per ordinare
                  </p>
                )}

                <Button
                  onClick={submitOrder}
                  disabled={submitting || !hasActiveCheckin}
                  className="w-full bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel tracking-widest uppercase py-6"
                  data-testid="submit-order-btn"
                >
                  {submitting ? 'Invio in corso...' : 'Ordina e Metti sul Conto'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
