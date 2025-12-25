import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, User, Mail, Lock, Phone } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    telefono: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(formData);
      toast.success(`Benvenuto, ${user.nome}! Il tuo codice prenotazione è: ${user.codice_prenotazione}`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link 
            to="/" 
            className="inline-flex items-center text-[#4A5568] hover:text-[#C5A059] mb-8 font-manrope text-sm transition-colors"
            data-testid="back-home-link"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Home
          </Link>

          <div className="mb-8">
            <h1 className="font-cinzel text-3xl text-[#1A202C] mb-2">Registrati</h1>
            <p className="font-manrope text-[#4A5568]">
              Crea il tuo account per prenotare il tuo soggiorno
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="font-manrope text-sm font-medium text-[#4A5568]">
                  Nome
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]" />
                  <Input
                    id="nome"
                    name="nome"
                    type="text"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Mario"
                    className="pl-10 border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059]"
                    required
                    data-testid="input-nome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cognome" className="font-manrope text-sm font-medium text-[#4A5568]">
                  Cognome
                </Label>
                <Input
                  id="cognome"
                  name="cognome"
                  type="text"
                  value={formData.cognome}
                  onChange={handleChange}
                  placeholder="Rossi"
                  className="border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059]"
                  required
                  data-testid="input-cognome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-manrope text-sm font-medium text-[#4A5568]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="mario.rossi@email.it"
                  className="pl-10 border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059]"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono" className="font-manrope text-sm font-medium text-[#4A5568]">
                Telefono (opzionale)
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]" />
                <Input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+39 333 1234567"
                  className="pl-10 border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059]"
                  data-testid="input-telefono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-manrope text-sm font-medium text-[#4A5568]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="pl-10 border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059]"
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>
              <p className="text-xs text-[#4A5568] font-manrope">
                Minimo 6 caratteri
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel tracking-widest uppercase py-6 mt-6"
              data-testid="submit-register-btn"
            >
              {loading ? 'Registrazione in corso...' : 'Registrati'}
            </Button>
          </form>

          <p className="mt-8 text-center font-manrope text-sm text-[#4A5568]">
            Hai già un account?{' '}
            <Link 
              to="/login" 
              className="text-[#C5A059] hover:underline font-medium"
              data-testid="login-link"
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1633605015660-b0f2dbad3bf2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBob3RlbCUyMGJlZHJvb20lMjBicmlnaHQlMjBtb2Rlcm4lMjBpbnRlcmlvciUyMGdvbGQlMjBhY2NlbnRzfGVufDB8fHx8MTc2NjM1NTUwM3ww&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-[#1A202C]/50" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="font-cinzel text-4xl mb-4">
            Unisciti alla<br />Nostra Famiglia
          </h2>
          <p className="font-manrope text-gray-300">
            Registrati per accedere a vantaggi esclusivi e al programma fedeltà.
          </p>
        </div>
      </div>
    </div>
  );
}
