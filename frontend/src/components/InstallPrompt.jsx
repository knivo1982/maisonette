import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from './ui/button';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (don't show for 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
      // Show iOS install instructions after 3 seconds
      setTimeout(() => setShowIOSPrompt(true), 3000);
      return;
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || (!showPrompt && !showIOSPrompt)) {
    return null;
  }

  // iOS-specific install instructions
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#1A202C] to-[#1A202C]/95 backdrop-blur-lg border-t border-[#C5A059]/20 animate-slide-up">
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#C5A059] rounded-2xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg mb-1">
              Installa l'App
            </h3>
            <p className="text-gray-400 text-sm mb-3">
              Aggiungi La Maisonette alla schermata Home per un accesso rapido!
            </p>
            
            <div className="bg-[#2D3748] rounded-lg p-3 text-sm">
              <p className="text-gray-300 mb-2">
                <span className="text-[#C5A059] font-medium">1.</span> Tocca il pulsante <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-[#3D4758] rounded text-white">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V15a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z"/>
                    <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                  </svg>
                  Condividi
                </span>
              </p>
              <p className="text-gray-300">
                <span className="text-[#C5A059] font-medium">2.</span> Scorri e tocca <span className="font-medium text-white">"Aggiungi a Home"</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard install prompt (Android, Desktop)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#1A202C] to-[#1A202C]/95 backdrop-blur-lg border-t border-[#C5A059]/20 animate-slide-up">
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-gray-400 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-[#C5A059] rounded-2xl flex items-center justify-center flex-shrink-0">
          <Download className="w-7 h-7 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg mb-1">
            Installa l'App
          </h3>
          <p className="text-gray-400 text-sm">
            Accesso rapido, notifiche e funziona offline!
          </p>
        </div>
        
        <Button
          onClick={handleInstall}
          className="bg-[#C5A059] hover:bg-[#B08D45] text-[#1A202C] font-semibold px-6"
        >
          Installa
        </Button>
      </div>
    </div>
  );
}
