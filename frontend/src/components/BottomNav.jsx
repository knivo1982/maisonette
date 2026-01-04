import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Gift, User, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/events', icon: Calendar, label: 'Eventi' },
    { to: '/structures', icon: MapPin, label: 'Territorio' },
    { to: '/loyalty', icon: Gift, label: 'Premi' },
    { to: isAuthenticated ? '/dashboard' : '/login', icon: User, label: isAuthenticated ? 'Profilo' : 'Accedi' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe" 
         style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-[#C5A059]' 
                  : 'text-gray-500 hover:text-[#C5A059]'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
