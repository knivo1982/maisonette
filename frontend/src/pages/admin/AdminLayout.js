import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  MapPin, 
  Users, 
  ClipboardCheck, 
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Wine,
  FileText,
  ShoppingCart,
  Navigation,
  CalendarDays,
  Gift,
  Image,
  Bell,
  Home,
  Store,
  Heart,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import axios from 'axios';

import { API } from '../../lib/api';

export default function AdminLayout({ children, title }) {
  const { user, logout, isAdmin, loading, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState({});
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchBadges();
      // Refresh badges every 60 seconds
      const interval = setInterval(fetchBadges, 60000);
      return () => clearInterval(interval);
    }
  }, [token, isAdmin]);

  // Auto-expand menu containing current route
  useEffect(() => {
    menuGroups.forEach(group => {
      if (group.items) {
        const hasActiveItem = group.items.some(item => location.pathname === item.to);
        if (hasActiveItem) {
          setExpandedMenus(prev => ({ ...prev, [group.label]: true }));
        }
      }
    });
  }, [location.pathname]);

  const fetchBadges = async () => {
    try {
      const response = await axios.get(`${API}/admin/badges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBadges(response.data);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = (label) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Menu raggruppato in sottomenu
  const menuGroups = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    {
      icon: CalendarDays,
      label: 'Prenotazioni',
      items: [
        { to: '/admin/calendar', icon: CalendarDays, label: 'Calendario' },
        { to: '/admin/bookings', icon: CalendarDays, label: 'Prenotazioni', badgeKey: 'prenotazioni' },
        { to: '/admin/checkins', icon: ClipboardCheck, label: 'Check-in', badgeKey: 'checkins' },
        { to: '/admin/guests', icon: Users, label: 'Ospiti', badgeKey: 'nuovi_ospiti' },
        { to: '/admin/ical', icon: RefreshCw, label: 'Sync Calendari' },
      ]
    },
    {
      icon: Home,
      label: 'Struttura',
      items: [
        { to: '/admin/structure', icon: Image, label: 'La Struttura' },
        { to: '/admin/pricing', icon: DollarSign, label: 'Prezzi' },
        { to: '/admin/services', icon: Sparkles, label: 'Servizi', badgeKey: 'servizi' },
        { to: '/admin/house-rules', icon: FileText, label: 'Regole Casa' },
        { to: '/admin/media', icon: Image, label: 'Media Library' },
      ]
    },
    {
      icon: MapPin,
      label: 'Territorio',
      items: [
        { to: '/admin/events', icon: Calendar, label: 'Eventi' },
        { to: '/admin/structures', icon: MapPin, label: 'Luoghi' },
        { to: '/admin/places', icon: MapPin, label: 'Importa da Google' },
        { to: '/admin/itineraries', icon: Navigation, label: 'Itinerari Meteo' },
      ]
    },
    {
      icon: Store,
      label: 'Shop & Ordini',
      items: [
        { to: '/admin/products', icon: Wine, label: 'Prodotti' },
        { to: '/admin/orders', icon: ShoppingCart, label: 'Ordini', badgeKey: 'ordini' },
      ]
    },
    {
      icon: Heart,
      label: 'Fedeltà',
      items: [
        { to: '/admin/loyalty-rewards', icon: Gift, label: 'Premi' },
        { to: '/admin/redemptions', icon: Gift, label: 'Riscatti' },
      ]
    },
    { to: '/admin/notifications', icon: Bell, label: 'Notifiche' },
  ];

  const getTotalBadges = (items) => {
    if (!items) return 0;
    return items.reduce((total, item) => {
      const count = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
      return total + count;
    }, 0);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9F9F7]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F9F9F7]">
      {/* Sidebar */}
      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 h-full flex flex-col">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_9e63d10a-d9aa-4e49-9076-0c5c1ecf4133/artifacts/vr9w9ixp_P%C3%86STUM__5_-removebg-preview.png" 
              alt="La Maisonette Paestum" 
              className="h-8 brightness-0 invert"
            />
          </Link>
          
          <nav className="space-y-1 flex-1 overflow-y-auto">
            {menuGroups.map((group) => {
              // Voce singola (senza sottomenu)
              if (group.to) {
                const badgeCount = group.badgeKey ? badges[group.badgeKey] : 0;
                return (
                  <Link
                    key={group.to}
                    to={group.to}
                    className={`admin-nav-item flex items-center gap-3 ${
                      location.pathname === group.to ? 'active' : ''
                    }`}
                    onClick={() => setSidebarOpen(false)}
                    data-testid={`admin-nav-${group.label.toLowerCase()}`}
                  >
                    <group.icon className="w-5 h-5" />
                    <span className="font-manrope flex-1">{group.label}</span>
                    {badgeCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              }

              // Gruppo con sottomenu
              const isExpanded = expandedMenus[group.label];
              const hasActiveItem = group.items.some(item => location.pathname === item.to);
              const totalBadges = getTotalBadges(group.items);

              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleMenu(group.label)}
                    className={`admin-nav-item flex items-center gap-3 w-full text-left ${
                      hasActiveItem ? 'text-[#C5A059]' : ''
                    }`}
                  >
                    <group.icon className="w-5 h-5" />
                    <span className="font-manrope flex-1">{group.label}</span>
                    {totalBadges > 0 && (
                      <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center mr-1">
                        {totalBadges > 99 ? '99+' : totalBadges}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
                      {group.items.map((item) => {
                        const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            className={`admin-nav-item flex items-center gap-3 py-2 text-sm ${
                              location.pathname === item.to ? 'active' : ''
                            }`}
                            onClick={() => setSidebarOpen(false)}
                            data-testid={`admin-nav-${item.label.toLowerCase()}`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="font-manrope flex-1">{item.label}</span>
                            {badgeCount > 0 && (
                              <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center">
              <span className="font-cinzel text-white">{user.nome[0]}</span>
            </div>
            <div>
              <p className="font-manrope text-sm text-white">{user.nome}</p>
              <p className="font-manrope text-xs text-gray-400">Amministratore</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-gray-400 hover:text-[#C5A059] hover:bg-transparent"
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="mobile-sidebar-btn"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 className="font-cinzel text-xl text-[#1A202C]">{title}</h1>
              </div>
            </div>
            <Link to="/" className="hidden sm:flex items-center gap-2 text-[#4A5568] hover:text-[#C5A059] transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span className="font-manrope text-sm">Torna al sito</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
