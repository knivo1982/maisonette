# La Maisonette di Paestum - PRD

## Problema Originale
Applicazione di gestione B&B per "La Maisonette di Paestum" importata da GitHub (`https://github.com/knivo1982/maisonette`).

## Stack Tecnologico
- **Backend:** FastAPI, Pydantic, Motor (async MongoDB), JWT authentication
- **Frontend:** React, React Router, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **Deploy:** Emergent Platform

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
- [x] **PWA** - Progressive Web App base
- [x] **Multilingue** - Fondamenta IT/EN (parziale)

---

## Changelog

### 2026-01-01
- **Aggiunta integrazione PayTourist** per tassa di soggiorno
  - Endpoint `GET /api/admin/checkins/{id}/paytourist-format`
  - Dialog UI con dati formattati e pulsante copia
  - Link diretto a PayTourist Capaccio
  - Salvate credenziali in .env (token, structure_id)

### Sessioni precedenti
- Fix URL API produzione (api.js con path relativi)
- Fix check-in visibilità per ospiti e admin
- Validazione manuale check-in
- Export dati Questura (Alloggiati Web)
- Supporto multilingue base (LanguageContext)

---

## Backlog Prioritizzato

### P0 - Bloccanti
- [ ] **DEPLOY:** Utente deve fare "Save to GitHub" + "Redeploy" per applicare fix URL produzione

### P1 - Alta Priorità
- [ ] Completare visibilità foto documenti check-in
- [ ] Form per inserire dati ospite su check-in validati manualmente

### P2 - Media Priorità
- [ ] Multilingue completo per contenuti dinamici (Servizi, Eventi, Amenità)
- [ ] Audit PWA con Lighthouse

### P3 - Bassa Priorità
- [ ] Integrazione automatica PayTourist (richiede software_id)
- [ ] App mobile con Capacitor

---

## Architettura File Principali

```
/app
├── backend/
│   ├── server.py          # API FastAPI (~4000 righe, da refactorare)
│   ├── .env               # Credenziali (PayTourist, SMTP, etc.)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── lib/api.js     # URL API centralizzato
│   │   ├── contexts/      # AuthContext, LanguageContext
│   │   ├── pages/admin/   # AdminCheckins, AdminBookings, AdminStructure
│   │   └── i18n/          # Traduzioni
│   └── public/
│       ├── manifest.json  # PWA
│       └── service-worker.js
└── memory/
    └── PRD.md
```

## Note per Sviluppo Futuro

### Refactoring Consigliato
- Dividere `server.py` in router modulari (`routers/admin.py`, `routers/public.py`)
- Estrarre modelli Pydantic in `models.py`
- Centralizzare gestione errori

### PayTourist Integrazione Automatica
Per abilitare l'invio automatico alla Questura/tassa di soggiorno:
1. Richiedere software_id a `sviluppo@paytourist.com`
2. Implementare endpoint POST con i dati strutturati
3. Gestire mapping nazioni/città con API PayTourist
