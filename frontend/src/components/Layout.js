import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Menu, X, User, Calendar, MapPin, Gift, LogOut, Home, Settings, Sparkles, FileText, ShoppingBag, Building, CalendarCheck, Globe } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import NotificationBell from './NotificationBell';
import LanguageSwitch from './LanguageSwitch';
import BottomNav from './BottomNav';

export function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = isAuthenticated ? [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/about', label: language === 'it' ? 'La Struttura' : 'The Property', icon: Building },
    { to: '/booking', label: language === 'it' ? 'Prenota' : 'Book', icon: CalendarCheck },
    { to: '/events', label: language === 'it' ? 'Eventi' : 'Events', icon: Calendar },
    { to: '/structures', label: language === 'it' ? 'Territorio' : 'Area', icon: MapPin },
    { to: '/services', label: language === 'it' ? 'Servizi' : 'Services', icon: Sparkles },
    { to: '/shop', label: 'Shop', icon: ShoppingBag },
    { to: '/house-rules', label: language === 'it' ? 'Regole' : 'Rules', icon: FileText },
    { to: '/loyalty', label: language === 'it' ? 'Punti' : 'Points', icon: Gift },
  ] : [
    { to: '/about', label: language === 'it' ? 'La Struttura' : 'The Property', icon: Building },
    { to: '/booking', label: language === 'it' ? 'Prenota' : 'Book', icon: CalendarCheck },
    { to: '/events', label: language === 'it' ? 'Eventi' : 'Events', icon: Calendar },
    { to: '/structures', label: language === 'it' ? 'Territorio' : 'Area', icon: MapPin },
    { to: '/loyalty', label: language === 'it' ? 'Fedeltà' : 'Loyalty', icon: Gift },
  ];

  return (
    <>
    <nav className="bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <img 
              src="https://customer-assets.emergentagent.com/job_9e63d10a-d9aa-4e49-9076-0c5c1ecf4133/artifacts/vr9w9ixp_P%C3%86STUM__5_-removebg-preview.png" 
              alt="La Maisonette Paestum" 
              className="h-8 md:h-10"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link font-manrope text-sm font-medium ${
                  location.pathname === link.to ? 'active' : ''
                }`}
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />
                
                {/* Welcome Message */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#C5A059]/10 rounded-full">
                  <User className="w-4 h-4 text-[#C5A059]" />
                  <span className="font-manrope text-sm text-[#1A202C]">
                    Benvenuto, <span className="font-medium">{user?.nome}</span>
                  </span>
                </div>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white" data-testid="nav-admin-btn">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-[#4A5568] hover:text-[#C5A059]"
                  data-testid="nav-logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="font-manrope" data-testid="nav-login-btn">
                    {language === 'it' ? 'Accedi' : 'Login'}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-[#C5A059] hover:bg-[#B08D45] text-white font-manrope" data-testid="nav-register-btn">
                    {language === 'it' ? 'Registrati' : 'Sign Up'}
                  </Button>
                </Link>
              </>
            )}
            {/* Language Switch */}
            <LanguageSwitch />
          </div>

          {/* Mobile notification + menu button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitch className="text-xs" />
            {isAuthenticated && <NotificationBell />}
            <button
              className="p-3 -mr-2 touch-manipulation"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu md:hidden fixed inset-0 z-[100] bg-[#1A202C]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <img 
                  src="https://customer-assets.emergentagent.com/job_9e63d10a-d9aa-4e49-9076-0c5c1ecf4133/artifacts/vr9w9ixp_P%C3%86STUM__5_-removebg-preview.png" 
                  alt="La Maisonette Paestum" 
                  className="h-10 brightness-0 invert"
                />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            
            {/* Links - Full Page Simple Menu */}
            <div className="flex-1 overflow-y-auto py-8">
              <nav className="flex flex-col gap-1 px-4">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-6 py-5 text-lg text-white hover:bg-[#C5A059]/20 transition-colors ${
                    location.pathname === '/' ? 'bg-[#C5A059]/20 text-[#C5A059] border-l-4 border-[#C5A059]' : 'border-l-4 border-transparent'
                  }`}
                >
                  <Home className="w-6 h-6" />
                  <span className="font-manrope font-medium">Home</span>
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-6 py-5 text-lg text-white hover:bg-[#C5A059]/20 transition-colors ${
                      location.pathname === link.to ? 'bg-[#C5A059]/20 text-[#C5A059] border-l-4 border-[#C5A059]' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <link.icon className="w-6 h-6" />
                    <span className="font-manrope font-medium">{link.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-gray-700 bg-[#151820]">
              {isAuthenticated ? (
                <div className="space-y-4">
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-[#C5A059] text-white rounded-lg font-manrope font-medium"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Pannello Admin</span>
                    </Link>
                  )}
                  <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3 text-white">
                      <User className="w-5 h-5 text-[#C5A059]" />
                      <span className="font-manrope">{user?.nome}</span>
                    </div>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 text-gray-400 hover:text-[#C5A059] transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="text-sm">Esci</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-white text-white rounded-lg font-manrope font-medium hover:bg-white hover:text-[#1A202C] transition-colors"
                  >
                    Accedi
                  </Link>
                  <Link 
                    to="/register" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-[#C5A059] text-white rounded-lg font-manrope font-medium hover:bg-[#B08D45] transition-colors"
                  >
                    Registrati
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#1A202C] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_9e63d10a-d9aa-4e49-9076-0c5c1ecf4133/artifacts/vr9w9ixp_P%C3%86STUM__5_-removebg-preview.png" 
              alt="La Maisonette Paestum" 
              className="h-12 mb-4 brightness-0 invert"
            />
            <p className="text-gray-400 font-manrope text-sm leading-relaxed">
              A 20 passi dalle mura dell'Antica Città di Paestum, 
              Patrimonio dell'UNESCO.
            </p>
          </div>
          <div>
            <h4 className="font-cinzel text-sm uppercase tracking-widest text-[#C5A059] mb-4">
              Contatti
            </h4>
            <p className="text-gray-400 font-manrope text-sm">
              Via Tavernelle, 44<br />
              84047 Capaccio Paestum (SA) - Italy<br />
              Tel: +39 393 4957532<br />
              Tel: +39 388 1681287
            </p>
          </div>
          <div>
            <h4 className="font-cinzel text-sm uppercase tracking-widest text-[#C5A059] mb-4">
              Orari Check-in
            </h4>
            <p className="text-gray-400 font-manrope text-sm">
              Check-in: 15:00 - 20:00<br />
              Check-out: entro le 10:00
            </p>
            <a 
              href="https://www.lamaisonettepaestum.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mt-4 text-[#C5A059] hover:underline text-sm"
            >
              www.lamaisonettepaestum.com
            </a>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm font-manrope">
            © {new Date().getFullYear()} La Maisonette di Paestum. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F7]">
      <Navbar />
      {/* Spacer for fixed navbar */}
      <div className="h-14 md:h-16" />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
