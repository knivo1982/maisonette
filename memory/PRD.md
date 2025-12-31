# La Maisonette di Paestum - B&B Management Application

## Original Problem Statement
Build a comprehensive B&B management application for "La Maisonette di Paestum", a vacation rental property near the archaeological site of Paestum, Italy. The application should handle bookings, guest check-in, loyalty programs, and admin management.

## User Personas
1. **Admin (Property Owner)**: Manages units, bookings, guests, check-ins, and exports data for regulatory compliance
2. **Guest**: Books stays, performs online check-in, manages loyalty points, views local services and events

## Core Requirements
- Unit (Casette) management with pricing and availability
- Booking system with calendar integration (iCal)
- Online check-in with document collection
- Admin dashboard with analytics
- Guest dashboard with services
- Questura (Italian Police) data export for Alloggiati Web

## Tech Stack
- **Backend**: FastAPI (Python) with MongoDB (motor async driver)
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Authentication**: JWT-based, separate flows for admin and guests

## Production Domain
- `booking.lamaisonettepaestum.com`

---

## What's Been Implemented

### December 2024 - Initial Development
- Full application structure with admin and guest areas
- Unit/Casette management (CRUD)
- Booking system with iCal sync (Airbnb, Booking.com)
- Guest authentication via email or booking code
- Admin authentication
- Check-in form with document upload
- Loyalty program structure

### December 31, 2024 - Session Updates
- ✅ **Fixed iCal URLs** to use production domain
- ✅ **Database reset endpoint** for units/bookings
- ✅ **Guest creation from iCal imports** - now properly creates guest records
- ✅ **Manual check-in validation** - Admin can validate check-ins without guest form
- ✅ **Check-in visibility fix** - Admin-validated check-ins appear in both admin list and guest dashboard
- ✅ **UI Refactoring** - Moved "Casette" management to Structure page
- ✅ **PWA Implementation** - Public site is installable as Progressive Web App
- ✅ **Multilanguage Structure** - IT/EN translations for navigation and static content
- ✅ **Backend fields** for English translations (_en fields for units, services, amenities, events)

### December 31, 2024 - Current Session (P0 Completed)
- ✅ **Admin Guest Data Management** - Full UI in AdminCheckins.js to view/edit guest data (ospite_principale, accompagnatori)
- ✅ **Document Photos Display** - Admin can view uploaded document photos (front/back)
- ✅ **Document Photo Upload** - Admin can upload document photos for check-ins
- ✅ **Questura Export** - Full export functionality in Alloggiati Web format
  - Date filter support
  - TXT file download
  - Preview table of export data
- ✅ **Fixed dates display** - Check-ins now show correct dates (not "Invalid Date")

---

## Prioritized Backlog

### P1 - In Progress
1. **Complete Multilanguage Support** for dynamic content
   - Admin forms for Services, Amenities, Events with _en fields
   - Public pages to display content in selected language

### P2 - Future
1. **Modularize backend** - Split server.py (>4000 lines) into routes, models, services
2. **Merge check-in collections** - Unify `checkins` and `online_checkins` into single collection
3. **Native mobile app** - Consider Capacitor/React Native in future

---

## Key API Endpoints
- `POST /api/auth/login` - Admin/Guest login
- `POST /api/auth/login-code` - Guest login via booking code
- `GET /api/admin/checkins` - All check-ins (form + online validated)
- `PUT /api/admin/checkins/{id}/guest-data` - Update guest/document data
- `GET /api/admin/checkins/export-questura` - Export for Alloggiati Web
- `POST /api/admin/checkins/validate/{booking_id}` - Manual check-in validation
- `GET /api/admin/units` - List units
- `POST /api/admin/bookings` - Create booking

## Credentials
- **Admin**: admin@maisonette.it / admin123
- **Guest**: Use booking code (e.g., MDP-XXXXXX) on login page

## Files Modified This Session
- `/app/backend/server.py` - Fixed dates in GET /admin/checkins endpoint
- `/app/frontend/src/pages/admin/AdminCheckins.js` - Complete rewrite with edit guest dialog and export questura

## Test Reports
- `/app/test_reports/iteration_1.json` - All tests passed (7/7 backend, 100% frontend)
- `/app/tests/test_checkin_api.py` - API test suite created
