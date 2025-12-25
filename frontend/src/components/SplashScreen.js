import { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Inizia il fade out dopo 2 secondi
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Completa dopo l'animazione di fade (500ms)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background image - same as home */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1504644708628-9c1dd99f497f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxQYWVzdHVtJTIwdGVtcGxlJTIwZ3JlZWslMjBydWlucyUyMGdvbGRlbiUyMGhvdXJ8ZW58MHx8fHwxNzY2MzU1NTAwfDA&ixlib=rb-4.1.0&q=85')`
        }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#1A202C]/70" />

      <div className="relative text-center px-4">
        {/* Logo dorato con animazione */}
        <div className="animate-splash-logo">
          <img
            src="https://customer-assets.emergentagent.com/job_9e63d10a-d9aa-4e49-9076-0c5c1ecf4133/artifacts/vr9w9ixp_P%C3%86STUM__5_-removebg-preview.png"
            alt="La Maisonette Paestum"
            className="h-28 md:h-36 mx-auto"
          />
        </div>

        {/* Testo con animazione ritardata */}
        <div className="animate-splash-text mt-6">
          <p className="font-cormorant text-[#C5A059] text-xl md:text-2xl italic">
            A 20 passi dalle mura dell'Antica Città di Paestum
          </p>
        </div>

        {/* Loading indicator */}
        <div className="animate-splash-loader mt-10">
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Linea decorativa in basso */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent animate-splash-line" />
    </div>
  );
}
