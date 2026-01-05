import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import SplashScreen from "./components/SplashScreen";
import InstallPrompt from "./components/InstallPrompt";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import StructuresPage from "./pages/StructuresPage";
import LoyaltyPage from "./pages/LoyaltyPage";
import CheckInPage from "./pages/CheckInPage";
import OnlineCheckin from "./pages/OnlineCheckin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminStructures from "./pages/admin/AdminStructures";
import AdminGuests from "./pages/admin/AdminGuests";
import AdminCheckins from "./pages/admin/AdminCheckins";
import AdminServices from "./pages/admin/AdminServices";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminHouseRules from "./pages/admin/AdminHouseRules";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminItineraries from "./pages/admin/AdminItineraries";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminLoyaltyRewards from "./pages/admin/AdminLoyaltyRewards";
import AdminStructure from "./pages/admin/AdminStructure";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminRedemptions from "./pages/admin/AdminRedemptions";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminPlaces from "./pages/admin/AdminPlaces";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminIcal from "./pages/admin/AdminIcal";
import AdminPricing from "./pages/admin/AdminPricing";
import ServicesPage from "./pages/ServicesPage";
import ShopPage from "./pages/ShopPage";
import HouseRulesPage from "./pages/HouseRulesPage";
import AboutPage from "./pages/AboutPage";
import BookingPage from "./pages/BookingPage";

import "@/App.css";

// Fix iOS safe area background color
if (typeof window !== 'undefined') {
  const setIOSBackground = () => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    
    // For Capacitor iOS
    if (window.Capacitor) {
      const style = document.createElement('style');
      style.textContent = `
        html, body { background-color: #FFFFFF !important; }
        html::after {
          content: '';
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100px;
          background-color: #FFFFFF;
          z-index: 40;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }
  };
  
  if (document.readyState === 'complete') {
    setIOSBackground();
  } else {
    window.addEventListener('load', setIOSBackground);
  }
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Controlla se è la prima visita della sessione
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  return (
    <AuthProvider>
    <LanguageProvider>
      <div className="App">
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Guest routes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/structures" element={<StructuresPage />} />
            <Route path="/loyalty" element={<LoyaltyPage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/checkin/:token" element={<OnlineCheckin />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/house-rules" element={<HouseRulesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/booking" element={<BookingPage />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/structures" element={<AdminStructures />} />
            <Route path="/admin/guests" element={<AdminGuests />} />
            <Route path="/admin/checkins" element={<AdminCheckins />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/house-rules" element={<AdminHouseRules />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/itineraries" element={<AdminItineraries />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/loyalty-rewards" element={<AdminLoyaltyRewards />} />
            <Route path="/admin/structure" element={<AdminStructure />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/redemptions" element={<AdminRedemptions />} />
            <Route path="/admin/media" element={<AdminMedia />} />
            <Route path="/admin/places" element={<AdminPlaces />} />
            <Route path="/admin/calendar" element={<AdminCalendar />} />
            <Route path="/admin/ical" element={<AdminIcal />} />
            <Route path="/admin/pricing" element={<AdminPricing />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors offset="60px" />
        <InstallPrompt />
      </div>
    </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
