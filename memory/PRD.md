# La Maisonette di Paestum - B&B Management Application

## Original Problem Statement
Full-stack B&B management application for "La Maisonette di Paestum" including:
- Public-facing website for bookings
- Admin panel for property management
- Guest check-in system with document management
- iCal sync with booking platforms (Airbnb, Booking.com)
- Multilingual support (Italian/English)
- PWA support

## Core Requirements
1. **Public Website**: Landing page, booking system, area information
2. **Admin Panel**: Manage units, bookings, calendar, guests, check-ins
3. **Guest Portal**: Online check-in, loyalty program, notifications
4. **Integrations**: iCal sync, Google Places, email notifications

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **Authentication**: JWT-based

## What's Been Implemented

### Completed Features (December 2024)
- [x] Public website with multilingual support (IT/EN)
- [x] Admin panel with full CRUD for units, bookings, events, services
- [x] iCal synchronization with external booking platforms
- [x] Guest check-in system with document upload
- [x] Manual check-in validation by admin
- [x] PWA configuration
- [x] Centralized API configuration (`/app/frontend/src/lib/api.js`)

### Session: December 31, 2024
**Completed Tasks:**
1. ✅ **Admin Guest Data Management**
   - Added "Modifica" button to each check-in card
   - Edit modal with full guest info: name, birth date, birthplace, nationality, sex
   - Document section: type, number, expiry, place of issue
   - Photo upload for document front/back
   
2. ✅ **Export Questura (Alloggiati Web)**
   - Added "Export Questura" button in AdminCheckins page
   - Modal with date range selection (Data Da / Data A)
   - Preview table showing found records
   - Download button generates tab-separated file for Alloggiati Web portal
   
3. ✅ **Check-in Details Visualization**
   - Expandable rows showing ospite principale details
   - Document photos displayed when available
   - "Aggiungi dati ospite" prompt for check-ins without guest data

**Bug Fixes:**
- Fixed MongoDB ObjectId serialization in `/admin/media/upload` endpoint

**Testing:**
- 13/13 backend tests passed
- Frontend UI fully tested via Playwright

## Architecture

### Key Files
- `backend/server.py`: All API endpoints
- `frontend/src/lib/api.js`: Centralized API URL config (uses relative paths in production)
- `frontend/src/pages/admin/AdminCheckins.js`: Check-in management with edit/export
- `frontend/src/contexts/LanguageContext.js`: i18n context
- `frontend/src/i18n/translations.js`: Static translations

### Database Collections
- `units`: Property units with IT/EN translations
- `bookings`: Reservations
- `guests`: User accounts
- `checkins`: Form-based check-ins with full guest data
- `online_checkins`: Admin-validated check-ins
- `media`: Uploaded files

### Key API Endpoints
- `PUT /api/admin/checkins/{id}/guest-data`: Update guest info
- `GET /api/admin/checkins/export-questura`: Export Questura data
- `POST /api/admin/media/upload`: Upload document photos

## Prioritized Backlog

### P1 - High Priority
- [ ] Complete translations for public pages (AboutPage, ServicesPage, EventsPage)
- [ ] Add English translation fields to Services and Events admin forms

### P2 - Medium Priority
- [ ] Display translated content on public Services/Events pages
- [ ] Email notifications with SMTP configuration

### P3 - Low Priority
- [ ] Additional PWA features (push notifications)
- [ ] Enhanced analytics/reporting

## Deployment Notes
- User must **Save to GitHub** and then **Update Deployment** from Home tab
- Preview URL: https://checkinmaster.preview.emergentagent.com
- Admin credentials: admin@maisonette.it / admin123
