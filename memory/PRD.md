# La Maisonette di Paestum - PRD

## Problema Originale
Applicazione di gestione B&B per "La Maisonette di Paestum" importata da GitHub (`https://github.com/knivo1982/maisonette`).

## Stack Tecnologico
- **Backend:** FastAPI, Pydantic, Motor (async MongoDB), JWT authentication
- **Frontend:** React, React Router, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **Deploy:** Emergent Platform
- **PWA:** Service Worker, Manifest, Offline Support

## Credenziali Admin
- Email: `admin@maisonette.it`
- Password: `admin123`

## Integrazioni Configurate

### PayTourist (Tassa di Soggiorno)
- **URL:** https://capaccio.paytourist.com
- **Structure ID:** 376 (La Maisonette di Paestum)
- **Token:** Salvato in backend/.env
- **Funzionalità:** Copia manuale dati per PayTourist (software_id richiesto per integrazione automatica)

---

## Funzionalità Implementate

### Core
- [x] Gestione prenotazioni (CRUD)
- [x] Gestione unità/casette
- [x] Check-in online con upload documenti
- [x] Validazione manuale check-in da admin
- [x] Sincronizzazione iCal (Airbnb, Booking.com)
- [x] Sistema fedeltà ospiti
- [x] Notifiche email

### Admin Panel
- [x] Dashboard prenotazioni
- [x] Gestione check-in con foto documenti
- [x] Blocco date e prezzi speciali
- [x] Gestione servizi e prodotti
- [x] Galleria struttura

### Integrazioni
- [x] **PayTourist** - Copia dati formattati per inserimento manuale (01/2026)
- [x] **PWA Completa** - Installabile su iOS/Android (01/2026)
- [x] **Multilingue** - Fondamenta IT/EN (parziale)

### PWA (Progressive Web App) - COMPLETATA
- [x] Manifest.json ottimizzato con 8 icone PNG
- [x] Service Worker con cache strategies
- [x] Offline page dedicata
- [x] Install prompt per Android/Desktop
- [x] Istruzioni installazione iOS Safari
- [x] Meta tag iOS completi (apple-touch-icon, status-bar)
- [x] Shortcuts per accesso rapido (Prenotazioni, Check-in, Servizi)

---

## Changelog

### 2026-01-02
- **Scraper Eventi Locali** da Virgilio.it
  - Endpoint `POST /api/admin/scrape-events` per importare eventi automaticamente
  - Parser HTML con BeautifulSoup per estrarre titolo, date, luogo, categoria
  - Gestione duplicati (evita reimportazione)
  - Pulsante "Importa da Virgilio.it" in Admin Eventi
  - Mappatura categorie (rassegne→cultura, concerti→musica, mercatini→mercato, ecc.)

### 2026-01-01
- **PWA Migliorata** per installazione su iOS/Android
  - Convertito icone SVG → PNG (iOS richiede PNG)
  - Service Worker v2 con strategie cache ottimizzate
  - Pagina offline dedicata `/offline.html`
  - Componente `InstallPrompt.jsx` con supporto iOS/Android
  - Manifest aggiornato con shortcuts e screenshots
  
- **Aggiunta integrazione PayTourist** per tassa di soggiorno
  - Endpoint `GET /api/admin/checkins/{id}/paytourist-format`
  - Dialog UI con dati formattati e pulsante copia
  - Link diretto a PayTourist Capaccio

### Sessioni precedenti
- Fix URL API produzione (api.js con path relativi)
- Fix check-in visibilità per ospiti e admin
- Validazione manuale check-in
- Export dati Questura (Alloggiati Web)
- Supporto multilingue base (LanguageContext)

---

## Come Installare la PWA

### iOS (Safari)
1. Apri il sito in Safari
2. Tocca il pulsante "Condividi" (freccia in alto)
3. Scorri e tocca "Aggiungi a Home"
4. Conferma il nome e tocca "Aggiungi"

### Android (Chrome)
1. Apri il sito in Chrome
2. Apparirà il banner "Installa app" in basso
3. Tocca "Installa"

### Desktop (Chrome/Edge)
1. Apri il sito
2. Clicca l'icona di installazione nella barra degli indirizzi
3. Conferma l'installazione

---

## Backlog Prioritizzato

### P0 - Bloccanti
- [ ] **DEPLOY:** Utente deve fare "Save to GitHub" + "Redeploy" per applicare modifiche

### P1 - Alta Priorità
- [x] Form per inserire dati ospite su check-in validati manualmente ✅
- [x] Visibilità dati ospite nei check-in ✅
- [x] **Scraper Eventi Locali** - Importazione automatica da Virgilio.it ✅ (01/2026)
- [ ] Visibilità foto documenti (codice presente, dipende da upload)

### P2 - Media Priorità
- [x] Multilingue UI (navigazione, pulsanti) ✅
- [x] Form traduzioni admin per Servizi/Eventi ✅
- [x] Notifiche Push (VAPID keys configurate) ✅
- [x] Icona PWA personalizzata ✅

### P3 - Bassa Priorità
- [ ] Background sync per check-in offline
- [ ] Integrazione automatica PayTourist (richiede software_id)

---

## Architettura File Principali

```
/app
├── backend/
│   ├── server.py          # API FastAPI (~4000 righe)
│   ├── .env               # Credenziali
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   ├── service-worker.js # Cache & offline
│   │   ├── offline.html      # Pagina offline
│   │   └── icons/            # PNG icons
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   └── InstallPrompt.jsx  # PWA install prompt
│   │   ├── lib/api.js
│   │   ├── contexts/
│   │   └── pages/
│   └── package.json
└── memory/
    └── PRD.md
```

