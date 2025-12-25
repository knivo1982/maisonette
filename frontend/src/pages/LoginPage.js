import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Lock, Key } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codice, setCodice] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithCode } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Benvenuto, ${user.nome}!`);
      navigate(user.is_admin ? '/admin' : '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await loginWithCode(codice);
      toast.success(`Benvenuto, ${user.nome}!`);
      navigate(user.is_admin ? '/admin' : '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Codice non valido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1504644708628-9c1dd99f497f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxQYWVzdHVtJTIwdGVtcGxlJTIwZ3JlZWslMjBydWlucyUyMGdvbGRlbiUyMGhvdXJ8ZW58MHx8fHwxNzY2MzU1NTAwfDA&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-[#1A202C]/60" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="font-cinzel text-4xl mb-4">
            Bentornato alla<br />Maisonette
          </h2>
          <p className="font-manrope text-gray-300">
            Accedi per gestire il tuo soggiorno e scoprire i tuoi vantaggi esclusivi.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
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
            <h1 className="font-cinzel text-3xl text-[#1A202C] mb-2">Accedi</h1>
            <p className="font-manrope text-[#4A5568]">
              Accedi al tuo account per gestire il soggiorno
            </p>
          </div>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#E2E8F0]">
              <TabsTrigger 
                value="email" 
                className="font-manrope data-[state=active]:bg-[#C5A059] data-[state=active]:text-white"
                data-testid="tab-email"
              >
                Email
              </TabsTrigger>
              <TabsTrigger 
                value="code"
                className="font-manrope data-[state=active]:bg-[#C5A059] data-[state=active]:text-white"
                data-testid="tab-code"
              >
                Codice Prenotazione
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-manrope text-sm font-medium text-[#4A5568]">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="la-tua@email.it"
                      className="pl-10 border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059]"
                      required
                      data-testid="input-email"
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
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059]"
                      required
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel tracking-widest uppercase py-6"
                  data-testid="submit-login-btn"
                >
                  {loading ? 'Accesso in corso...' : 'Accedi'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="code">
              <form onSubmit={handleCodeLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="codice" className="font-manrope text-sm font-medium text-[#4A5568]">
                    Codice Prenotazione
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]" />
                    <Input
                      id="codice"
                      type="text"
                      value={codice}
                      onChange={(e) => setCodice(e.target.value.toUpperCase())}
                      placeholder="MP-XXXXXXXX"
                      className="pl-10 border-[#E2E8F0] focus:border-[#C5A059] focus:ring-[#C5A059] uppercase"
                      required
                      data-testid="input-codice"
                    />
                  </div>
                  <p className="text-xs text-[#4A5568] font-manrope">
                    Inserisci il codice ricevuto al momento della prenotazione
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C5A059] hover:bg-[#B08D45] text-white font-cinzel tracking-widest uppercase py-6"
                  data-testid="submit-code-btn"
                >
                  {loading ? 'Accesso in corso...' : 'Accedi con Codice'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center font-manrope text-sm text-[#4A5568]">
            Non hai un account?{' '}
            <Link 
              to="/register" 
              className="text-[#C5A059] hover:underline font-medium"
              data-testid="register-link"
            >
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
