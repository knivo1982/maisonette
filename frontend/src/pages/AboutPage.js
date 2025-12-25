import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Wifi, Car, Coffee, Sun, Waves, TreePine, Wind, Tv, MapPin, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ICON_MAP = {
  wifi: Wifi,
  car: Car,
  coffee: Coffee,
  sun: Sun,
  waves: Waves,
  tree: TreePine,
  wind: Wind,
  tv: Tv
};

export default function AboutPage() {
  const [gallery, setGallery] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [galleryRes, amenitiesRes] = await Promise.all([
        fetch(`${API}/api/gallery`),
        fetch(`${API}/api/amenities`)
      ]);
      
      if (galleryRes.ok) {
        const galleryData = await galleryRes.json();
        setGallery(galleryData);
      }
      
      if (amenitiesRes.ok) {
        const amenitiesData = await amenitiesRes.json();
        setAmenities(amenitiesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % gallery.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const getIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || Sun;
    return <IconComponent className="w-8 h-8" />;
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${gallery[0]?.url || "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80"}')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-4">
            Benvenuti
          </p>
          <h1 className="font-cinzel text-4xl md:text-6xl mb-4">
            La Maisonette di Paestum
          </h1>
          <p className="font-manrope text-lg text-gray-300">
            Due casette gemelle immerse nella magia dei templi greci
          </p>
        </div>
      </section>

      {/* Location Badge */}
      <div className="bg-[#C5A059] py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3 text-white">
          <MapPin className="w-5 h-5" />
          <span className="font-manrope">A 20 passi dalle mura dell'Antica Città di Paestum</span>
          <div className="flex items-center gap-1 ml-4">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-4 h-4 fill-white" />
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <section className="py-20 px-4 bg-[#F9F9F7]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-3">
              Scopri
            </p>
            <h2 className="font-cinzel text-4xl text-[#1A202C] mb-4">
              La Nostra Struttura
            </h2>
            <div className="w-24 h-1 bg-[#C5A059] mx-auto" />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059] mx-auto"></div>
            </div>
          ) : gallery.length > 0 ? (
            <div className="relative">
              {/* Main Slider */}
              <div className="relative h-[500px] overflow-hidden rounded-lg">
                {gallery.map((image, index) => (
                  <div
                    key={image.id}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.titolo}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                      <h3 className="font-cinzel text-2xl text-white mb-2">{image.titolo}</h3>
                      {image.descrizione && (
                        <p className="font-manrope text-gray-300">{image.descrizione}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-[#1A202C]" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-[#1A202C]" />
                  </button>
                </>
              )}

              {/* Thumbnails */}
              <div className="flex justify-center gap-3 mt-6">
                {gallery.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-20 h-14 rounded overflow-hidden border-2 transition-all ${
                      index === currentSlide ? 'border-[#C5A059] scale-105' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.titolo}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-[#4A5568]">Nessuna immagine disponibile</p>
          )}
        </div>
      </section>

      {/* Amenities/Services Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-3">
              Comfort
            </p>
            <h2 className="font-cinzel text-4xl text-[#1A202C] mb-4">
              I Nostri Servizi
            </h2>
            <div className="w-24 h-1 bg-[#C5A059] mx-auto" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F9F9F7] p-6 rounded-lg animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              ))
            ) : amenities.length > 0 ? (
              amenities.map((amenity) => (
                <div key={amenity.id} className="bg-[#F9F9F7] p-6 rounded-lg text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#C5A059]">
                    {getIcon(amenity.icona)}
                  </div>
                  <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">{amenity.nome}</h3>
                  <p className="font-manrope text-sm text-[#4A5568]">{amenity.descrizione}</p>
                </div>
              ))
            ) : (
              <p className="col-span-4 text-center text-[#4A5568]">Nessun servizio disponibile</p>
            )}
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-20 px-4 bg-[#1A202C]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-4">
            La Nostra Storia
          </p>
          <h2 className="font-cinzel text-3xl md:text-4xl text-white mb-8">
            Un'Esperienza Unica
          </h2>
          <p className="font-manrope text-gray-300 leading-relaxed mb-8">
            Le nostre due casette gemelle sono il rifugio perfetto per chi cerca pace e bellezza. 
            Situate a pochi passi dal Parco Archeologico di Paestum, patrimonio UNESCO, 
            offrono il perfetto equilibrio tra il fascino della storia millenaria e il comfort moderno.
          </p>
          <p className="font-manrope text-gray-300 leading-relaxed mb-10">
            Con soffitti in legno a vista, arredi curati nei minimi dettagli e un'atmosfera calda 
            e accogliente, ogni soggiorno diventa un'esperienza indimenticabile. 
            Il nostro giardino privato è l'ideale per rilassarsi dopo una giornata tra templi e spiagge.
          </p>
          <Link to="/booking">
            <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel">
              Prenota il Tuo Soggiorno
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 px-4 bg-[#F9F9F7]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-3">
              Dove Siamo
            </p>
            <h2 className="font-cinzel text-4xl text-[#1A202C] mb-4">
              La Nostra Posizione
            </h2>
            <div className="w-24 h-1 bg-[#C5A059] mx-auto mb-4" />
            <p className="font-manrope text-[#4A5568] max-w-2xl mx-auto">
              Capaccio Paestum (SA) - A pochi minuti dal Parco Archeologico
            </p>
          </div>

          <div className="rounded-lg overflow-hidden shadow-lg">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3037.8474!2d15.0067!3d40.4219!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x133bc5b5a5a5a5a5%3A0x5a5a5a5a5a5a5a5a!2sCapaccio%20Paestum%2C%20SA!5e0!3m2!1sit!2sit!4v1234567890"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="La Maisonette di Paestum - Mappa"
            ></iframe>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">🏛️ Templi di Paestum</h3>
              <p className="font-manrope text-sm text-[#4A5568]">5 minuti a piedi</p>
            </div>
            <div className="p-4">
              <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">🏖️ Spiaggia</h3>
              <p className="font-manrope text-sm text-[#4A5568]">10 minuti in auto</p>
            </div>
            <div className="p-4">
              <h3 className="font-cinzel text-lg text-[#1A202C] mb-2">🚗 Salerno</h3>
              <p className="font-manrope text-sm text-[#4A5568]">30 minuti in auto</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
