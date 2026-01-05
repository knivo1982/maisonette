from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import shutil
import json
from bs4 import BeautifulSoup
import re

# Web Push
try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'maisonette-paestum-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Google Places Config
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')
PAESTUM_LAT = 40.4219
PAESTUM_LON = 15.0067
# Coordinate della struttura La Maisonette (vicino ai templi)
MAISONETTE_LAT = 40.4197
MAISONETTE_LON = 15.0056

# OpenWeatherMap Config
OPENWEATHERMAP_API_KEY = os.environ.get('OPENWEATHERMAP_API_KEY', '')
CAPACCIO_PAESTUM_LAT = 40.4219
CAPACCIO_PAESTUM_LON = 15.0067

# Email Config
NOTIFY_EMAIL = os.environ.get('NOTIFICATION_EMAIL', 'info@lamaisonettepaestum.com')
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# VAPID Config for Push Notifications
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_EMAIL = os.environ.get('VAPID_EMAIL', 'info@lamaisonettepaestum.com')
SMTP_FROM = os.environ.get('SMTP_FROM', 'info@lamaisonettepaestum.com')

# Email sending function
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def send_booking_notification(booking: dict, unit_name: str = "La Maisonette"):
    """Send booking notification to admin"""
    subject = f"🏠 Nuova Prenotazione - {booking.get('nome_ospite', 'Ospite')}"
    
    # Extract source from notes
    note = booking.get('note', '') or ''
    source = "Diretto"
    if '[airbnb]' in note.lower():
        source = "Airbnb"
    elif '[booking' in note.lower():
        source = "Booking.com"
    elif '[whatsapp]' in note.lower():
        source = "WhatsApp"
    elif '[phone]' in note.lower() or '[telefono]' in note.lower():
        source = "Telefono"
    
    body = f"""
    <h2 style="color: #C5A059;">Nuova Prenotazione Ricevuta!</h2>
    
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Ospite:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{booking.get('nome_ospite', 'N/A')}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Unità:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{unit_name}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Check-in:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{booking.get('data_arrivo', 'N/A')}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Check-out:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{booking.get('data_partenza', 'N/A')}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Ospiti:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{booking.get('num_ospiti', 1)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Provenienza:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><span style="background: #C5A059; color: white; padding: 3px 10px; border-radius: 12px;">{source}</span></td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{booking.get('email_ospite', 'N/A')}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Telefono:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{booking.get('telefono_ospite', 'N/A')}</td>
        </tr>
    </table>
    
    {f'<p style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 5px;"><strong>Note:</strong> {note}</p>' if note else ''}
    
    <p style="margin-top: 20px;">
        <a href="https://lamaisonettepaestum.com/admin/bookings" style="background: #C5A059; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Vai alle Prenotazioni →
        </a>
    </p>
    """
    
    return await send_notification_email(subject, body)

security = HTTPBearer()

app = FastAPI(title="Maisonette di Paestum API")
api_router = APIRouter(prefix="/api")

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="api_uploads")

# ==================== EMAIL SERVICE ====================

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def send_notification_email(subject: str, body: str, to_email: str = None):
    """
    Invia email di notifica alla struttura.
    Se SMTP non configurato, logga solo il messaggio.
    """
    target_email = to_email or NOTIFY_EMAIL
    
    if not SMTP_HOST or not SMTP_USER:
        # SMTP not configured - log only
        logging.info(f"[EMAIL NOT SENT - SMTP not configured] To: {target_email}, Subject: {subject}")
        # Store in database for admin to see
        await db.email_queue.insert_one({
            "id": str(uuid.uuid4()),
            "to": target_email,
            "subject": subject,
            "body": body,
            "sent": False,
            "error": "SMTP non configurato",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = SMTP_FROM
        msg['To'] = target_email
        
        # HTML email body
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #C5A059; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">La Maisonette di Paestum</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f7;">
                {body}
            </div>
            <div style="padding: 10px; text-align: center; font-size: 12px; color: #666;">
                Questa è una notifica automatica dal sistema di gestione.
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, target_email, msg.as_string())
        
        # Log success
        await db.email_queue.insert_one({
            "id": str(uuid.uuid4()),
            "to": target_email,
            "subject": subject,
            "body": body,
            "sent": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        logging.info(f"[EMAIL SENT] To: {target_email}, Subject: {subject}")
        return True
        
    except Exception as e:
        logging.error(f"[EMAIL ERROR] {str(e)}")
        await db.email_queue.insert_one({
            "id": str(uuid.uuid4()),
            "to": target_email,
            "subject": subject,
            "body": body,
            "sent": False,
            "error": str(e),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return False

def generate_booking_code():
    """Genera un codice prenotazione univoco es: MDP-ABC123"""
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"MDP-{code}"

# ==================== MODELS ====================

class GuestCreate(BaseModel):
    nome: str
    cognome: str
    email: EmailStr
    password: str
    telefono: Optional[str] = None

class GuestLogin(BaseModel):
    email: EmailStr
    password: str

class GuestLoginCode(BaseModel):
    codice_prenotazione: str

class GuestResponse(BaseModel):
    id: str
    nome: str
    cognome: str
    email: str
    telefono: Optional[str] = None
    punti_fedelta: int = 0
    is_admin: bool = False
    codice_prenotazione: Optional[str] = None

class CheckInCreate(BaseModel):
    # Per validazione prenotazione - almeno uno deve essere fornito
    email_prenotazione: Optional[str] = None
    codice_prenotazione: Optional[str] = None
    # Dati check-in
    data_arrivo: str
    data_partenza: str
    num_ospiti: int = Field(ge=1, le=5)
    note: Optional[str] = None
    # Ospite principale
    ospite_principale: Optional[dict] = None  # {nome, cognome, data_nascita, luogo_nascita, nazionalita, tipo_documento, numero_documento, scadenza_documento, foto_fronte_url, foto_retro_url}
    # Accompagnatori
    accompagnatori: Optional[List[dict]] = None  # [{nome, cognome, data_nascita, luogo_nascita, nazionalita, tipo_documento, numero_documento}]

class CheckInResponse(BaseModel):
    id: str
    guest_id: str
    booking_id: Optional[str] = None
    codice_prenotazione: Optional[str] = None
    guest_nome: Optional[str] = None
    data_arrivo: str
    data_partenza: str
    num_ospiti: int
    note: Optional[str] = None
    status: str = "pending"
    ospite_principale: Optional[dict] = None
    accompagnatori: Optional[List[dict]] = None
    created_at: str

# ==================== UNITS (CASETTE) MODELS ====================

class UnitCreate(BaseModel):
    nome: str  # es. "Casetta 1", "Casetta 2"
    nome_en: Optional[str] = None  # English name
    descrizione: Optional[str] = None
    descrizione_en: Optional[str] = None  # English description
    capacita_max: int = 5
    prezzo_base: float  # Prezzo a notte
    immagine_url: Optional[str] = None
    attivo: bool = True

class UnitResponse(BaseModel):
    id: str
    nome: str
    nome_en: Optional[str] = None
    descrizione: Optional[str] = None
    descrizione_en: Optional[str] = None
    capacita_max: int = 5
    prezzo_base: float
    immagine_url: Optional[str] = None
    attivo: bool = True

# Prezzi speciali per periodo
class PricePeriodCreate(BaseModel):
    unit_id: str
    nome_periodo: str  # es. "Alta Stagione", "Ferragosto", "Capodanno"
    data_inizio: str
    data_fine: str
    prezzo: float  # Prezzo a notte per questo periodo

class PricePeriodCreate(BaseModel):
    """Periodo di prezzo speciale (es. alta stagione, Natale)"""
    unit_id: str
    nome_periodo: str
    data_inizio: str
    data_fine: str
    prezzo_notte: float
    prezzo_weekend: Optional[float] = None  # Prezzo weekend (ven-dom)
    soggiorno_minimo: int = 1

class PricePeriodResponse(BaseModel):
    id: str
    unit_id: str
    nome_periodo: str
    data_inizio: str
    data_fine: str
    prezzo_notte: float
    prezzo_weekend: Optional[float] = None
    soggiorno_minimo: int = 1

class WeekendPricingCreate(BaseModel):
    """Prezzo weekend base per unità"""
    unit_id: str
    prezzo_venerdi: Optional[float] = None
    prezzo_sabato: Optional[float] = None
    prezzo_domenica: Optional[float] = None

class LongStayDiscountCreate(BaseModel):
    """Sconti per soggiorni lunghi"""
    unit_id: str
    giorni_minimo: int  # es. 7
    sconto_percentuale: float  # es. 10 (= 10%)

class LongStayDiscountResponse(BaseModel):
    id: str
    unit_id: str
    giorni_minimo: int
    sconto_percentuale: float

# Blocco date (non disponibilità)
class DateBlockCreate(BaseModel):
    unit_id: str
    data_inizio: str
    data_fine: str
    motivo: Optional[str] = None  # es. "Manutenzione", "Uso personale"

class DateBlockResponse(BaseModel):
    id: str
    unit_id: str
    data_inizio: str
    data_fine: str
    motivo: Optional[str] = None
    source: Optional[str] = None  # "manual", "booking", "airbnb", "ical"

# ==================== iCAL SYNC MODELS ====================

class ICalFeedCreate(BaseModel):
    """Feed iCal esterno da sincronizzare (Booking, Airbnb, etc.)"""
    unit_id: str
    nome: str  # es. "Booking.com", "Airbnb"
    url: str  # URL del feed iCal
    attivo: bool = True

class ICalFeedResponse(BaseModel):
    id: str
    unit_id: str
    nome: str
    url: str
    attivo: bool
    ultima_sincronizzazione: Optional[str] = None
    eventi_importati: int = 0
    created_at: str

class ICalSyncResult(BaseModel):
    feed_id: str
    feed_nome: str
    eventi_trovati: int
    nuovi_blocchi: int
    errore: Optional[str] = None

# Prenotazioni
class BookingCreate(BaseModel):
    unit_id: str
    data_arrivo: str
    data_partenza: str
    num_ospiti: int = Field(ge=1, le=5)
    note: Optional[str] = None
    nome_ospite: str
    email_ospite: EmailStr
    telefono_ospite: str

class AdminBookingCreate(BaseModel):
    """Modello per creazione prenotazione da admin"""
    unit_id: str
    data_arrivo: str
    data_partenza: str
    num_ospiti: int = Field(ge=1, le=5)
    note: Optional[str] = None
    # Per cliente esistente
    guest_id: Optional[str] = None
    # Per nuovo cliente (usati solo se guest_id è None)
    nome_ospite: Optional[str] = None
    email_ospite: Optional[EmailStr] = None
    telefono_ospite: Optional[str] = None
    prezzo_totale: Optional[float] = None  # Admin può impostare prezzo custom
    status: str = "confirmed"  # Admin può creare direttamente confermate

class BookingResponse(BaseModel):
    id: str
    unit_id: str
    unit_nome: Optional[str] = None
    guest_id: Optional[str] = None
    codice_prenotazione: Optional[str] = None  # Codice univoco per check-in
    data_arrivo: str
    data_partenza: str
    num_ospiti: int
    prezzo_totale: float
    status: str = "pending"  # pending, confirmed, cancelled, completed
    note: Optional[str] = None
    nome_ospite: str
    email_ospite: str
    telefono_ospite: str
    created_at: str

class EventCreate(BaseModel):
    titolo: str
    titolo_en: Optional[str] = None
    descrizione: str
    descrizione_en: Optional[str] = None
    data: str  # Data inizio evento
    data_fine: Optional[str] = None  # Data fine evento (opzionale per eventi di un giorno)
    ora: Optional[str] = None
    ora_fine: Optional[str] = None
    luogo: str
    luogo_en: Optional[str] = None
    indirizzo: Optional[str] = None
    immagine_url: Optional[str] = None
    categoria: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    titolo: str
    titolo_en: Optional[str] = None
    descrizione: str
    descrizione_en: Optional[str] = None
    data: str
    data_fine: Optional[str] = None
    ora: Optional[str] = None
    ora_fine: Optional[str] = None
    luogo: str
    luogo_en: Optional[str] = None
    indirizzo: Optional[str] = None
    immagine_url: Optional[str] = None
    categoria: Optional[str] = None
    created_at: str

class StructureCreate(BaseModel):
    nome: str
    tipo: str  # farmacia, banca, atm, museo, parco, ristorante
    indirizzo: str
    telefono: Optional[str] = None
    orari: Optional[str] = None
    descrizione: Optional[str] = None
    latitudine: Optional[float] = None
    longitudine: Optional[float] = None
    immagine_url: Optional[str] = None
    categoria: Optional[str] = None  # cultura, natura, gastronomia, servizi
    distanza: Optional[str] = None  # es. "5 min a piedi"

class ServiceCreate(BaseModel):
    nome: str
    nome_en: Optional[str] = None
    descrizione: str
    descrizione_en: Optional[str] = None
    categoria: str  # spiaggia, comfort, trasporti, esperienze, shop
    prezzo: Optional[float] = None
    gratuito: bool = False
    icona: Optional[str] = None
    immagine_url: Optional[str] = None
    disponibile: bool = True
    tipo_interazione: str = "booking"  # booking, info, shop
    info_extra: Optional[str] = None  # es. password WiFi

class ServiceResponse(BaseModel):
    id: str
    nome: str
    nome_en: Optional[str] = None
    descrizione: str
    descrizione_en: Optional[str] = None
    categoria: str
    prezzo: Optional[float] = None
    gratuito: bool = False
    icona: Optional[str] = None
    immagine_url: Optional[str] = None
    disponibile: bool = True
    tipo_interazione: str = "booking"
    info_extra: Optional[str] = None

# Products for shop/enoteca
class ProductCreate(BaseModel):
    nome: str
    descrizione: Optional[str] = None
    categoria: str  # vino, olio, formaggi, dolci, souvenir
    prezzo: float
    immagine_url: Optional[str] = None
    disponibile: bool = True

class ProductResponse(BaseModel):
    id: str
    nome: str
    descrizione: Optional[str] = None
    categoria: str
    prezzo: float
    immagine_url: Optional[str] = None
    disponibile: bool = True

class OrderItemCreate(BaseModel):
    product_id: str
    quantita: int = 1

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    note: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    guest_id: str
    items: List[dict]
    totale: float
    status: str = "pending"
    note: Optional[str] = None
    created_at: str

# House Rules
class HouseRuleCreate(BaseModel):
    titolo: str
    titolo_en: Optional[str] = None
    contenuto: str
    contenuto_en: Optional[str] = None
    categoria: str  # checkin, checkout, soggiorno, sicurezza
    ordine: int = 0
    attivo: bool = True

class HouseRuleResponse(BaseModel):
    id: str
    titolo: str
    titolo_en: Optional[str] = None
    contenuto: str
    contenuto_en: Optional[str] = None
    categoria: str
    ordine: int = 0
    attivo: bool = True

class ServiceBookingCreate(BaseModel):
    service_id: str
    data_richiesta: str
    ora_richiesta: Optional[str] = None
    note: Optional[str] = None
    num_persone: int = 1

class ServiceBookingResponse(BaseModel):
    id: str
    guest_id: str
    service_id: str
    service_nome: Optional[str] = None
    data_richiesta: str
    ora_richiesta: Optional[str] = None
    note: Optional[str] = None
    num_persone: int = 1
    status: str = "pending"
    created_at: str

class StructureResponse(BaseModel):
    id: str
    nome: str
    tipo: Optional[str] = None
    indirizzo: Optional[str] = None
    telefono: Optional[str] = None
    orari: Optional[str] = None
    descrizione: Optional[str] = None
    latitudine: Optional[float] = None
    longitudine: Optional[float] = None
    immagine_url: Optional[str] = None
    categoria: Optional[str] = None
    distanza: Optional[str] = None

class LoyaltyAdd(BaseModel):
    guest_id: str
    importo_spesa: float

class LoyaltyRedeem(BaseModel):
    punti: int

class LoyaltyTransaction(BaseModel):
    id: str
    guest_id: str
    punti: int
    tipo: str  # guadagno, riscatto
    importo_spesa: Optional[float] = None
    descrizione: Optional[str] = None
    created_at: str

# Premi Fedeltà
class LoyaltyRewardCreate(BaseModel):
    nome: str
    descrizione: str
    punti_richiesti: int
    immagine_url: Optional[str] = None
    categoria: Optional[str] = None  # bevande, esperienze, soggiorni
    disponibile: bool = True
    ordine: int = 0

class LoyaltyRewardResponse(BaseModel):
    id: str
    nome: str
    descrizione: str
    punti_richiesti: int
    immagine_url: Optional[str] = None
    categoria: Optional[str] = None
    disponibile: bool = True
    ordine: int = 0

# Structure Content (Gallery & Amenities)
class GalleryImageCreate(BaseModel):
    titolo: str
    url: str
    descrizione: Optional[str] = None
    ordine: int = 0
    attivo: bool = True

class GalleryImageResponse(BaseModel):
    id: str
    titolo: str
    url: str
    descrizione: Optional[str] = None
    ordine: int = 0
    attivo: bool = True

class AmenityCreate(BaseModel):
    nome: str
    nome_en: Optional[str] = None
    descrizione: str
    descrizione_en: Optional[str] = None
    icona: str  # wifi, car, coffee, sun, waves, tree, etc.
    ordine: int = 0
    attivo: bool = True

class AmenityResponse(BaseModel):
    id: str
    nome: str
    nome_en: Optional[str] = None
    descrizione: str
    descrizione_en: Optional[str] = None
    icona: str
    ordine: int = 0
    attivo: bool = True

# Itinerary Models for weather-based suggestions
class ItineraryCreate(BaseModel):
    nome: str
    descrizione: str
    condizione_meteo: str  # sunny, cloudy, rainy, cold
    categoria: str  # spiaggia, cultura, natura, gastronomia, relax
    luogo: str
    durata: Optional[str] = None  # es. "2-3 ore", "mezza giornata"
    immagine_url: Optional[str] = None
    link_esterno: Optional[str] = None
    ordine: int = 0
    attivo: bool = True

class ItineraryResponse(BaseModel):
    id: str
    nome: str
    descrizione: str
    condizione_meteo: str
    categoria: str
    luogo: str
    durata: Optional[str] = None
    immagine_url: Optional[str] = None
    link_esterno: Optional[str] = None
    ordine: int = 0
    attivo: bool = True

# ==================== NOTIFICATION MODELS ====================

class NotificationCreate(BaseModel):
    titolo: str
    messaggio: str
    tipo: str = "info"  # info, promo, evento, sistema, premio
    destinatario_id: Optional[str] = None  # None = tutti gli ospiti
    link: Optional[str] = None  # Link opzionale per azione

class NotificationResponse(BaseModel):
    id: str
    titolo: str
    messaggio: str
    tipo: str
    destinatario_id: Optional[str] = None
    link: Optional[str] = None
    letto: bool = False
    created_at: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(guest_id: str, is_admin: bool = False) -> str:
    payload = {
        "sub": guest_id,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        guest_id = payload.get("sub")
        if not guest_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        guest = await db.guests.find_one({"id": guest_id}, {"_id": 0})
        if not guest:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return guest
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: GuestCreate):
    existing = await db.guests.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    guest_id = str(uuid.uuid4())
    codice = f"MP-{uuid.uuid4().hex[:8].upper()}"
    
    guest_doc = {
        "id": guest_id,
        "nome": data.nome,
        "cognome": data.cognome,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "telefono": data.telefono,
        "punti_fedelta": 0,
        "is_admin": False,
        "codice_prenotazione": codice,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.guests.insert_one(guest_doc)
    token = create_token(guest_id)
    
    # Send notification email to admin for new registration
    try:
        registration_body = f"""
        <h2 style="color: #C5A059;">🎉 Nuovo Utente Registrato!</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Nome:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{data.nome} {data.cognome}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{data.email}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Telefono:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{data.telefono or 'Non fornito'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Codice:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{codice}</td>
            </tr>
            <tr>
                <td style="padding: 10px;"><strong>Data:</strong></td>
                <td style="padding: 10px;">{datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}</td>
            </tr>
        </table>
        
        <p style="margin-top: 20px; color: #666;">
            Puoi visualizzare tutti gli ospiti nel <a href="https://lamaisonettepaestum.com/admin/guests" style="color: #C5A059;">pannello admin</a>.
        </p>
        """
        await send_notification_email(
            subject=f"👤 Nuovo utente: {data.nome} {data.cognome}",
            body=registration_body
        )
    except Exception as e:
        print(f"⚠️ Failed to send registration notification: {e}")
    
    return {
        "token": token,
        "guest": GuestResponse(
            id=guest_id,
            nome=data.nome,
            cognome=data.cognome,
            email=data.email,
            telefono=data.telefono,
            punti_fedelta=0,
            is_admin=False,
            codice_prenotazione=codice
        )
    }

@api_router.post("/auth/login")
async def login(data: GuestLogin):
    guest = await db.guests.find_one({"email": data.email}, {"_id": 0})
    if not guest or not verify_password(data.password, guest["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(guest["id"], guest.get("is_admin", False))
    
    return {
        "token": token,
        "guest": GuestResponse(
            id=guest["id"],
            nome=guest["nome"],
            cognome=guest["cognome"],
            email=guest["email"],
            telefono=guest.get("telefono"),
            punti_fedelta=guest.get("punti_fedelta", 0),
            is_admin=guest.get("is_admin", False),
            codice_prenotazione=guest.get("codice_prenotazione")
        )
    }

@api_router.post("/auth/login-code")
async def login_with_code(data: GuestLoginCode):
    guest = await db.guests.find_one({"codice_prenotazione": data.codice_prenotazione}, {"_id": 0})
    if not guest:
        raise HTTPException(status_code=401, detail="Codice prenotazione non valido")
    
    token = create_token(guest["id"], guest.get("is_admin", False))
    
    return {
        "token": token,
        "guest": GuestResponse(
            id=guest["id"],
            nome=guest["nome"],
            cognome=guest["cognome"],
            email=guest["email"],
            telefono=guest.get("telefono"),
            punti_fedelta=guest.get("punti_fedelta", 0),
            is_admin=guest.get("is_admin", False),
            codice_prenotazione=guest.get("codice_prenotazione")
        )
    }

@api_router.get("/auth/me", response_model=GuestResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return GuestResponse(
        id=current_user["id"],
        nome=current_user["nome"],
        cognome=current_user["cognome"],
        email=current_user["email"],
        telefono=current_user.get("telefono"),
        punti_fedelta=current_user.get("punti_fedelta", 0),
        is_admin=current_user.get("is_admin", False),
        codice_prenotazione=current_user.get("codice_prenotazione")
    )

# ==================== CHECK-IN ROUTES ====================

@api_router.post("/checkin", response_model=CheckInResponse)
async def create_checkin(data: CheckInCreate, current_user: dict = Depends(get_current_user)):
    """
    Crea un check-in validando la prenotazione.
    Richiede email_prenotazione o codice_prenotazione.
    Verifica che la data di arrivo corrisponda alla prenotazione.
    """
    
    # Deve essere fornito almeno email o codice prenotazione
    if not data.email_prenotazione and not data.codice_prenotazione:
        raise HTTPException(
            status_code=400, 
            detail="Inserisci l'email o il codice della prenotazione"
        )
    
    # Cerca la prenotazione per email o codice
    query = {"status": "confirmed"}  # Solo prenotazioni confermate
    if data.codice_prenotazione:
        query["codice_prenotazione"] = data.codice_prenotazione.upper().strip()
    elif data.email_prenotazione:
        query["email_ospite"] = data.email_prenotazione.lower().strip()
    
    booking = await db.bookings.find_one(query, {"_id": 0})
    
    if not booking:
        raise HTTPException(
            status_code=404, 
            detail="Prenotazione non trovata. Verifica email o codice prenotazione."
        )
    
    # Verifica che la data di arrivo corrisponda
    if booking["data_arrivo"] != data.data_arrivo:
        raise HTTPException(
            status_code=400, 
            detail=f"La data di arrivo non corrisponde alla prenotazione. Data prenotata: {booking['data_arrivo']}"
        )
    
    # Verifica che non ci sia già un check-in per questa prenotazione
    existing_checkin = await db.checkins.find_one({
        "booking_id": booking["id"],
        "status": {"$in": ["pending", "confirmed"]}
    })
    if existing_checkin:
        raise HTTPException(
            status_code=409,
            detail="Esiste già un check-in attivo per questa prenotazione"
        )
    
    checkin_id = str(uuid.uuid4())
    
    checkin_doc = {
        "id": checkin_id,
        "guest_id": current_user["id"],
        "booking_id": booking["id"],
        "codice_prenotazione": booking.get("codice_prenotazione"),
        "data_arrivo": data.data_arrivo,
        "data_partenza": data.data_partenza,
        "num_ospiti": data.num_ospiti,
        "note": data.note,
        "ospite_principale": data.ospite_principale,
        "accompagnatori": data.accompagnatori or [],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.checkins.insert_one(checkin_doc)
    
    # Aggiorna guest_id nella prenotazione se non già associato
    if not booking.get("guest_id"):
        await db.bookings.update_one(
            {"id": booking["id"]},
            {"$set": {"guest_id": current_user["id"]}}
        )
    
    # Send notification email to structure
    ospite_nome = ospitePrincipale.get('nome', '') if (ospitePrincipale := data.ospite_principale) else current_user.get('nome', '')
    ospite_cognome = ospitePrincipale.get('cognome', '') if (ospitePrincipale := data.ospite_principale) else current_user.get('cognome', '')
    
    await send_notification_email(
        subject=f"✅ Nuovo Check-in - {ospite_nome} {ospite_cognome}",
        body=f"""
        <h2>Nuovo check-in effettuato!</h2>
        <p><strong>Ospite:</strong> {ospite_nome} {ospite_cognome}</p>
        <p><strong>Email:</strong> {current_user.get('email', 'N/A')}</p>
        <p><strong>Codice Prenotazione:</strong> {booking.get('codice_prenotazione', 'N/A')}</p>
        <p><strong>Arrivo:</strong> {data.data_arrivo}</p>
        <p><strong>Partenza:</strong> {data.data_partenza}</p>
        <p><strong>Numero ospiti:</strong> {data.num_ospiti}</p>
        {f'<p><strong>Note:</strong> {data.note}</p>' if data.note else ''}
        <br>
        <p>Accedi al pannello admin per verificare i documenti caricati.</p>
        """
    )
    
    return CheckInResponse(**checkin_doc)

@api_router.get("/checkin")
async def get_my_checkins(current_user: dict = Depends(get_current_user)):
    """Get all check-ins for the current user (form + online/validated)"""
    # Get checkins from form submissions
    checkins = await db.checkins.find(
        {"guest_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for c in checkins:
        c["source"] = "form"
    
    # Get online checkins (including manually validated)
    online_checkins = await db.online_checkins.find(
        {"guest_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich online checkins with booking data
    for c in online_checkins:
        c["source"] = "online"
        booking = await db.bookings.find_one({"id": c.get("booking_id")}, {"_id": 0})
        if booking:
            c["data_arrivo"] = booking.get("data_arrivo", "")
            c["data_partenza"] = booking.get("data_partenza", "")
            c["num_ospiti"] = booking.get("num_ospiti", 1)
            c["codice_prenotazione"] = booking.get("codice_prenotazione", "")
            c["note"] = c.get("admin_note", "")
    
    # Combine and sort by created_at
    all_checkins = checkins + online_checkins
    all_checkins.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return all_checkins

@api_router.get("/checkin/active")
async def get_active_checkin(current_user: dict = Depends(get_current_user)):
    # Check in regular checkins
    checkin = await db.checkins.find_one({
        "guest_id": current_user["id"],
        "status": {"$in": ["pending", "confirmed"]}
    }, {"_id": 0})
    if checkin:
        return {"has_active_checkin": True, "checkin": checkin}
    
    # Check in online checkins (including manually validated)
    online_checkin = await db.online_checkins.find_one({
        "guest_id": current_user["id"],
        "status": {"$in": ["pending", "completed"]}
    }, {"_id": 0})
    if online_checkin:
        return {"has_active_checkin": True, "checkin": online_checkin}
    
    return {"has_active_checkin": False, "checkin": None}

@api_router.get("/checkin/{checkin_id}", response_model=CheckInResponse)
async def get_checkin(checkin_id: str, current_user: dict = Depends(get_current_user)):
    checkin = await db.checkins.find_one(
        {"id": checkin_id, "guest_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in non trovato")
    return checkin

# ==================== UPLOAD ROUTES ====================

@api_router.post("/upload/document")
async def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a document image (ID card front/back)"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo file non supportato. Usa JPG, PNG, WEBP o PDF")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante il salvataggio: {str(e)}")
    
    # Return URL - use APP_URL if available for full URL
    app_url = os.environ.get('APP_URL', '')
    if app_url:
        file_url = f"{app_url}/uploads/{unique_filename}"
    else:
        file_url = f"/uploads/{unique_filename}"
    
    return {
        "url": file_url,
        "filename": unique_filename,
        "content_type": file.content_type
    }

# ==================== MEDIA BOX ROUTES ====================

@api_router.post("/admin/media/upload")
async def admin_upload_media(
    file: UploadFile = File(...), 
    nome: str = None,
    admin: dict = Depends(get_admin_user)
):
    """Upload media file to library"""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo file non supportato. Usa JPG, PNG, WEBP o GIF")
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    try:
        # Use chunked reading for larger files
        contents = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante il salvataggio: {str(e)}")
    
    # Use /api/uploads/ path for correct routing through ingress
    file_url = f"/api/uploads/{unique_filename}"
    
    # Save to database
    media_doc = {
        "id": str(uuid.uuid4()),
        "nome": nome or file.filename,
        "filename": unique_filename,
        "url": file_url,
        "content_type": file.content_type,
        "size": len(contents),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.media.insert_one(media_doc)
    
    # Return without _id
    media_doc.pop("_id", None)
    return media_doc

@api_router.get("/admin/media")
async def admin_get_media(admin: dict = Depends(get_admin_user)):
    """Get all media files"""
    media = await db.media.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return media

@api_router.delete("/admin/media/{media_id}")
async def admin_delete_media(media_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a media file"""
    media = await db.media.find_one({"id": media_id}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media non trovato")
    
    # Delete file from disk
    file_path = UPLOADS_DIR / media["filename"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.media.delete_one({"id": media_id})
    return {"message": "Media eliminato"}

# ==================== EVENTS ROUTES ====================

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(include_past: bool = False):
    """Get events. By default, only returns current and future events."""
    today = datetime.now().strftime("%Y-%m-%d")
    
    if include_past:
        # Return all events
        events = await db.events.find({}, {"_id": 0}).sort("data", 1).to_list(100)
    else:
        # Filter out past events
        # An event is not past if:
        # - data_fine >= today (if data_fine exists)
        # - OR data >= today (if no data_fine, use data as end date)
        events = await db.events.find({
            "$or": [
                {"data_fine": {"$gte": today}},
                {"data_fine": None, "data": {"$gte": today}},
                {"data_fine": {"$exists": False}, "data": {"$gte": today}}
            ]
        }, {"_id": 0}).sort("data", 1).to_list(100)
    
    return events

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    return event

# ==================== STRUCTURES ROUTES ====================

@api_router.get("/structures", response_model=List[StructureResponse])
async def get_structures(tipo: Optional[str] = None):
    query = {}
    if tipo:
        query["tipo"] = tipo
    structures = await db.structures.find(query, {"_id": 0}).to_list(200)
    return structures

@api_router.get("/structures/{structure_id}", response_model=StructureResponse)
async def get_structure(structure_id: str):
    structure = await db.structures.find_one({"id": structure_id}, {"_id": 0})
    if not structure:
        raise HTTPException(status_code=404, detail="Struttura non trovata")
    return structure

# ==================== GOOGLE PLACES SCRAPING ====================

import math

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two points using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return round(R * c, 2)

def format_distance(km):
    """Format distance for display"""
    if km < 1:
        return f"{int(km * 1000)} m"
    return f"{km:.1f} km"

# Mapping Google Place types to our categories
PLACE_TYPE_MAPPING = {
    "restaurant": {"tipo": "Ristorante", "icon": "🍽️"},
    "pizzeria": {"tipo": "Pizzeria", "icon": "🍕"},
    "bar": {"tipo": "Bar", "icon": "☕"},
    "cafe": {"tipo": "Bar", "icon": "☕"},
    "pharmacy": {"tipo": "Farmacia", "icon": "💊"},
    "hospital": {"tipo": "Ospedale", "icon": "🏥"},
    "doctor": {"tipo": "Medico", "icon": "👨‍⚕️"},
    "atm": {"tipo": "Bancomat", "icon": "🏧"},
    "bank": {"tipo": "Banca", "icon": "🏦"},
    "gas_station": {"tipo": "Benzina", "icon": "⛽"},
    "supermarket": {"tipo": "Supermercato", "icon": "🛒"},
    "grocery_or_supermarket": {"tipo": "Supermercato", "icon": "🛒"},
    "bakery": {"tipo": "Panificio", "icon": "🥖"},
    "beach": {"tipo": "Spiaggia", "icon": "🏖️"},
    "museum": {"tipo": "Museo", "icon": "🏛️"},
    "tourist_attraction": {"tipo": "Attrazione", "icon": "📸"},
    "lodging": {"tipo": "Alloggio", "icon": "🏨"},
    "store": {"tipo": "Negozio", "icon": "🏪"},
    "food": {"tipo": "Alimentari", "icon": "🍴"},
}

@api_router.post("/admin/places/search")
async def search_google_places(
    place_type: str,
    radius: int = 5000,
    max_results: int = 60,
    admin: dict = Depends(get_admin_user)
):
    """Search Google Places API for nearby places with pagination"""
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=500, detail="Google Places API key non configurata")
    
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{MAISONETTE_LAT},{MAISONETTE_LON}",
        "radius": radius,
        "type": place_type,
        "key": GOOGLE_PLACES_API_KEY,
        "language": "it"
    }
    
    all_results = []
    next_page_token = None
    
    async with httpx.AsyncClient() as client:
        # Fetch up to 3 pages (60 results max)
        for page in range(3):
            if page > 0 and next_page_token:
                # Wait before requesting next page (Google requires delay)
                import asyncio
                await asyncio.sleep(2)
                params["pagetoken"] = next_page_token
            
            response = await client.get(url, params=params)
            data = response.json()
            
            if data.get("status") not in ["OK", "ZERO_RESULTS"]:
                if page == 0:
                    raise HTTPException(status_code=500, detail=f"Google API error: {data.get('status')}")
                break
            
            all_results.extend(data.get("results", []))
            
            next_page_token = data.get("next_page_token")
            if not next_page_token or len(all_results) >= max_results:
                break
    
    places = []
    for place in all_results[:max_results]:
        lat = place["geometry"]["location"]["lat"]
        lng = place["geometry"]["location"]["lng"]
        distance_km = calculate_distance(MAISONETTE_LAT, MAISONETTE_LON, lat, lng)
        
        type_info = PLACE_TYPE_MAPPING.get(place_type, {"tipo": place_type.replace("_", " ").title(), "icon": "📍"})
        
        places.append({
            "place_id": place.get("place_id"),
            "nome": place.get("name"),
            "indirizzo": place.get("vicinity", ""),
            "tipo": type_info["tipo"],
            "icon": type_info["icon"],
            "lat": lat,
            "lng": lng,
            "distanza_km": distance_km,
            "distanza_display": format_distance(distance_km),
            "rating": place.get("rating"),
            "total_ratings": place.get("user_ratings_total", 0),
            "open_now": place.get("opening_hours", {}).get("open_now"),
            "photo_reference": place.get("photos", [{}])[0].get("photo_reference") if place.get("photos") else None
        })
    
    # Sort by distance
    places.sort(key=lambda x: x["distanza_km"])
    
    return places

@api_router.post("/admin/places/import")
async def import_places_to_structures(
    places: List[dict],
    admin: dict = Depends(get_admin_user)
):
    """Import selected places to structures database"""
    imported = 0
    
    for place in places:
        # Check if already exists
        existing = await db.structures.find_one({
            "$or": [
                {"google_place_id": place.get("place_id")},
                {"nome": place.get("nome"), "tipo": place.get("tipo")}
            ]
        })
        
        if existing:
            continue
        
        # Get photo URL if available
        photo_url = None
        if place.get("photo_reference") and GOOGLE_PLACES_API_KEY:
            photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={place['photo_reference']}&key={GOOGLE_PLACES_API_KEY}"
        
        structure_doc = {
            "id": str(uuid.uuid4()),
            "nome": place.get("nome"),
            "tipo": place.get("tipo"),
            "descrizione": f"{place.get('icon', '📍')} {place.get('tipo')} a {place.get('distanza_display')} dalla struttura",
            "indirizzo": place.get("indirizzo", "Capaccio Paestum"),
            "distanza": place.get("distanza_display"),
            "distanza_km": place.get("distanza_km"),
            "lat": place.get("lat"),
            "lng": place.get("lng"),
            "google_place_id": place.get("place_id"),
            "rating": place.get("rating"),
            "immagine_url": photo_url,
            "link": f"https://www.google.com/maps/place/?q=place_id:{place.get('place_id')}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.structures.insert_one(structure_doc)
        imported += 1
    
    return {"message": f"Importati {imported} luoghi", "imported": imported}

@api_router.post("/admin/places/scan-all")
async def scan_all_places(
    radius: int = 5000,
    admin: dict = Depends(get_admin_user)
):
    """Scan multiple categories at once with pagination"""
    import asyncio
    
    categories = [
        "restaurant", "pharmacy", "atm", "bank", "gas_station", 
        "supermarket", "bakery", "doctor", "hospital", "bar", "cafe"
    ]
    
    all_places = []
    
    async with httpx.AsyncClient() as client:
        for cat in categories:
            try:
                url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    "location": f"{MAISONETTE_LAT},{MAISONETTE_LON}",
                    "radius": radius,
                    "type": cat,
                    "key": GOOGLE_PLACES_API_KEY,
                    "language": "it"
                }
                
                # Fetch up to 2 pages per category (40 results)
                next_page_token = None
                for page in range(2):
                    if page > 0 and next_page_token:
                        await asyncio.sleep(2)
                        params["pagetoken"] = next_page_token
                    
                    response = await client.get(url, params=params)
                    data = response.json()
                    
                    if data.get("status") == "OK":
                        for place in data.get("results", []):
                            lat = place["geometry"]["location"]["lat"]
                            lng = place["geometry"]["location"]["lng"]
                            distance_km = calculate_distance(MAISONETTE_LAT, MAISONETTE_LON, lat, lng)
                            
                            type_info = PLACE_TYPE_MAPPING.get(cat, {"tipo": cat.replace("_", " ").title(), "icon": "📍"})
                            
                            all_places.append({
                                "place_id": place.get("place_id"),
                                "nome": place.get("name"),
                                "indirizzo": place.get("vicinity", ""),
                                "tipo": type_info["tipo"],
                                "icon": type_info["icon"],
                                "lat": lat,
                                "lng": lng,
                                "distanza_km": distance_km,
                                "distanza_display": format_distance(distance_km),
                                "rating": place.get("rating"),
                                "total_ratings": place.get("user_ratings_total", 0),
                                "photo_reference": place.get("photos", [{}])[0].get("photo_reference") if place.get("photos") else None
                            })
                    
                    next_page_token = data.get("next_page_token")
                    if not next_page_token:
                        break
                        
            except Exception as e:
                logging.error(f"Error scanning {cat}: {e}")
                continue
    
    # Remove duplicates and sort
    seen = set()
    unique_places = []
    for p in all_places:
        if p["place_id"] not in seen:
            seen.add(p["place_id"])
            unique_places.append(p)
    
    unique_places.sort(key=lambda x: x["distanza_km"])
    
    return {"places": unique_places, "total": len(unique_places)}

# ==================== SERVICES ROUTES ====================

@api_router.get("/services", response_model=List[ServiceResponse])
async def get_services(categoria: Optional[str] = None):
    query = {"disponibile": True}
    if categoria:
        query["categoria"] = categoria
    services = await db.services.find(query, {"_id": 0}).to_list(100)
    return services

@api_router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    return service

# ==================== PRODUCTS ROUTES ====================

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(categoria: Optional[str] = None):
    query = {"disponibile": True}
    if categoria:
        query["categoria"] = categoria
    products = await db.products.find(query, {"_id": 0}).to_list(200)
    return products

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return product

# ==================== ORDERS ROUTES ====================

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(data: OrderCreate, current_user: dict = Depends(get_current_user)):
    # Check active checkin
    active_checkin = await db.checkins.find_one({
        "guest_id": current_user["id"],
        "status": {"$in": ["pending", "confirmed"]}
    })
    if not active_checkin:
        raise HTTPException(status_code=403, detail="Devi avere un check-in attivo per ordinare")
    
    # Build order items with product details
    order_items = []
    totale = 0.0
    
    for item in data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Prodotto {item.product_id} non trovato")
        
        item_total = product["prezzo"] * item.quantita
        order_items.append({
            "product_id": product["id"],
            "nome": product["nome"],
            "prezzo_unitario": product["prezzo"],
            "quantita": item.quantita,
            "subtotale": item_total
        })
        totale += item_total
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "guest_id": current_user["id"],
        "items": order_items,
        "totale": totale,
        "status": "pending",
        "note": data.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    return OrderResponse(**order_doc)

@api_router.get("/orders/my", response_model=List[OrderResponse])
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"guest_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

# ==================== GALLERY & AMENITIES ROUTES ====================

@api_router.get("/gallery", response_model=List[GalleryImageResponse])
async def get_gallery():
    """Get all active gallery images"""
    images = await db.gallery.find({"attivo": True}, {"_id": 0}).sort("ordine", 1).to_list(50)
    return images

@api_router.get("/amenities", response_model=List[AmenityResponse])
async def get_amenities():
    """Get all active amenities"""
    amenities = await db.amenities.find({"attivo": True}, {"_id": 0}).sort("ordine", 1).to_list(50)
    return amenities

# ==================== HOUSE RULES ROUTES ====================

@api_router.get("/house-rules", response_model=List[HouseRuleResponse])
async def get_house_rules():
    rules = await db.house_rules.find(
        {"attivo": True}, 
        {"_id": 0}
    ).sort("ordine", 1).to_list(100)
    return rules

# Service Booking
@api_router.post("/services/book", response_model=ServiceBookingResponse)
async def book_service(data: ServiceBookingCreate, current_user: dict = Depends(get_current_user)):
    # Check if user has active check-in
    active_checkin = await db.checkins.find_one({
        "guest_id": current_user["id"],
        "status": {"$in": ["pending", "confirmed"]}
    })
    if not active_checkin:
        raise HTTPException(status_code=403, detail="Devi avere un check-in attivo per prenotare servizi")
    
    # Get service name
    service = await db.services.find_one({"id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "guest_id": current_user["id"],
        "service_id": data.service_id,
        "service_nome": service["nome"],
        "data_richiesta": data.data_richiesta,
        "ora_richiesta": data.ora_richiesta,
        "note": data.note,
        "num_persone": data.num_persone,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.service_bookings.insert_one(booking_doc)
    return ServiceBookingResponse(**booking_doc)

@api_router.get("/services/bookings/my", response_model=List[ServiceBookingResponse])
async def get_my_service_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.service_bookings.find(
        {"guest_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return bookings

# ==================== LOYALTY ROUTES ====================

@api_router.get("/loyalty/points")
async def get_my_points(current_user: dict = Depends(get_current_user)):
    return {
        "punti": current_user.get("punti_fedelta", 0),
        "notti_omaggio_disponibili": current_user.get("punti_fedelta", 0) // 100
    }

@api_router.get("/loyalty/transactions", response_model=List[LoyaltyTransaction])
async def get_my_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.loyalty_transactions.find(
        {"guest_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return transactions

@api_router.post("/loyalty/redeem")
async def redeem_points(data: LoyaltyRedeem, current_user: dict = Depends(get_current_user)):
    if data.punti < 100:
        raise HTTPException(status_code=400, detail="Minimo 100 punti per il riscatto")
    
    if current_user.get("punti_fedelta", 0) < data.punti:
        raise HTTPException(status_code=400, detail="Punti insufficienti")
    
    notti = data.punti // 100
    punti_usati = notti * 100
    
    # Update guest points
    await db.guests.update_one(
        {"id": current_user["id"]},
        {"$inc": {"punti_fedelta": -punti_usati}}
    )
    
    # Create transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "guest_id": current_user["id"],
        "punti": -punti_usati,
        "tipo": "riscatto",
        "descrizione": f"Riscatto {notti} notte/i omaggio",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty_transactions.insert_one(transaction)
    
    return {
        "message": f"Riscattate {notti} notte/i omaggio",
        "punti_rimanenti": current_user.get("punti_fedelta", 0) - punti_usati
    }

# ==================== LOYALTY REWARDS ROUTES ====================

@api_router.get("/loyalty/rewards", response_model=List[LoyaltyRewardResponse])
async def get_loyalty_rewards():
    """Get all available loyalty rewards"""
    rewards = await db.loyalty_rewards.find(
        {"disponibile": True}, 
        {"_id": 0}
    ).sort("ordine", 1).to_list(100)
    return rewards

@api_router.post("/loyalty/redeem-reward")
async def redeem_reward(reward_id: str, current_user: dict = Depends(get_current_user)):
    """Redeem a specific reward"""
    reward = await db.loyalty_rewards.find_one({"id": reward_id, "disponibile": True})
    if not reward:
        raise HTTPException(status_code=404, detail="Premio non trovato o non disponibile")
    
    if current_user.get("punti_fedelta", 0) < reward["punti_richiesti"]:
        raise HTTPException(status_code=400, detail="Punti insufficienti")
    
    # Update guest points
    await db.guests.update_one(
        {"id": current_user["id"]},
        {"$inc": {"punti_fedelta": -reward["punti_richiesti"]}}
    )
    
    # Create transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "guest_id": current_user["id"],
        "punti": -reward["punti_richiesti"],
        "tipo": "riscatto",
        "descrizione": f"Riscatto premio: {reward['nome']}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty_transactions.insert_one(transaction)
    
    # Create notification for the user
    notification = {
        "id": str(uuid.uuid4()),
        "titolo": "🎉 Premio Riscattato!",
        "messaggio": f"Hai riscattato '{reward['nome']}' con successo! Presenta questa notifica allo staff per ritirare il tuo premio.",
        "tipo": "premio",
        "destinatario_id": current_user["id"],
        "link": "/loyalty",
        "letto": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Also notify admin about the redemption
    admin_notification = {
        "id": str(uuid.uuid4()),
        "titolo": "Nuovo Premio Riscattato",
        "messaggio": f"{current_user.get('nome', 'Ospite')} {current_user.get('cognome', '')} ha riscattato: {reward['nome']}",
        "tipo": "sistema",
        "destinatario_id": None,  # Will be filtered for admin only in a real scenario
        "link": "/admin/loyalty-rewards",
        "letto": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    # Store in a separate admin notifications collection or filter by type
    await db.admin_notifications.insert_one(admin_notification)
    
    return {
        "message": f"Premio '{reward['nome']}' riscattato con successo!",
        "punti_rimanenti": current_user.get("punti_fedelta", 0) - reward["punti_richiesti"],
        "premio": reward["nome"]
    }

# ==================== NOTIFICATION ROUTES ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    """Get notifications for current user (personal + broadcast)"""
    notifications = await db.notifications.find({
        "$or": [
            {"destinatario_id": current_user["id"]},
            {"destinatario_id": None}  # Broadcast notifications
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Get read status for this user
    read_ids = await db.notification_reads.find(
        {"user_id": current_user["id"]},
        {"notification_id": 1}
    ).to_list(1000)
    read_set = {r["notification_id"] for r in read_ids}
    
    # Mark notifications as read or not
    for notif in notifications:
        notif["letto"] = notif["id"] in read_set
    
    return notifications

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    # Get all notification IDs for this user
    all_notifications = await db.notifications.find({
        "$or": [
            {"destinatario_id": current_user["id"]},
            {"destinatario_id": None}
        ]
    }, {"id": 1}).to_list(1000)
    all_ids = {n["id"] for n in all_notifications}
    
    # Get read notification IDs
    read_ids = await db.notification_reads.find(
        {"user_id": current_user["id"]},
        {"notification_id": 1}
    ).to_list(1000)
    read_set = {r["notification_id"] for r in read_ids}
    
    unread_count = len(all_ids - read_set)
    return {"count": unread_count}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    # Check if notification exists
    notif = await db.notifications.find_one({"id": notification_id})
    if not notif:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    
    # Add to reads (upsert to avoid duplicates)
    await db.notification_reads.update_one(
        {"user_id": current_user["id"], "notification_id": notification_id},
        {"$set": {"user_id": current_user["id"], "notification_id": notification_id, "read_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Notifica segnata come letta"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    notifications = await db.notifications.find({
        "$or": [
            {"destinatario_id": current_user["id"]},
            {"destinatario_id": None}
        ]
    }, {"id": 1}).to_list(1000)
    
    for notif in notifications:
        await db.notification_reads.update_one(
            {"user_id": current_user["id"], "notification_id": notif["id"]},
            {"$set": {"user_id": current_user["id"], "notification_id": notif["id"], "read_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
    
    return {"message": "Tutte le notifiche segnate come lette"}

# ==================== WEATHER ROUTES ====================

@api_router.get("/weather")
async def get_weather():
    """Get current weather for Capaccio Paestum"""
    if not OPENWEATHERMAP_API_KEY:
        raise HTTPException(status_code=500, detail="API key meteo non configurata")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": CAPACCIO_PAESTUM_LAT,
                    "lon": CAPACCIO_PAESTUM_LON,
                    "appid": OPENWEATHERMAP_API_KEY,
                    "units": "metric",
                    "lang": "it"
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Determine weather condition for itineraries
            weather_id = data["weather"][0]["id"]
            temp = data["main"]["temp"]
            
            # Map weather codes to our conditions
            if weather_id >= 200 and weather_id < 600:  # Thunderstorm, Drizzle, Rain
                condition = "rainy"
            elif weather_id >= 600 and weather_id < 700:  # Snow
                condition = "cold"
            elif weather_id >= 700 and weather_id < 800:  # Atmosphere (fog, mist)
                condition = "cloudy"
            elif weather_id == 800:  # Clear
                condition = "sunny"
            else:  # Clouds
                condition = "cloudy"
            
            # Override based on temperature
            if temp < 10:
                condition = "cold"
            
            return {
                "temperatura": round(data["main"]["temp"]),
                "temperatura_percepita": round(data["main"]["feels_like"]),
                "umidita": data["main"]["humidity"],
                "descrizione": data["weather"][0]["description"].capitalize(),
                "icona": data["weather"][0]["icon"],
                "vento": round(data["wind"]["speed"] * 3.6),  # Convert m/s to km/h
                "condizione": condition,
                "localita": "Capaccio Paestum"
            }
    except httpx.HTTPError as e:
        logging.error(f"Weather API error: {e}")
        raise HTTPException(status_code=503, detail="Servizio meteo non disponibile")

@api_router.get("/weather/forecast")
async def get_weather_forecast():
    """Get 5-day weather forecast for Capaccio Paestum"""
    if not OPENWEATHERMAP_API_KEY:
        raise HTTPException(status_code=500, detail="API key meteo non configurata")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": CAPACCIO_PAESTUM_LAT,
                    "lon": CAPACCIO_PAESTUM_LON,
                    "appid": OPENWEATHERMAP_API_KEY,
                    "units": "metric",
                    "lang": "it",
                    "cnt": 40  # 5 days * 8 (3-hour intervals)
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Group by day and get daily summary
            daily_forecast = {}
            for item in data["list"]:
                date = item["dt_txt"].split(" ")[0]
                if date not in daily_forecast:
                    daily_forecast[date] = {
                        "data": date,
                        "temp_min": item["main"]["temp_min"],
                        "temp_max": item["main"]["temp_max"],
                        "descrizione": item["weather"][0]["description"],
                        "icona": item["weather"][0]["icon"]
                    }
                else:
                    daily_forecast[date]["temp_min"] = min(daily_forecast[date]["temp_min"], item["main"]["temp_min"])
                    daily_forecast[date]["temp_max"] = max(daily_forecast[date]["temp_max"], item["main"]["temp_max"])
            
            return list(daily_forecast.values())[:5]
    except httpx.HTTPError as e:
        logging.error(f"Weather forecast API error: {e}")
        raise HTTPException(status_code=503, detail="Servizio previsioni non disponibile")

# ==================== ITINERARIES ROUTES ====================

@api_router.get("/itineraries", response_model=List[ItineraryResponse])
async def get_itineraries(condizione_meteo: Optional[str] = None, categoria: Optional[str] = None):
    """Get itineraries, optionally filtered by weather condition or category"""
    query = {"attivo": True}
    if condizione_meteo:
        query["condizione_meteo"] = condizione_meteo
    if categoria:
        query["categoria"] = categoria
    
    itineraries = await db.itineraries.find(query, {"_id": 0}).sort("ordine", 1).to_list(100)
    return itineraries

@api_router.get("/itineraries/suggested")
async def get_suggested_itineraries():
    """Get itineraries suggested based on current weather"""
    try:
        # Get current weather
        weather = await get_weather()
        condition = weather["condizione"]
        
        # Get itineraries for this condition
        itineraries = await db.itineraries.find(
            {"attivo": True, "condizione_meteo": condition},
            {"_id": 0}
        ).sort("ordine", 1).to_list(10)
        
        return {
            "meteo": weather,
            "itinerari_suggeriti": itineraries
        }
    except HTTPException:
        # If weather fails, return all itineraries
        itineraries = await db.itineraries.find({"attivo": True}, {"_id": 0}).sort("ordine", 1).to_list(10)
        return {
            "meteo": None,
            "itinerari_suggeriti": itineraries
        }

# ==================== UNITS (CASETTE) ROUTES ====================

@api_router.delete("/admin/reset-units")
async def reset_all_units(admin: dict = Depends(get_admin_user)):
    """Delete ALL units and related data (bookings, blocks, feeds, price_periods)"""
    # Delete all related data
    await db.bookings.delete_many({})
    await db.date_blocks.delete_many({})
    await db.ical_feeds.delete_many({})
    await db.price_periods.delete_many({})
    await db.units.delete_many({})
    
    return {
        "message": "Tutte le casette e i dati correlati sono stati eliminati",
        "deleted": {
            "units": "all",
            "bookings": "all", 
            "date_blocks": "all",
            "ical_feeds": "all",
            "price_periods": "all"
        }
    }

@api_router.get("/units", response_model=List[UnitResponse])
async def get_units():
    """Get all active units"""
    units = await db.units.find({"attivo": True}, {"_id": 0}).to_list(10)
    return units

@api_router.get("/units/{unit_id}", response_model=UnitResponse)
async def get_unit(unit_id: str):
    unit = await db.units.find_one({"id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    return unit

@api_router.get("/units/{unit_id}/availability")
async def get_unit_availability(unit_id: str, month: Optional[str] = None):
    """Get availability for a unit. Month format: YYYY-MM"""
    unit = await db.units.find_one({"id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    # Get all bookings for this unit
    bookings = await db.bookings.find({
        "unit_id": unit_id,
        "status": {"$in": ["pending", "confirmed"]}
    }, {"_id": 0}).to_list(500)
    
    # Get all date blocks
    blocks = await db.date_blocks.find({"unit_id": unit_id}, {"_id": 0}).to_list(100)
    
    # Get price periods
    price_periods = await db.price_periods.find({"unit_id": unit_id}, {"_id": 0}).to_list(100)
    
    return {
        "unit": unit,
        "bookings": bookings,
        "blocks": blocks,
        "price_periods": price_periods
    }

@api_router.get("/units/{unit_id}/price")
async def get_unit_price(unit_id: str, data_arrivo: str, data_partenza: str):
    """Calculate price for a date range"""
    unit = await db.units.find_one({"id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    # Parse dates
    from datetime import datetime as dt
    arrivo = dt.strptime(data_arrivo, "%Y-%m-%d")
    partenza = dt.strptime(data_partenza, "%Y-%m-%d")
    num_notti = (partenza - arrivo).days
    
    if num_notti <= 0:
        raise HTTPException(status_code=400, detail="Date non valide")
    
    # Get price periods
    price_periods = await db.price_periods.find({"unit_id": unit_id}, {"_id": 0}).to_list(100)
    
    # Get long stay discounts
    discounts = await db.discounts.find({"unit_id": unit_id}, {"_id": 0}).sort("giorni_minimo", -1).to_list(100)
    
    # Get weekend price from unit
    prezzo_weekend = unit.get("prezzo_weekend")
    
    # Calculate total price
    total = 0.0
    current_date = arrivo
    dettaglio_prezzi = []
    
    while current_date < partenza:
        date_str = current_date.strftime("%Y-%m-%d")
        day_of_week = current_date.weekday()  # 0=Mon, 4=Fri, 5=Sat, 6=Sun
        is_weekend = day_of_week >= 4  # Fri, Sat, Sun
        
        # Check if date falls in a special price period
        prezzo_notte = unit["prezzo_base"]
        periodo_nome = "Tariffa Base"
        
        for period in price_periods:
            if period["data_inizio"] <= date_str <= period["data_fine"]:
                prezzo_notte = period.get("prezzo_notte", period.get("prezzo", unit["prezzo_base"]))
                periodo_nome = period["nome_periodo"]
                # Check if period has weekend price
                if is_weekend and period.get("prezzo_weekend"):
                    prezzo_notte = period["prezzo_weekend"]
                    periodo_nome += " (Weekend)"
                break
        else:
            # No special period - check unit weekend price
            if is_weekend and prezzo_weekend:
                prezzo_notte = prezzo_weekend
                periodo_nome = "Tariffa Weekend"
        
        total += prezzo_notte
        dettaglio_prezzi.append({
            "data": date_str,
            "prezzo": prezzo_notte,
            "periodo": periodo_nome,
            "is_weekend": is_weekend
        })
        
        current_date += timedelta(days=1)
    
    # Apply long stay discount
    sconto_applicato = None
    sconto_percentuale = 0
    for discount in discounts:
        if num_notti >= discount["giorni_minimo"]:
            sconto_percentuale = discount["sconto_percentuale"]
            sconto_applicato = f"Sconto {discount['giorni_minimo']}+ notti"
            break
    
    prezzo_scontato = total
    if sconto_percentuale > 0:
        prezzo_scontato = total * (1 - sconto_percentuale / 100)
    
    return {
        "unit_id": unit_id,
        "data_arrivo": data_arrivo,
        "data_partenza": data_partenza,
        "num_notti": num_notti,
        "prezzo_base_totale": total,
        "sconto_percentuale": sconto_percentuale,
        "sconto_applicato": sconto_applicato,
        "prezzo_totale": round(prezzo_scontato, 2),
        "dettaglio": dettaglio_prezzi
    }

# ==================== BOOKINGS ROUTES ====================

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(data: BookingCreate):
    """Create a new booking request (status: pending)"""
    unit = await db.units.find_one({"id": data.unit_id, "attivo": True}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata o non attiva")
    
    # Check if dates are available
    from datetime import datetime as dt
    arrivo = dt.strptime(data.data_arrivo, "%Y-%m-%d")
    partenza = dt.strptime(data.data_partenza, "%Y-%m-%d")
    
    if arrivo >= partenza:
        raise HTTPException(status_code=400, detail="La data di partenza deve essere successiva all'arrivo")
    
    if data.num_ospiti > unit["capacita_max"]:
        raise HTTPException(status_code=400, detail=f"Capacità massima: {unit['capacita_max']} ospiti")
    
    # Check for conflicting bookings
    existing = await db.bookings.find_one({
        "unit_id": data.unit_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"data_arrivo": {"$lt": data.data_partenza}, "data_partenza": {"$gt": data.data_arrivo}}
        ]
    })
    if existing:
        raise HTTPException(status_code=409, detail="Date non disponibili - già prenotato")
    
    # Check for date blocks
    block = await db.date_blocks.find_one({
        "unit_id": data.unit_id,
        "$or": [
            {"data_inizio": {"$lt": data.data_partenza}, "data_fine": {"$gt": data.data_arrivo}}
        ]
    })
    if block:
        raise HTTPException(status_code=409, detail=f"Date non disponibili - {block.get('motivo', 'Bloccate')}")
    
    # Calculate price
    price_response = await get_unit_price(data.unit_id, data.data_arrivo, data.data_partenza)
    prezzo_totale = price_response["prezzo_totale"]
    
    booking_id = str(uuid.uuid4())
    codice_prenotazione = generate_booking_code()
    
    # Assicurati che il codice sia univoco
    while await db.bookings.find_one({"codice_prenotazione": codice_prenotazione}):
        codice_prenotazione = generate_booking_code()
    
    booking_doc = {
        "id": booking_id,
        "unit_id": data.unit_id,
        "guest_id": None,  # Will be linked after guest registers/logs in
        "codice_prenotazione": codice_prenotazione,
        "data_arrivo": data.data_arrivo,
        "data_partenza": data.data_partenza,
        "num_ospiti": data.num_ospiti,
        "prezzo_totale": prezzo_totale,
        "status": "pending",
        "note": data.note,
        "nome_ospite": data.nome_ospite,
        "email_ospite": data.email_ospite,
        "telefono_ospite": data.telefono_ospite,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    booking_doc["unit_nome"] = unit["nome"]
    
    # Send notification email to structure
    await send_notification_email(
        subject=f"🏠 Nuova Prenotazione - {data.nome_ospite}",
        body=f"""
        <h2>Nuova richiesta di prenotazione!</h2>
        <p><strong>Ospite:</strong> {data.nome_ospite}</p>
        <p><strong>Email:</strong> {data.email_ospite}</p>
        <p><strong>Telefono:</strong> {data.telefono_ospite}</p>
        <p><strong>Casetta:</strong> {unit['nome']}</p>
        <p><strong>Arrivo:</strong> {data.data_arrivo}</p>
        <p><strong>Partenza:</strong> {data.data_partenza}</p>
        <p><strong>Ospiti:</strong> {data.num_ospiti}</p>
        <p><strong>Totale:</strong> €{prezzo_totale}</p>
        <p><strong>Codice:</strong> {codice_prenotazione}</p>
        {f'<p><strong>Note:</strong> {data.note}</p>' if data.note else ''}
        <br>
        <p>Accedi al pannello admin per confermare o rifiutare la prenotazione.</p>
        """
    )
    
    return BookingResponse(**booking_doc)

@api_router.get("/bookings/check-availability")
async def check_availability(unit_id: str, data_arrivo: str, data_partenza: str):
    """Check if dates are available for booking"""
    unit = await db.units.find_one({"id": unit_id, "attivo": True}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    # Check for conflicting bookings
    existing = await db.bookings.find_one({
        "unit_id": unit_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"data_arrivo": {"$lt": data_partenza}, "data_partenza": {"$gt": data_arrivo}}
        ]
    })
    
    # Check for date blocks
    block = await db.date_blocks.find_one({
        "unit_id": unit_id,
        "$or": [
            {"data_inizio": {"$lt": data_partenza}, "data_fine": {"$gt": data_arrivo}}
        ]
    })
    
    is_available = existing is None and block is None
    
    # Get price if available
    price_info = None
    if is_available:
        price_info = await get_unit_price(unit_id, data_arrivo, data_partenza)
    
    return {
        "disponibile": is_available,
        "motivo": None if is_available else ("Già prenotato" if existing else "Date bloccate"),
        "prezzo": price_info
    }

@api_router.get("/bookings/my", response_model=List[BookingResponse])
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    """Get bookings for current user"""
    bookings = await db.bookings.find({
        "$or": [
            {"guest_id": current_user["id"]},
            {"email_ospite": current_user["email"]}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with unit name
    for booking in bookings:
        unit = await db.units.find_one({"id": booking["unit_id"]}, {"_id": 0, "nome": 1})
        if unit:
            booking["unit_nome"] = unit["nome"]
    
    return bookings

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/badges")
async def admin_get_badges(admin: dict = Depends(get_admin_user)):
    """Get counts for admin menu badges"""
    # Prenotazioni in attesa
    bookings_pending = await db.bookings.count_documents({"status": "pending"})
    
    # Check-in in attesa
    checkins_pending = await db.checkins.count_documents({"status": "pending"})
    
    # Ordini in attesa
    orders_pending = await db.orders.count_documents({"status": "pending"})
    
    # Prenotazioni servizi in attesa
    service_bookings_pending = await db.service_bookings.count_documents({"status": "pending"})
    
    # Nuovi ospiti oggi
    from datetime import datetime, timedelta
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    new_guests_today = await db.guests.count_documents({
        "created_at": {"$gte": today_start},
        "is_admin": {"$ne": True}
    })
    
    return {
        "prenotazioni": bookings_pending,
        "checkins": checkins_pending,
        "ordini": orders_pending,
        "servizi": service_bookings_pending,
        "nuovi_ospiti": new_guests_today
    }

@api_router.get("/admin/guests", response_model=List[GuestResponse])
async def admin_get_guests(admin: dict = Depends(get_admin_user)):
    guests = await db.guests.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return [GuestResponse(**g) for g in guests]

@api_router.get("/admin/guests/search")
async def admin_search_guests(q: str = "", admin: dict = Depends(get_admin_user)):
    """Cerca ospiti per nome, cognome o email"""
    if not q or len(q) < 2:
        return []
    
    # Cerca per nome, cognome o email (case-insensitive)
    query = {
        "$or": [
            {"nome": {"$regex": q, "$options": "i"}},
            {"cognome": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ],
        "is_admin": {"$ne": True}  # Escludi admin
    }
    
    guests = await db.guests.find(query, {"_id": 0, "password_hash": 0}).limit(10).to_list(10)
    
    # Restituisci con info utili
    result = []
    for g in guests:
        result.append({
            "id": g["id"],
            "nome": g.get("nome", ""),
            "cognome": g.get("cognome", ""),
            "email": g.get("email", ""),
            "telefono": g.get("telefono", ""),
            "punti_fedelta": g.get("punti_fedelta", 0),
            "nome_completo": f"{g.get('nome', '')} {g.get('cognome', '')}".strip()
        })
    
    return result

@api_router.get("/admin/checkins")
async def admin_get_checkins(admin: dict = Depends(get_admin_user)):
    """Get all check-ins from both collections (form + online/validated)"""
    # Get check-ins from form submissions
    form_checkins = await db.checkins.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for checkin in form_checkins:
        checkin["source"] = "form"
        guest = await db.guests.find_one({"id": checkin.get("guest_id")}, {"_id": 0, "nome": 1, "cognome": 1})
        if guest:
            checkin["guest_nome"] = f"{guest.get('nome', '')} {guest.get('cognome', '')}"
    
    # Get online check-ins (including manually validated)
    online_checkins = await db.online_checkins.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for checkin in online_checkins:
        checkin["source"] = "online"
        # Get booking info for guest name
        booking = await db.bookings.find_one({"id": checkin.get("booking_id")}, {"_id": 0})
        if booking:
            checkin["guest_nome"] = booking.get("nome_ospite", "")
            checkin["booking"] = booking
        # Map status for consistency
        if checkin.get("validated_by_admin"):
            checkin["admin_validated"] = True
    
    # Combine and sort
    all_checkins = form_checkins + online_checkins
    all_checkins.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return all_checkins

@api_router.put("/admin/checkins/{checkin_id}/status")
async def admin_update_checkin_status(checkin_id: str, status: str, admin: dict = Depends(get_admin_user)):
    if status not in ["pending", "confirmed", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Status non valido")
    
    result = await db.checkins.update_one(
        {"id": checkin_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Check-in non trovato")
    
    return {"message": "Status aggiornato"}

@api_router.post("/admin/events", response_model=EventResponse)
async def admin_create_event(data: EventCreate, admin: dict = Depends(get_admin_user)):
    event_id = str(uuid.uuid4())
    
    event_doc = {
        "id": event_id,
        "titolo": data.titolo,
        "descrizione": data.descrizione,
        "data": data.data,
        "data_fine": data.data_fine or data.data,  # Se non specificata, usa data inizio
        "ora": data.ora,
        "ora_fine": data.ora_fine,
        "luogo": data.luogo,
        "indirizzo": data.indirizzo,
        "immagine_url": data.immagine_url,
        "categoria": data.categoria,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.insert_one(event_doc)
    return EventResponse(**event_doc)

@api_router.put("/admin/events/{event_id}", response_model=EventResponse)
async def admin_update_event(event_id: str, data: EventCreate, admin: dict = Depends(get_admin_user)):
    update_data = {
        "titolo": data.titolo,
        "descrizione": data.descrizione,
        "data": data.data,
        "data_fine": data.data_fine or data.data,
        "ora": data.ora,
        "ora_fine": data.ora_fine,
        "luogo": data.luogo,
        "indirizzo": data.indirizzo,
        "immagine_url": data.immagine_url,
        "categoria": data.categoria
    }
    
    result = await db.events.update_one(
        {"id": event_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    return EventResponse(**event)

@api_router.delete("/admin/events/{event_id}")
async def admin_delete_event(event_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    return {"message": "Evento eliminato"}

@api_router.post("/admin/structures", response_model=StructureResponse)
async def admin_create_structure(data: StructureCreate, admin: dict = Depends(get_admin_user)):
    structure_id = str(uuid.uuid4())
    
    structure_doc = {
        "id": structure_id,
        "nome": data.nome,
        "tipo": data.tipo,
        "indirizzo": data.indirizzo,
        "telefono": data.telefono,
        "orari": data.orari,
        "descrizione": data.descrizione,
        "latitudine": data.latitudine,
        "longitudine": data.longitudine,
        "immagine_url": data.immagine_url,
        "categoria": data.categoria or data.tipo,
        "distanza": data.distanza
    }
    
    await db.structures.insert_one(structure_doc)
    return structure_doc

@api_router.put("/admin/structures/{structure_id}")
async def admin_update_structure(structure_id: str, data: StructureCreate, admin: dict = Depends(get_admin_user)):
    update_data = {
        "nome": data.nome,
        "tipo": data.tipo,
        "indirizzo": data.indirizzo,
        "telefono": data.telefono,
        "orari": data.orari,
        "descrizione": data.descrizione,
        "immagine_url": data.immagine_url,
        "categoria": data.categoria,
        "distanza": data.distanza
    }
    # Handle coordinates separately - allow 0.0 values
    if data.latitudine is not None:
        update_data["latitudine"] = data.latitudine
    if data.longitudine is not None:
        update_data["longitudine"] = data.longitudine
    
    # Remove None values for other fields
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.structures.update_one(
        {"id": structure_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Struttura non trovata")
    
    structure = await db.structures.find_one({"id": structure_id}, {"_id": 0})
    return structure

@api_router.delete("/admin/structures/{structure_id}")
async def admin_delete_structure(structure_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.structures.delete_one({"id": structure_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Struttura non trovata")
    return {"message": "Struttura eliminata"}

# Admin Services Management
@api_router.post("/admin/services", response_model=ServiceResponse)
async def admin_create_service(data: ServiceCreate, admin: dict = Depends(get_admin_user)):
    service_id = str(uuid.uuid4())
    service_doc = {
        "id": service_id,
        **data.model_dump()
    }
    await db.services.insert_one(service_doc)
    return ServiceResponse(**service_doc)

@api_router.put("/admin/services/{service_id}", response_model=ServiceResponse)
async def admin_update_service(service_id: str, data: ServiceCreate, admin: dict = Depends(get_admin_user)):
    update_data = data.model_dump()
    result = await db.services.update_one({"id": service_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    return ServiceResponse(**service)

@api_router.delete("/admin/services/{service_id}")
async def admin_delete_service(service_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    return {"message": "Servizio eliminato"}

@api_router.get("/admin/services", response_model=List[ServiceResponse])
async def admin_get_services(admin: dict = Depends(get_admin_user)):
    services = await db.services.find({}, {"_id": 0}).to_list(100)
    return services

@api_router.get("/admin/service-bookings", response_model=List[ServiceBookingResponse])
async def admin_get_service_bookings(admin: dict = Depends(get_admin_user)):
    bookings = await db.service_bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return bookings

@api_router.put("/admin/service-bookings/{booking_id}/status")
async def admin_update_booking_status(booking_id: str, status: str, admin: dict = Depends(get_admin_user)):
    if status not in ["pending", "confirmed", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Status non valido")
    result = await db.service_bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    return {"message": "Status aggiornato"}

# Admin Products
@api_router.get("/admin/products", response_model=List[ProductResponse])
async def admin_get_products(admin: dict = Depends(get_admin_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(200)
    return products

@api_router.post("/admin/products", response_model=ProductResponse)
async def admin_create_product(data: ProductCreate, admin: dict = Depends(get_admin_user)):
    product_id = str(uuid.uuid4())
    product_doc = {"id": product_id, **data.model_dump()}
    await db.products.insert_one(product_doc)
    return ProductResponse(**product_doc)

@api_router.put("/admin/products/{product_id}", response_model=ProductResponse)
async def admin_update_product(product_id: str, data: ProductCreate, admin: dict = Depends(get_admin_user)):
    result = await db.products.update_one({"id": product_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return ProductResponse(**product)

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return {"message": "Prodotto eliminato"}

# Admin Orders
@api_router.get("/admin/orders", response_model=List[OrderResponse])
async def admin_get_orders(admin: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status: str, admin: dict = Depends(get_admin_user)):
    if status not in ["pending", "confirmed", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="Status non valido")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return {"message": "Status aggiornato"}

# Admin House Rules
@api_router.get("/admin/house-rules", response_model=List[HouseRuleResponse])
async def admin_get_house_rules(admin: dict = Depends(get_admin_user)):
    rules = await db.house_rules.find({}, {"_id": 0}).sort("ordine", 1).to_list(100)
    return rules

@api_router.post("/admin/house-rules", response_model=HouseRuleResponse)
async def admin_create_house_rule(data: HouseRuleCreate, admin: dict = Depends(get_admin_user)):
    rule_id = str(uuid.uuid4())
    rule_doc = {"id": rule_id, **data.model_dump()}
    await db.house_rules.insert_one(rule_doc)
    return HouseRuleResponse(**rule_doc)

@api_router.put("/admin/house-rules/{rule_id}", response_model=HouseRuleResponse)
async def admin_update_house_rule(rule_id: str, data: HouseRuleCreate, admin: dict = Depends(get_admin_user)):
    result = await db.house_rules.update_one({"id": rule_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Regola non trovata")
    rule = await db.house_rules.find_one({"id": rule_id}, {"_id": 0})
    return HouseRuleResponse(**rule)

@api_router.delete("/admin/house-rules/{rule_id}")
async def admin_delete_house_rule(rule_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.house_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Regola non trovata")
    return {"message": "Regola eliminata"}

# Removed duplicate loyalty/add endpoint - using the one at line 2089 that accepts direct points

# Admin Itineraries
@api_router.get("/admin/itineraries", response_model=List[ItineraryResponse])
async def admin_get_itineraries(admin: dict = Depends(get_admin_user)):
    itineraries = await db.itineraries.find({}, {"_id": 0}).sort("ordine", 1).to_list(200)
    return itineraries

@api_router.post("/admin/itineraries", response_model=ItineraryResponse)
async def admin_create_itinerary(data: ItineraryCreate, admin: dict = Depends(get_admin_user)):
    itinerary_id = str(uuid.uuid4())
    itinerary_doc = {"id": itinerary_id, **data.model_dump()}
    await db.itineraries.insert_one(itinerary_doc)
    return ItineraryResponse(**itinerary_doc)

@api_router.put("/admin/itineraries/{itinerary_id}", response_model=ItineraryResponse)
async def admin_update_itinerary(itinerary_id: str, data: ItineraryCreate, admin: dict = Depends(get_admin_user)):
    result = await db.itineraries.update_one({"id": itinerary_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Itinerario non trovato")
    itinerary = await db.itineraries.find_one({"id": itinerary_id}, {"_id": 0})
    return ItineraryResponse(**itinerary)

@api_router.delete("/admin/itineraries/{itinerary_id}")
async def admin_delete_itinerary(itinerary_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.itineraries.delete_one({"id": itinerary_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Itinerario non trovato")
    return {"message": "Itinerario eliminato"}

# ==================== ADMIN UNITS (CASETTE) ====================

@api_router.get("/admin/units", response_model=List[UnitResponse])
async def admin_get_units(admin: dict = Depends(get_admin_user)):
    units = await db.units.find({}, {"_id": 0}).to_list(20)
    return units

@api_router.post("/admin/units", response_model=UnitResponse)
async def admin_create_unit(data: UnitCreate, admin: dict = Depends(get_admin_user)):
    unit_id = str(uuid.uuid4())
    unit_doc = {"id": unit_id, **data.model_dump()}
    await db.units.insert_one(unit_doc)
    return UnitResponse(**unit_doc)

@api_router.put("/admin/units/{unit_id}", response_model=UnitResponse)
async def admin_update_unit(unit_id: str, data: UnitCreate, admin: dict = Depends(get_admin_user)):
    result = await db.units.update_one({"id": unit_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    unit = await db.units.find_one({"id": unit_id}, {"_id": 0})
    return UnitResponse(**unit)

@api_router.delete("/admin/units/{unit_id}")
async def admin_delete_unit(unit_id: str, admin: dict = Depends(get_admin_user)):
    # Check if there are bookings
    booking = await db.bookings.find_one({"unit_id": unit_id, "status": {"$in": ["pending", "confirmed"]}})
    if booking:
        raise HTTPException(status_code=400, detail="Non puoi eliminare un'unità con prenotazioni attive")
    result = await db.units.delete_one({"id": unit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    return {"message": "Unità eliminata"}

# ==================== ADMIN PRICE PERIODS ====================

@api_router.get("/admin/price-periods")
async def admin_get_price_periods(admin: dict = Depends(get_admin_user), unit_id: Optional[str] = None):
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    try:
        periods = await db.price_periods.find(query, {"_id": 0}).sort("data_inizio", 1).to_list(200)
        # Filter out any invalid periods
        valid_periods = []
        for p in periods:
            try:
                valid_periods.append({
                    "id": p.get("id", ""),
                    "unit_id": p.get("unit_id", ""),
                    "nome_periodo": p.get("nome_periodo", ""),
                    "data_inizio": p.get("data_inizio", ""),
                    "data_fine": p.get("data_fine", ""),
                    "prezzo_notte": float(p.get("prezzo_notte", 0)),
                    "prezzo_weekend": float(p.get("prezzo_weekend")) if p.get("prezzo_weekend") else None,
                    "soggiorno_minimo": int(p.get("soggiorno_minimo", 1))
                })
            except:
                continue
        return valid_periods
    except Exception as e:
        print(f"Error in price-periods: {e}")
        return []

@api_router.post("/admin/price-periods", response_model=PricePeriodResponse)
async def admin_create_price_period(data: PricePeriodCreate, admin: dict = Depends(get_admin_user)):
    # Verify unit exists
    unit = await db.units.find_one({"id": data.unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    period_id = str(uuid.uuid4())
    period_doc = {"id": period_id, **data.model_dump()}
    await db.price_periods.insert_one(period_doc)
    return PricePeriodResponse(**period_doc)

@api_router.put("/admin/price-periods/{period_id}", response_model=PricePeriodResponse)
async def admin_update_price_period(period_id: str, data: PricePeriodCreate, admin: dict = Depends(get_admin_user)):
    result = await db.price_periods.update_one({"id": period_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Periodo non trovato")
    period = await db.price_periods.find_one({"id": period_id}, {"_id": 0})
    return PricePeriodResponse(**period)

@api_router.delete("/admin/price-periods/{period_id}")
async def admin_delete_price_period(period_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.price_periods.delete_one({"id": period_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Periodo non trovato")
    return {"message": "Periodo eliminato"}

# ==================== ADMIN LONG STAY DISCOUNTS ====================

@api_router.get("/admin/discounts")
async def admin_get_discounts(admin: dict = Depends(get_admin_user), unit_id: Optional[str] = None):
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    discounts = await db.discounts.find(query, {"_id": 0}).sort("giorni_minimo", 1).to_list(100)
    return discounts

@api_router.post("/admin/discounts")
async def admin_create_discount(data: LongStayDiscountCreate, admin: dict = Depends(get_admin_user)):
    unit = await db.units.find_one({"id": data.unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    discount_id = str(uuid.uuid4())
    discount_doc = {"id": discount_id, **data.model_dump()}
    await db.discounts.insert_one(discount_doc)
    return discount_doc

@api_router.delete("/admin/discounts/{discount_id}")
async def admin_delete_discount(discount_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.discounts.delete_one({"id": discount_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sconto non trovato")
    return {"message": "Sconto eliminato"}

# ==================== ADMIN UNIT PRICING CONFIG ====================

@api_router.get("/admin/units/{unit_id}/pricing")
async def admin_get_unit_pricing(unit_id: str, admin: dict = Depends(get_admin_user)):
    """Get complete pricing configuration for a unit"""
    unit = await db.units.find_one({"id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    price_periods = await db.price_periods.find({"unit_id": unit_id}, {"_id": 0}).sort("data_inizio", 1).to_list(100)
    discounts = await db.discounts.find({"unit_id": unit_id}, {"_id": 0}).sort("giorni_minimo", 1).to_list(100)
    
    return {
        "unit": unit,
        "prezzo_base": unit.get("prezzo_base", 0),
        "prezzo_weekend": unit.get("prezzo_weekend"),
        "soggiorno_minimo": unit.get("soggiorno_minimo", 1),
        "price_periods": price_periods,
        "discounts": discounts
    }

@api_router.put("/admin/units/{unit_id}/pricing")
async def admin_update_unit_pricing(unit_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update unit base pricing configuration"""
    unit = await db.units.find_one({"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    update_data = {}
    if "prezzo_base" in data:
        update_data["prezzo_base"] = float(data["prezzo_base"])
    if "prezzo_weekend" in data:
        update_data["prezzo_weekend"] = float(data["prezzo_weekend"]) if data["prezzo_weekend"] else None
    if "soggiorno_minimo" in data:
        update_data["soggiorno_minimo"] = int(data["soggiorno_minimo"])
    
    if update_data:
        await db.units.update_one({"id": unit_id}, {"$set": update_data})
    
    return {"message": "Prezzi aggiornati"}

# ==================== ADMIN DATE BLOCKS ====================

@api_router.get("/admin/date-blocks", response_model=List[DateBlockResponse])
async def admin_get_date_blocks(admin: dict = Depends(get_admin_user), unit_id: Optional[str] = None):
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    blocks = await db.date_blocks.find(query, {"_id": 0}).sort("data_inizio", 1).to_list(200)
    return blocks

@api_router.post("/admin/date-blocks", response_model=DateBlockResponse)
async def admin_create_date_block(data: DateBlockCreate, admin: dict = Depends(get_admin_user)):
    # Verify unit exists
    unit = await db.units.find_one({"id": data.unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    block_id = str(uuid.uuid4())
    block_doc = {"id": block_id, **data.model_dump()}
    await db.date_blocks.insert_one(block_doc)
    return DateBlockResponse(**block_doc)

@api_router.delete("/admin/date-blocks/{block_id}")
async def admin_delete_date_block(block_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.date_blocks.delete_one({"id": block_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocco non trovato")
    return {"message": "Blocco eliminato"}

# ==================== iCAL SYNC ====================

def parse_ical_date(dt_str: str) -> str:
    """Parse iCal date format (YYYYMMDD or YYYYMMDDTHHMMSSZ) to YYYY-MM-DD"""
    if not dt_str:
        return None
    # Remove any TZID prefix like TZID=Europe/Rome:
    if ':' in dt_str and not dt_str.startswith('DTSTART') and not dt_str.startswith('DTEND'):
        dt_str = dt_str.split(':')[-1]
    dt_str = dt_str.replace('T', '').replace('Z', '').replace('-', '')[:8]
    try:
        return f"{dt_str[:4]}-{dt_str[4:6]}-{dt_str[6:8]}"
    except:
        return None

def parse_ical_content(content: str) -> list:
    """Parse iCal content and extract events"""
    events = []
    lines = content.replace('\r\n ', '').replace('\r\n\t', '').split('\n')
    
    current_event = None
    for line in lines:
        line = line.strip()
        if line == 'BEGIN:VEVENT':
            current_event = {}
        elif line == 'END:VEVENT':
            if current_event and current_event.get('start') and current_event.get('end'):
                events.append(current_event)
            current_event = None
        elif current_event is not None:
            if line.startswith('DTSTART'):
                # Handle various formats: DTSTART:20240101 or DTSTART;VALUE=DATE:20240101
                parts = line.split(':', 1)
                if len(parts) == 2:
                    current_event['start'] = parse_ical_date(parts[1])
            elif line.startswith('DTEND'):
                parts = line.split(':', 1)
                if len(parts) == 2:
                    current_event['end'] = parse_ical_date(parts[1])
            elif line.startswith('SUMMARY'):
                parts = line.split(':', 1)
                if len(parts) == 2:
                    current_event['summary'] = parts[1]
            elif line.startswith('UID'):
                parts = line.split(':', 1)
                if len(parts) == 2:
                    current_event['uid'] = parts[1]
    
    return events

def generate_ical_content(unit: dict, bookings: list, blocks: list) -> str:
    """Generate iCal content for export"""
    unit_name = unit.get('nome', 'La Maisonette')
    
    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//La Maisonette di Paestum//Booking Calendar//IT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        f'X-WR-CALNAME:{unit_name}',
    ]
    
    # Add bookings as events
    for booking in bookings:
        uid = f"booking-{booking.get('id', uuid.uuid4())}@maisonette.it"
        start = booking.get('data_arrivo', '').replace('-', '')
        end = booking.get('data_partenza', '').replace('-', '')
        summary = f"Prenotazione - {booking.get('nome_ospite', 'Ospite')}"
        created = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        
        lines.extend([
            'BEGIN:VEVENT',
            f'UID:{uid}',
            f'DTSTART;VALUE=DATE:{start}',
            f'DTEND;VALUE=DATE:{end}',
            f'DTSTAMP:{created}',
            f'SUMMARY:{summary}',
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT',
        ])
    
    # Add date blocks as events
    for block in blocks:
        uid = f"block-{block.get('id', uuid.uuid4())}@maisonette.it"
        start = block.get('data_inizio', '').replace('-', '')
        end = block.get('data_fine', '').replace('-', '')
        motivo = block.get('motivo', 'Non disponibile')
        source = block.get('source', 'manual')
        summary = f"Bloccato - {motivo}" if source == 'manual' else f"Occupato ({source})"
        created = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        
        lines.extend([
            'BEGIN:VEVENT',
            f'UID:{uid}',
            f'DTSTART;VALUE=DATE:{start}',
            f'DTEND;VALUE=DATE:{end}',
            f'DTSTAMP:{created}',
            f'SUMMARY:{summary}',
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT',
        ])
    
    lines.append('END:VCALENDAR')
    return '\r\n'.join(lines)

# Public iCal export endpoint (no auth required for external services)
@api_router.get("/ical/{unit_id}.ics")
async def export_ical(unit_id: str):
    """Export calendar in iCal format for Booking.com/Airbnb import"""
    from fastapi.responses import Response
    
    unit = await db.units.find_one({"id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    # Get confirmed bookings
    bookings = await db.bookings.find({
        "unit_id": unit_id,
        "status": {"$in": ["confirmed", "pending"]}
    }, {"_id": 0}).to_list(500)
    
    # Get date blocks
    blocks = await db.date_blocks.find({"unit_id": unit_id}, {"_id": 0}).to_list(500)
    
    # Generate iCal content
    ical_content = generate_ical_content(unit, bookings, blocks)
    
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="{unit_id}.ics"',
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )

# Admin iCal feed management
@api_router.get("/admin/ical/feeds")
async def admin_get_ical_feeds(admin: dict = Depends(get_admin_user), unit_id: Optional[str] = None):
    """Get all configured iCal feeds"""
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    feeds = await db.ical_feeds.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return feeds

@api_router.post("/admin/ical/feeds")
async def admin_create_ical_feed(data: ICalFeedCreate, admin: dict = Depends(get_admin_user)):
    """Add a new iCal feed to sync (Booking.com, Airbnb, etc.)"""
    # Verify unit exists
    unit = await db.units.find_one({"id": data.unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    # Validate URL format
    if not data.url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail="URL non valido")
    
    feed_id = str(uuid.uuid4())
    feed_doc = {
        "id": feed_id,
        "unit_id": data.unit_id,
        "nome": data.nome,
        "url": data.url,
        "attivo": data.attivo,
        "ultima_sincronizzazione": None,
        "eventi_importati": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ical_feeds.insert_one(feed_doc)
    
    return ICalFeedResponse(**feed_doc)

@api_router.put("/admin/ical/feeds/{feed_id}")
async def admin_update_ical_feed(feed_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update iCal feed settings"""
    feed = await db.ical_feeds.find_one({"id": feed_id})
    if not feed:
        raise HTTPException(status_code=404, detail="Feed non trovato")
    
    update_data = {}
    if "nome" in data:
        update_data["nome"] = data["nome"]
    if "url" in data:
        update_data["url"] = data["url"]
    if "attivo" in data:
        update_data["attivo"] = data["attivo"]
    
    if update_data:
        await db.ical_feeds.update_one({"id": feed_id}, {"$set": update_data})
    
    updated = await db.ical_feeds.find_one({"id": feed_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/ical/feeds/{feed_id}")
async def admin_delete_ical_feed(feed_id: str, admin: dict = Depends(get_admin_user)):
    """Delete iCal feed and its imported blocks"""
    feed = await db.ical_feeds.find_one({"id": feed_id})
    if not feed:
        raise HTTPException(status_code=404, detail="Feed non trovato")
    
    # Delete associated date blocks
    await db.date_blocks.delete_many({"ical_feed_id": feed_id})
    
    # Delete feed
    await db.ical_feeds.delete_one({"id": feed_id})
    
    return {"message": "Feed e blocchi associati eliminati"}

@api_router.post("/admin/ical/sync")
async def admin_sync_ical_feeds(admin: dict = Depends(get_admin_user), unit_id: Optional[str] = None, feed_id: Optional[str] = None):
    """Sync all active iCal feeds (or specific unit/feed)"""
    query = {"attivo": True}
    if unit_id:
        query["unit_id"] = unit_id
    if feed_id:
        query["id"] = feed_id
    
    feeds = await db.ical_feeds.find(query, {"_id": 0}).to_list(100)
    results = []
    
    for feed in feeds:
        result = {
            "feed_id": feed["id"],
            "feed_nome": feed["nome"],
            "eventi_trovati": 0,
            "nuovi_blocchi": 0,
            "errore": None
        }
        
        try:
            # Fetch iCal content
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(feed["url"])
                response.raise_for_status()
                ical_content = response.text
            
            # Parse events
            events = parse_ical_content(ical_content)
            result["eventi_trovati"] = len(events)
            
            # Delete old blocks from this feed
            await db.date_blocks.delete_many({"ical_feed_id": feed["id"]})
            
            # Create new date blocks for each event
            today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            new_blocks = 0
            
            for event in events:
                # Skip past events
                if event.get('end', '') < today:
                    continue
                
                # Determine source based on feed name or URL
                source = "ical"
                nome_lower = feed["nome"].lower()
                url_lower = feed["url"].lower()
                if "booking" in nome_lower or "booking" in url_lower:
                    source = "booking"
                elif "airbnb" in nome_lower or "airbnb" in url_lower:
                    source = "airbnb"
                
                block_doc = {
                    "id": str(uuid.uuid4()),
                    "unit_id": feed["unit_id"],
                    "data_inizio": event["start"],
                    "data_fine": event["end"],
                    "motivo": event.get("summary", f"Prenotazione {feed['nome']}"),
                    "source": source,
                    "ical_feed_id": feed["id"],
                    "ical_uid": event.get("uid")
                }
                await db.date_blocks.insert_one(block_doc)
                new_blocks += 1
            
            result["nuovi_blocchi"] = new_blocks
            
            # Update feed stats
            await db.ical_feeds.update_one(
                {"id": feed["id"]},
                {"$set": {
                    "ultima_sincronizzazione": datetime.now(timezone.utc).isoformat(),
                    "eventi_importati": new_blocks
                }}
            )
            
        except httpx.HTTPError as e:
            result["errore"] = f"Errore HTTP: {str(e)}"
        except Exception as e:
            result["errore"] = f"Errore: {str(e)}"
        
        results.append(result)
    
    total_eventi = sum(r["eventi_trovati"] for r in results)
    total_blocchi = sum(r["nuovi_blocchi"] for r in results)
    errori = [r for r in results if r["errore"]]
    
    return {
        "message": f"Sincronizzazione completata: {total_eventi} eventi trovati, {total_blocchi} blocchi creati",
        "feeds_processati": len(results),
        "errori": len(errori),
        "dettagli": results
    }

@api_router.get("/admin/ical/export-url/{unit_id}")
async def admin_get_export_url(unit_id: str, admin: dict = Depends(get_admin_user)):
    """Get the iCal export URL for a unit"""
    unit = await db.units.find_one({"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata")
    
    # Use production domain for iCal export URLs (must be stable for Booking/Airbnb)
    app_url = "https://booking.lamaisonettepaestum.com"
    export_url = f"{app_url}/api/ical/{unit_id}.ics"
    
    return {
        "unit_id": unit_id,
        "unit_nome": unit.get("nome"),
        "export_url": export_url,
        "istruzioni": "Copia questo URL e incollalo nelle impostazioni del calendario di Booking.com o Airbnb"
    }

# ==================== DASHBOARD STATISTICS ====================

@api_router.get("/admin/statistics")
async def admin_get_statistics(admin: dict = Depends(get_admin_user)):
    """Get comprehensive dashboard statistics"""
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all bookings
    all_bookings = await db.bookings.find({}, {"_id": 0}).to_list(1000)
    
    # Current month bookings
    month_bookings = [b for b in all_bookings if b.get('data_arrivo', '') >= current_month_start.strftime('%Y-%m-%d')]
    
    # Year bookings
    year_bookings = [b for b in all_bookings if b.get('data_arrivo', '') >= current_year_start.strftime('%Y-%m-%d')]
    
    # Calculate nights sold
    def count_nights(booking):
        try:
            start = datetime.fromisoformat(booking['data_arrivo'])
            end = datetime.fromisoformat(booking['data_partenza'])
            return (end - start).days
        except:
            return 0
    
    total_nights_month = sum(count_nights(b) for b in month_bookings)
    total_nights_year = sum(count_nights(b) for b in year_bookings)
    
    # Get units for occupancy calculation
    units = await db.units.find({"attivo": True}, {"_id": 0}).to_list(10)
    num_units = len(units) if units else 1
    
    # Days in current month
    next_month = current_month_start.replace(month=current_month_start.month % 12 + 1) if current_month_start.month < 12 else current_month_start.replace(year=current_month_start.year + 1, month=1)
    days_in_month = (next_month - current_month_start).days
    available_nights_month = days_in_month * num_units
    
    # Occupancy rate
    occupancy_rate = round((total_nights_month / available_nights_month * 100), 1) if available_nights_month > 0 else 0
    
    # Revenue calculation (from notes or estimated)
    def extract_revenue(booking):
        # Try to get price from booking or estimate
        if 'prezzo_totale' in booking:
            return booking['prezzo_totale']
        # Estimate based on nights (average €100/night)
        return count_nights(booking) * 100
    
    revenue_month = sum(extract_revenue(b) for b in month_bookings if b.get('status') in ['confirmed', 'completed'])
    revenue_year = sum(extract_revenue(b) for b in year_bookings if b.get('status') in ['confirmed', 'completed'])
    
    # Source breakdown (from notes)
    def get_source(booking):
        note = booking.get('note', '') or ''
        note_lower = note.lower()
        if '[airbnb]' in note_lower or 'airbnb' in note_lower:
            return 'airbnb'
        elif '[booking' in note_lower or 'booking' in note_lower:
            return 'booking'
        elif '[whatsapp]' in note_lower:
            return 'whatsapp'
        elif '[telefono]' in note_lower or '[phone]' in note_lower:
            return 'phone'
        else:
            return 'direct'
    
    source_counts = {'airbnb': 0, 'booking': 0, 'direct': 0, 'phone': 0, 'whatsapp': 0}
    for b in year_bookings:
        source = get_source(b)
        source_counts[source] = source_counts.get(source, 0) + 1
    
    # Monthly breakdown for chart (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30*i)
        month_str = month_date.strftime('%Y-%m')
        month_name = month_date.strftime('%b')
        
        month_bookings_count = len([b for b in all_bookings if b.get('data_arrivo', '').startswith(month_str)])
        month_revenue = sum(extract_revenue(b) for b in all_bookings if b.get('data_arrivo', '').startswith(month_str) and b.get('status') in ['confirmed', 'completed'])
        
        monthly_data.append({
            'month': month_name,
            'bookings': month_bookings_count,
            'revenue': month_revenue
        })
    
    # Upcoming check-ins (next 7 days)
    next_week = (now + timedelta(days=7)).strftime('%Y-%m-%d')
    today = now.strftime('%Y-%m-%d')
    upcoming_checkins = [b for b in all_bookings if today <= b.get('data_arrivo', '') <= next_week]
    
    # Get guests count
    guests_count = await db.guests.count_documents({})
    
    return {
        "overview": {
            "total_bookings_month": len(month_bookings),
            "total_bookings_year": len(year_bookings),
            "nights_sold_month": total_nights_month,
            "nights_sold_year": total_nights_year,
            "occupancy_rate": occupancy_rate,
            "revenue_month": revenue_month,
            "revenue_year": revenue_year,
            "total_guests": guests_count,
            "units_count": num_units
        },
        "source_breakdown": source_counts,
        "monthly_trend": monthly_data,
        "upcoming_checkins": len(upcoming_checkins),
        "upcoming_checkins_list": upcoming_checkins[:5]
    }

@api_router.get("/admin/statistics/report")
async def admin_get_monthly_report(admin: dict = Depends(get_admin_user), month: Optional[str] = None):
    """Get detailed monthly report for PDF export"""
    from datetime import timedelta
    
    # Parse month parameter (YYYY-MM) or use current month
    if month:
        try:
            year, m = month.split('-')
            report_date = datetime(int(year), int(m), 1, tzinfo=timezone.utc)
        except:
            report_date = datetime.now(timezone.utc).replace(day=1)
    else:
        report_date = datetime.now(timezone.utc).replace(day=1)
    
    month_str = report_date.strftime('%Y-%m')
    month_name = report_date.strftime('%B %Y')
    
    # Next month for range
    if report_date.month == 12:
        next_month = report_date.replace(year=report_date.year + 1, month=1)
    else:
        next_month = report_date.replace(month=report_date.month + 1)
    
    # Get all bookings for the month
    bookings = await db.bookings.find({
        "data_arrivo": {"$gte": month_str + "-01", "$lt": next_month.strftime('%Y-%m') + "-01"}
    }, {"_id": 0}).to_list(500)
    
    # Calculate metrics
    def count_nights(booking):
        try:
            start = datetime.fromisoformat(booking['data_arrivo'])
            end = datetime.fromisoformat(booking['data_partenza'])
            return (end - start).days
        except:
            return 0
    
    def extract_revenue(booking):
        if 'prezzo_totale' in booking:
            return booking['prezzo_totale']
        return count_nights(booking) * 100
    
    def get_source(booking):
        note = booking.get('note', '') or ''
        note_lower = note.lower()
        if 'airbnb' in note_lower:
            return 'Airbnb'
        elif 'booking' in note_lower:
            return 'Booking.com'
        elif 'whatsapp' in note_lower:
            return 'WhatsApp'
        elif 'telefono' in note_lower or 'phone' in note_lower:
            return 'Telefono'
        else:
            return 'Diretto'
    
    confirmed_bookings = [b for b in bookings if b.get('status') in ['confirmed', 'completed']]
    cancelled_bookings = [b for b in bookings if b.get('status') == 'cancelled']
    
    total_nights = sum(count_nights(b) for b in confirmed_bookings)
    total_revenue = sum(extract_revenue(b) for b in confirmed_bookings)
    avg_stay = round(total_nights / len(confirmed_bookings), 1) if confirmed_bookings else 0
    
    # Daily breakdown
    days_in_month = (next_month - report_date).days
    daily_occupancy = []
    for day in range(1, days_in_month + 1):
        day_str = f"{month_str}-{str(day).zfill(2)}"
        occupied = len([b for b in confirmed_bookings if b['data_arrivo'] <= day_str < b['data_partenza']])
        daily_occupancy.append({"day": day, "occupied": occupied})
    
    # Booking details for report
    booking_details = []
    for b in confirmed_bookings:
        booking_details.append({
            "nome_ospite": b.get('nome_ospite', 'N/A'),
            "data_arrivo": b.get('data_arrivo'),
            "data_partenza": b.get('data_partenza'),
            "notti": count_nights(b),
            "provenienza": get_source(b),
            "revenue": extract_revenue(b)
        })
    
    return {
        "report_month": month_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_bookings": len(confirmed_bookings),
            "cancelled_bookings": len(cancelled_bookings),
            "total_nights": total_nights,
            "total_revenue": total_revenue,
            "average_stay": avg_stay,
            "occupancy_rate": round((total_nights / (days_in_month * 2)) * 100, 1)  # Assuming 2 units
        },
        "daily_occupancy": daily_occupancy,
        "bookings": booking_details
    }

# ==================== PRICING MANAGEMENT ====================

@api_router.get("/admin/pricing/settings")
async def admin_get_pricing_settings(admin: dict = Depends(get_admin_user)):
    """Get pricing configuration"""
    settings = await db.pricing_settings.find_one({}, {"_id": 0})
    if not settings:
        # Default settings
        settings = {
            "id": str(uuid.uuid4()),
            "prezzo_base": 100,
            "prezzo_weekend": 120,
            "supplemento_ospite": 15,
            "ospiti_inclusi": 2,
            "sconto_settimanale": 10,
            "sconto_mensile": 20,
            "stagioni": [
                {"nome": "Alta", "mesi": [7, 8], "moltiplicatore": 1.5},
                {"nome": "Media", "mesi": [4, 5, 6, 9, 10], "moltiplicatore": 1.2},
                {"nome": "Bassa", "mesi": [1, 2, 3, 11, 12], "moltiplicatore": 1.0}
            ],
            "min_notti": 2,
            "min_notti_alta_stagione": 3
        }
        await db.pricing_settings.insert_one(settings)
    return settings

@api_router.put("/admin/pricing/settings")
async def admin_update_pricing_settings(data: dict, admin: dict = Depends(get_admin_user)):
    """Update pricing configuration"""
    existing = await db.pricing_settings.find_one({})
    if existing:
        await db.pricing_settings.update_one({"_id": existing["_id"]}, {"$set": data})
    else:
        data["id"] = str(uuid.uuid4())
        await db.pricing_settings.insert_one(data)
    
    updated = await db.pricing_settings.find_one({}, {"_id": 0})
    return updated

@api_router.post("/admin/pricing/calculate")
async def admin_calculate_price(data: dict, admin: dict = Depends(get_admin_user)):
    """Calculate price for a booking"""
    data_arrivo = data.get('data_arrivo')
    data_partenza = data.get('data_partenza')
    num_ospiti = data.get('num_ospiti', 2)
    
    if not data_arrivo or not data_partenza:
        raise HTTPException(status_code=400, detail="Date richieste")
    
    settings = await db.pricing_settings.find_one({}, {"_id": 0})
    if not settings:
        settings = {"prezzo_base": 100, "prezzo_weekend": 120, "supplemento_ospite": 15, "ospiti_inclusi": 2, "sconto_settimanale": 10, "sconto_mensile": 20, "stagioni": []}
    
    start = datetime.fromisoformat(data_arrivo)
    end = datetime.fromisoformat(data_partenza)
    
    total = 0
    nights_detail = []
    current = start
    
    while current < end:
        day_price = settings['prezzo_base']
        
        # Weekend supplement
        if current.weekday() >= 5:  # Saturday or Sunday
            day_price = settings.get('prezzo_weekend', day_price)
        
        # Season multiplier
        month = current.month
        for season in settings.get('stagioni', []):
            if month in season.get('mesi', []):
                day_price *= season.get('moltiplicatore', 1.0)
                break
        
        nights_detail.append({
            "date": current.strftime('%Y-%m-%d'),
            "price": round(day_price, 2),
            "is_weekend": current.weekday() >= 5
        })
        
        total += day_price
        current += timedelta(days=1)
    
    # Extra guests supplement
    ospiti_extra = max(0, num_ospiti - settings.get('ospiti_inclusi', 2))
    supplemento_totale = ospiti_extra * settings.get('supplemento_ospite', 0) * len(nights_detail)
    total += supplemento_totale
    
    # Long stay discount
    num_nights = len(nights_detail)
    discount = 0
    discount_type = None
    
    if num_nights >= 30 and settings.get('sconto_mensile', 0) > 0:
        discount = total * (settings['sconto_mensile'] / 100)
        discount_type = f"Sconto mensile ({settings['sconto_mensile']}%)"
    elif num_nights >= 7 and settings.get('sconto_settimanale', 0) > 0:
        discount = total * (settings['sconto_settimanale'] / 100)
        discount_type = f"Sconto settimanale ({settings['sconto_settimanale']}%)"
    
    final_total = total - discount
    
    return {
        "data_arrivo": data_arrivo,
        "data_partenza": data_partenza,
        "num_notti": num_nights,
        "num_ospiti": num_ospiti,
        "prezzo_notti": round(total - supplemento_totale, 2),
        "supplemento_ospiti": round(supplemento_totale, 2),
        "subtotale": round(total, 2),
        "sconto": round(discount, 2),
        "tipo_sconto": discount_type,
        "totale": round(final_total, 2),
        "dettaglio_notti": nights_detail
    }

# ==================== ONLINE CHECK-IN ====================

@api_router.post("/checkin/request/{booking_code}")
async def request_checkin_link(booking_code: str):
    """Request online check-in link for a booking"""
    # Find booking by code
    booking = await db.bookings.find_one({"codice": booking_code}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    # Generate or retrieve check-in token
    existing_checkin = await db.online_checkins.find_one({"booking_id": booking["id"]})
    if existing_checkin:
        token = existing_checkin["token"]
    else:
        token = str(uuid.uuid4())
        await db.online_checkins.insert_one({
            "id": str(uuid.uuid4()),
            "booking_id": booking["id"],
            "token": token,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "guest_data": None
        })
    
    return {
        "message": "Link check-in generato",
        "checkin_url": f"/checkin/{token}",
        "booking_code": booking_code
    }

@api_router.get("/checkin/{token}")
async def get_checkin_form(token: str):
    """Get check-in form data"""
    checkin = await db.online_checkins.find_one({"token": token}, {"_id": 0})
    if not checkin:
        raise HTTPException(status_code=404, detail="Link non valido")
    
    booking = await db.bookings.find_one({"id": checkin["booking_id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    # Get unit info
    unit = await db.units.find_one({"id": booking.get("unit_id")}, {"_id": 0})
    
    # Get house rules
    rules = await db.house_rules.find({"attivo": True}, {"_id": 0}).sort("ordine", 1).to_list(20)
    
    return {
        "checkin_status": checkin["status"],
        "booking": {
            "nome_ospite": booking.get("nome_ospite"),
            "data_arrivo": booking.get("data_arrivo"),
            "data_partenza": booking.get("data_partenza"),
            "num_ospiti": booking.get("num_ospiti", 1)
        },
        "unit": {
            "nome": unit.get("nome") if unit else "La Maisonette"
        },
        "house_rules": rules,
        "guest_data": checkin.get("guest_data")
    }

@api_router.post("/checkin/{token}")
async def submit_checkin(token: str, data: dict):
    """Submit online check-in form"""
    checkin = await db.online_checkins.find_one({"token": token})
    if not checkin:
        raise HTTPException(status_code=404, detail="Link non valido")
    
    if checkin["status"] == "completed":
        raise HTTPException(status_code=400, detail="Check-in già completato")
    
    # Validate required fields
    required = ["nome", "cognome", "data_nascita", "luogo_nascita", "nazionalita", "documento_tipo", "documento_numero"]
    for field in required:
        if not data.get("ospite_principale", {}).get(field):
            raise HTTPException(status_code=400, detail=f"Campo obbligatorio mancante: {field}")
    
    # Update check-in record
    await db.online_checkins.update_one(
        {"token": token},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "guest_data": data,
            "accettazione_regole": data.get("accettazione_regole", False),
            "firma_digitale": data.get("firma_digitale", False)
        }}
    )
    
    # Update booking
    booking = await db.bookings.find_one({"id": checkin["booking_id"]})
    if booking:
        await db.bookings.update_one(
            {"id": booking["id"]},
            {"$set": {"checkin_online_completato": True}}
        )
    
    return {
        "message": "Check-in completato con successo!",
        "status": "completed"
    }

@api_router.get("/admin/checkins/online")
async def admin_get_online_checkins(admin: dict = Depends(get_admin_user)):
    """Get all online check-ins"""
    checkins = await db.online_checkins.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with booking data
    for checkin in checkins:
        booking = await db.bookings.find_one({"id": checkin["booking_id"]}, {"_id": 0})
        if booking:
            checkin["booking"] = booking
    
    return checkins

@api_router.post("/admin/checkins/validate/{booking_id}")
async def admin_validate_checkin(booking_id: str, data: dict = None, admin: dict = Depends(get_admin_user)):
    """
    Valida manualmente il check-in per una prenotazione.
    Permette di inserire i dati dell'ospite principale e accompagnatori.
    """
    # Trova la prenotazione
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    # Dati dal body
    body = data or {}
    note = body.get("note", "Validato manualmente dall'admin")
    ospite_principale = body.get("ospite_principale")
    accompagnatori = body.get("accompagnatori", [])
    
    # Crea o aggiorna il record di check-in
    existing = await db.online_checkins.find_one({"booking_id": booking_id})
    
    checkin_data = {
        "status": "completed",
        "validated_by_admin": True,
        "admin_note": note,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Aggiungi dati ospite se forniti
    if ospite_principale:
        checkin_data["ospite_principale"] = ospite_principale
    if accompagnatori:
        checkin_data["accompagnatori"] = accompagnatori
    
    if existing:
        # Aggiorna check-in esistente
        await db.online_checkins.update_one(
            {"booking_id": booking_id},
            {"$set": checkin_data}
        )
        checkin_id = existing["id"]
    else:
        # Crea nuovo check-in già completato
        checkin_id = str(uuid.uuid4())
        checkin_doc = {
            "id": checkin_id,
            "booking_id": booking_id,
            "guest_id": booking.get("guest_id"),
            "ospiti": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            **checkin_data
        }
        await db.online_checkins.insert_one(checkin_doc)
    
    # Aggiorna la prenotazione
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"checkin_online_completato": True}}
    )
    
    return {
        "message": "Check-in validato con successo",
        "checkin_id": checkin_id,
        "booking_id": booking_id
    }

@api_router.put("/admin/checkins/{checkin_id}/guest-data")
async def admin_update_checkin_guest_data(checkin_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """
    Aggiorna i dati degli ospiti per un check-in (sia form che online).
    Usare per aggiungere/modificare dati dell'ospite principale e accompagnatori.
    """
    # Cerca in entrambe le collection
    checkin = await db.online_checkins.find_one({"id": checkin_id})
    collection = db.online_checkins
    
    if not checkin:
        checkin = await db.checkins.find_one({"id": checkin_id})
        collection = db.checkins
    
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in non trovato")
    
    update_data = {}
    
    if "ospite_principale" in data:
        update_data["ospite_principale"] = data["ospite_principale"]
    
    if "accompagnatori" in data:
        update_data["accompagnatori"] = data["accompagnatori"]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    await collection.update_one(
        {"id": checkin_id},
        {"$set": update_data}
    )
    
    return {"message": "Dati ospite aggiornati", "checkin_id": checkin_id}

@api_router.get("/admin/checkins/export-questura")
async def export_questura(admin: dict = Depends(get_admin_user), data_da: str = None, data_a: str = None):
    """
    Esporta i dati dei check-in nel formato per Alloggiati Web (Questura).
    Formato: file di testo con campi separati da tabulazione.
    """
    query = {"status": "completed"}
    
    if data_da:
        query["created_at"] = {"$gte": data_da}
    if data_a:
        if "created_at" in query:
            query["created_at"]["$lte"] = data_a
        else:
            query["created_at"] = {"$lte": data_a}
    
    # Get all completed check-ins from both collections
    checkins_form = await db.checkins.find(query, {"_id": 0}).to_list(1000)
    checkins_online = await db.online_checkins.find(query, {"_id": 0}).to_list(1000)
    
    all_checkins = checkins_form + checkins_online
    
    # Prepare export data
    export_lines = []
    
    for checkin in all_checkins:
        # Get booking data
        booking = await db.bookings.find_one({"id": checkin.get("booking_id")}, {"_id": 0})
        if not booking:
            continue
        
        data_arrivo = checkin.get("data_arrivo") or booking.get("data_arrivo", "")
        
        ospite = checkin.get("ospite_principale", {})
        if ospite:
            # Formato Alloggiati Web (semplificato)
            # Tipo Alloggiato (16=ospite singolo, 17=capofamiglia, 18=capogruppo, 19=familiare, 20=membro gruppo)
            line = {
                "tipo_alloggiato": "16",
                "data_arrivo": data_arrivo,
                "permanenza": "1",  # Giorni di permanenza
                "cognome": ospite.get("cognome", ""),
                "nome": ospite.get("nome", ""),
                "sesso": ospite.get("sesso", "M"),
                "data_nascita": ospite.get("data_nascita", ""),
                "comune_nascita": ospite.get("luogo_nascita", ""),
                "provincia_nascita": "",
                "stato_nascita": ospite.get("nazionalita", "ITALIA"),
                "cittadinanza": ospite.get("nazionalita", "ITALIA"),
                "tipo_documento": ospite.get("tipo_documento", "CARTID").upper().replace("CARTA_IDENTITA", "CARTID").replace("PASSAPORTO", "PASOR").replace("PATENTE", "PATEN"),
                "numero_documento": ospite.get("numero_documento", ""),
                "luogo_rilascio": ospite.get("luogo_rilascio", ""),
            }
            export_lines.append(line)
        
        # Accompagnatori
        for acc in checkin.get("accompagnatori", []):
            line = {
                "tipo_alloggiato": "19",  # Familiare/membro gruppo
                "data_arrivo": data_arrivo,
                "permanenza": "1",
                "cognome": acc.get("cognome", ""),
                "nome": acc.get("nome", ""),
                "sesso": acc.get("sesso", ""),
                "data_nascita": acc.get("data_nascita", ""),
                "comune_nascita": acc.get("luogo_nascita", ""),
                "provincia_nascita": "",
                "stato_nascita": acc.get("nazionalita", "ITALIA"),
                "cittadinanza": acc.get("nazionalita", "ITALIA"),
                "tipo_documento": "",
                "numero_documento": "",
                "luogo_rilascio": "",
            }
            export_lines.append(line)
    
    return {
        "count": len(export_lines),
        "data": export_lines,
        "format_info": "Formato compatibile con Alloggiati Web. Importare i dati nel portale della Questura."
    }

@api_router.get("/admin/checkins/{checkin_id}/export-questura")
async def export_single_checkin_questura(checkin_id: str, admin: dict = Depends(get_admin_user)):
    """
    Esporta i dati di un singolo check-in nel formato per Alloggiati Web (Questura).
    Formato: record fisso 168 caratteri per riga come da specifiche ufficiali.
    """
    # Try to find in checkins collection first
    checkin = await db.checkins.find_one({"id": checkin_id}, {"_id": 0})
    source = "form"
    
    if not checkin:
        # Try online_checkins
        checkin = await db.online_checkins.find_one({"id": checkin_id}, {"_id": 0})
        source = "online"
    
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in non trovato")
    
    # Get booking data
    booking = await db.bookings.find_one({"id": checkin.get("booking_id")}, {"_id": 0})
    
    data_arrivo = checkin.get("data_arrivo") or (booking.get("data_arrivo") if booking else "")
    data_partenza = checkin.get("data_partenza") or (booking.get("data_partenza") if booking else "")
    
    # Calculate nights
    permanenza = 1
    try:
        if data_arrivo and data_partenza:
            d1 = datetime.strptime(data_arrivo, "%Y-%m-%d")
            d2 = datetime.strptime(data_partenza, "%Y-%m-%d")
            permanenza = max(1, (d2 - d1).days)
    except:
        pass
    
    def format_date_questura(date_str):
        """Convert YYYY-MM-DD to DD/MM/YYYY"""
        if not date_str:
            return "          "  # 10 spaces
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            return d.strftime("%d/%m/%Y")
        except:
            return date_str.ljust(10)[:10]
    
    def build_record_168(tipo_alloggiato, permanenza, cognome, nome, sesso, data_nascita, 
                         comune_nascita, provincia_nascita, stato_nascita, cittadinanza,
                         tipo_doc, numero_doc, luogo_rilascio_doc):
        """
        Costruisce un record di 168 caratteri per Alloggiati Web.
        Tracciato semplificato basato sulle specifiche ufficiali.
        """
        # Pos 1-2: Tipo alloggiato (16=singolo, 17=capofam, 18=capogruppo, 19=familiare, 20=membro)
        rec = str(tipo_alloggiato).zfill(2)[:2]
        
        # Pos 3-12: Data arrivo (DD/MM/YYYY)
        rec += format_date_questura(data_arrivo)
        
        # Pos 13-14: Giorni permanenza
        rec += str(min(permanenza, 99)).zfill(2)[:2]
        
        # Pos 15-64: Cognome (50 chars)
        rec += cognome.upper().ljust(50)[:50]
        
        # Pos 65-94: Nome (30 chars)
        rec += nome.upper().ljust(30)[:30]
        
        # Pos 95: Sesso (1=M, 2=F)
        sesso_code = "1" if sesso.upper() in ["M", "1", "MASCHIO"] else "2"
        rec += sesso_code
        
        # Pos 96-105: Data nascita (DD/MM/YYYY)
        rec += format_date_questura(data_nascita)
        
        # Pos 106-114: Comune nascita (9 chars) - codice catastale o nome
        rec += comune_nascita.upper().ljust(9)[:9]
        
        # Pos 115-116: Provincia nascita (2 chars)
        rec += provincia_nascita.upper().ljust(2)[:2]
        
        # Pos 117-125: Stato nascita (9 chars) - codice o nome
        stato_code = "100000100" if stato_nascita.upper() in ["ITALIA", "IT", "ITA", "ITALIANO"] else stato_nascita.upper().ljust(9)[:9]
        rec += stato_code
        
        # Pos 126-134: Cittadinanza (9 chars)
        citt_code = "100000100" if cittadinanza.upper() in ["ITALIA", "IT", "ITA", "ITALIANO", "ITALIANA"] else cittadinanza.upper().ljust(9)[:9]
        rec += citt_code
        
        # Pos 135-139: Tipo documento (5 chars) - IDENT, PATEN, PASOR, PAIDP, etc.
        doc_codes = {
            "CARTA_IDENTITA": "IDENT",
            "CARTID": "IDENT", 
            "IDENTITA": "IDENT",
            "PASSAPORTO": "PASOR",
            "PASOR": "PASOR",
            "PATENTE": "PATEN",
            "PATEN": "PATEN"
        }
        tipo_doc_code = doc_codes.get(tipo_doc.upper().replace(" ", "_").replace("'", ""), "IDENT")
        rec += tipo_doc_code.ljust(5)[:5]
        
        # Pos 140-159: Numero documento (20 chars)
        rec += numero_doc.upper().ljust(20)[:20]
        
        # Pos 160-168: Luogo rilascio (9 chars)
        rec += luogo_rilascio_doc.upper().ljust(9)[:9]
        
        return rec
    
    export_lines = []
    
    ospite = checkin.get("ospite_principale", {})
    if ospite and ospite.get("cognome"):
        line = build_record_168(
            tipo_alloggiato=16,  # Ospite singolo o capofamiglia se ci sono accompagnatori
            permanenza=permanenza,
            cognome=ospite.get("cognome", ""),
            nome=ospite.get("nome", ""),
            sesso=ospite.get("sesso", "M"),
            data_nascita=ospite.get("data_nascita", ""),
            comune_nascita=ospite.get("luogo_nascita", ""),
            provincia_nascita="",
            stato_nascita=ospite.get("nazionalita", "Italia"),
            cittadinanza=ospite.get("nazionalita", "Italia"),
            tipo_doc=ospite.get("tipo_documento", "carta_identita"),
            numero_doc=ospite.get("numero_documento", ""),
            luogo_rilascio_doc=ospite.get("luogo_rilascio", "")
        )
        export_lines.append(line)
    
    # Accompagnatori
    for acc in checkin.get("accompagnatori", []):
        if acc.get("cognome"):
            line = build_record_168(
                tipo_alloggiato=19,  # Familiare
                permanenza=permanenza,
                cognome=acc.get("cognome", ""),
                nome=acc.get("nome", ""),
                sesso=acc.get("sesso", "M"),
                data_nascita=acc.get("data_nascita", ""),
                comune_nascita=acc.get("luogo_nascita", ""),
                provincia_nascita="",
                stato_nascita=acc.get("nazionalita", "Italia"),
                cittadinanza=acc.get("nazionalita", "Italia"),
                tipo_doc=acc.get("tipo_documento", ""),
                numero_doc=acc.get("numero_documento", ""),
                luogo_rilascio_doc=""
            )
            export_lines.append(line)
    
    if not export_lines:
        raise HTTPException(status_code=400, detail="Nessun dato ospite disponibile per l'esportazione. Inserisci prima i dati dell'ospite.")
    
    return {
        "checkin_id": checkin_id,
        "count": len(export_lines),
        "data": export_lines,
        "format_info": "Formato 168 caratteri per Alloggiati Web. Salva come file .txt e carica sul portale della Questura."
    }

@api_router.get("/admin/checkins/{checkin_id}/paytourist-format")
async def get_paytourist_format(checkin_id: str, admin: dict = Depends(get_admin_user)):
    """
    Restituisce i dati del check-in formattati per PayTourist.
    L'utente può copiare questi dati e incollarli manualmente su PayTourist.
    """
    # Try to find in checkins collection first
    checkin = await db.checkins.find_one({"id": checkin_id}, {"_id": 0})
    source = "form"
    
    if not checkin:
        # Try online_checkins
        checkin = await db.online_checkins.find_one({"id": checkin_id}, {"_id": 0})
        source = "online"
    
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in non trovato")
    
    # Get booking data
    booking = await db.bookings.find_one({"id": checkin.get("booking_id")}, {"_id": 0})
    
    data_arrivo = checkin.get("data_arrivo") or (booking.get("data_arrivo") if booking else "")
    data_partenza = checkin.get("data_partenza") or (booking.get("data_partenza") if booking else "")
    
    ospite = checkin.get("ospite_principale", {})
    
    # Calculate nights
    nights = 1
    try:
        if data_arrivo and data_partenza:
            d1 = datetime.strptime(data_arrivo, "%Y-%m-%d")
            d2 = datetime.strptime(data_partenza, "%Y-%m-%d")
            nights = max(1, (d2 - d1).days)
    except:
        pass
    
    # Map guest type
    # 16=Ospite singolo, 17=Capofamiglia, 18=Capogruppo, 19=Familiare, 20=Membro gruppo
    num_ospiti = checkin.get("num_ospiti", 1) or (booking.get("num_ospiti") if booking else 1)
    tipo_ospite = "16" if num_ospiti == 1 else "17"  # Singolo o Capofamiglia
    
    # Map document type
    doc_type_map = {
        "carta_identita": "Carta d'identità",
        "passaporto": "Passaporto", 
        "patente": "Patente di guida",
        "CARTID": "Carta d'identità",
        "PASOR": "Passaporto",
        "PATEN": "Patente di guida"
    }
    
    doc_type = ospite.get("tipo_documento", "")
    doc_type_display = doc_type_map.get(doc_type, doc_type)
    
    # Map sex
    sesso = ospite.get("sesso", "")
    sesso_display = "Maschio" if sesso in ["M", "1"] else "Femmina" if sesso in ["F", "2"] else sesso
    
    # Build PayTourist formatted data
    paytourist_data = {
        "prenotazione": {
            "check_in": data_arrivo,
            "check_out": data_partenza,
            "notti": nights,
            "num_ospiti": num_ospiti,
            "codice_prenotazione": checkin.get("codice_prenotazione") or (booking.get("codice_prenotazione") if booking else ""),
        },
        "ospite_principale": {
            "nome": ospite.get("nome", ""),
            "cognome": ospite.get("cognome", ""),
            "tipo_ospite": tipo_ospite,
            "tipo_ospite_desc": "Ospite singolo" if tipo_ospite == "16" else "Capofamiglia",
            "sesso": sesso_display,
            "data_nascita": ospite.get("data_nascita", ""),
            "luogo_nascita": ospite.get("luogo_nascita", ""),
            "nazionalita": ospite.get("nazionalita", "Italia"),
            "residenza_stato": ospite.get("residenza_stato", "Italia"),
            "residenza_citta": ospite.get("residenza_citta", ""),
            "documento": {
                "tipo": doc_type_display,
                "numero": ospite.get("numero_documento", ""),
                "rilasciato_da": ospite.get("luogo_rilascio", ""),
                "scadenza": ospite.get("scadenza_documento", "")
            }
        },
        "accompagnatori": []
    }
    
    # Add accompanying guests
    for i, acc in enumerate(checkin.get("accompagnatori", [])):
        acc_sesso = acc.get("sesso", "")
        acc_sesso_display = "Maschio" if acc_sesso in ["M", "1"] else "Femmina" if acc_sesso in ["F", "2"] else acc_sesso
        
        paytourist_data["accompagnatori"].append({
            "nome": acc.get("nome", ""),
            "cognome": acc.get("cognome", ""),
            "tipo_ospite": "19",  # Familiare
            "tipo_ospite_desc": "Familiare",
            "sesso": acc_sesso_display,
            "data_nascita": acc.get("data_nascita", ""),
            "luogo_nascita": acc.get("luogo_nascita", ""),
            "nazionalita": acc.get("nazionalita", "Italia"),
        })
    
    # Generate copyable text format
    text_format = f"""=== DATI PER PAYTOURIST ===
PRENOTAZIONE:
- Check-in: {data_arrivo}
- Check-out: {data_partenza}
- Notti: {nights}
- Ospiti: {num_ospiti}

OSPITE PRINCIPALE:
- Nome: {ospite.get('nome', '')}
- Cognome: {ospite.get('cognome', '')}
- Tipo: {paytourist_data['ospite_principale']['tipo_ospite_desc']}
- Sesso: {sesso_display}
- Data nascita: {ospite.get('data_nascita', '')}
- Luogo nascita: {ospite.get('luogo_nascita', '')}
- Nazionalità: {ospite.get('nazionalita', 'Italia')}
- Documento: {doc_type_display} - {ospite.get('numero_documento', '')}
"""
    
    for i, acc in enumerate(paytourist_data["accompagnatori"]):
        text_format += f"""
ACCOMPAGNATORE {i+1}:
- Nome: {acc['nome']}
- Cognome: {acc['cognome']}
- Sesso: {acc['sesso']}
- Data nascita: {acc['data_nascita']}
- Nazionalità: {acc['nazionalita']}
"""
    
    return {
        "checkin_id": checkin_id,
        "structured_data": paytourist_data,
        "text_format": text_format,
        "paytourist_url": "https://capaccio.paytourist.com"
    }

@api_router.delete("/admin/checkins/invalidate/{booking_id}")
async def admin_invalidate_checkin(booking_id: str, admin: dict = Depends(get_admin_user)):
    """
    Invalida/annulla il check-in per una prenotazione.
    Usare se bisogna far rifare il check-in all'ospite.
    """
    # Trova la prenotazione
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    # Elimina il check-in se esiste
    await db.online_checkins.delete_many({"booking_id": booking_id})
    
    # Aggiorna la prenotazione
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"checkin_online_completato": False}}
    )
    
    return {"message": "Check-in invalidato", "booking_id": booking_id}

# ==================== ADMIN NOTIFICATIONS ====================

@api_router.get("/admin/notifications", response_model=List[NotificationResponse])
async def admin_get_notifications(admin: dict = Depends(get_admin_user)):
    """Get all notifications (admin)"""
    notifications = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return notifications

@api_router.post("/admin/notifications", response_model=NotificationResponse)
async def admin_create_notification(data: NotificationCreate, admin: dict = Depends(get_admin_user)):
    """Create a new notification (to all or specific user)"""
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "titolo": data.titolo,
        "messaggio": data.messaggio,
        "tipo": data.tipo,
        "destinatario_id": data.destinatario_id,  # None = broadcast to all
        "link": data.link,
        "letto": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    return NotificationResponse(**notification_doc)

@api_router.post("/admin/notifications/broadcast")
async def admin_broadcast_notification(data: NotificationCreate, admin: dict = Depends(get_admin_user)):
    """Send notification to all guests"""
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "titolo": data.titolo,
        "messaggio": data.messaggio,
        "tipo": data.tipo,
        "destinatario_id": None,  # Broadcast
        "link": data.link,
        "letto": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    # Count guests
    guest_count = await db.guests.count_documents({"is_admin": {"$ne": True}})
    
    return {
        "message": f"Notifica inviata a {guest_count} ospiti",
        "notification": NotificationResponse(**notification_doc)
    }

@api_router.delete("/admin/notifications/{notification_id}")
async def admin_delete_notification(notification_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    # Also delete read records
    await db.notification_reads.delete_many({"notification_id": notification_id})
    return {"message": "Notifica eliminata"}

# ==================== PUSH NOTIFICATIONS ====================

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Get the VAPID public key for push notification subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"public_key": VAPID_PUBLIC_KEY}

@api_router.post("/push/subscribe")
async def subscribe_push(subscription: PushSubscription, user: dict = Depends(get_current_user)):
    """Subscribe to push notifications"""
    subscription_doc = {
        "user_id": user["id"],
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update or insert subscription
    await db.push_subscriptions.update_one(
        {"user_id": user["id"], "endpoint": subscription.endpoint},
        {"$set": subscription_doc},
        upsert=True
    )
    
    return {"message": "Iscrizione alle notifiche push completata"}

@api_router.delete("/push/unsubscribe")
async def unsubscribe_push(user: dict = Depends(get_current_user)):
    """Unsubscribe from push notifications"""
    await db.push_subscriptions.delete_many({"user_id": user["id"]})
    return {"message": "Disiscrizione completata"}

@api_router.post("/admin/push/send")
async def admin_send_push(data: dict, admin: dict = Depends(get_admin_user)):
    """Send push notification to users (admin only)"""
    if not WEBPUSH_AVAILABLE:
        raise HTTPException(status_code=503, detail="pywebpush not installed")
    
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="VAPID keys not configured")
    
    title = data.get("title", "La Maisonette di Paestum")
    body = data.get("body", "")
    url = data.get("url", "/")
    user_id = data.get("user_id")  # None = broadcast to all
    
    # Get subscriptions
    query = {"user_id": user_id} if user_id else {}
    subscriptions = await db.push_subscriptions.find(query, {"_id": 0}).to_list(1000)
    
    if not subscriptions:
        return {"message": "Nessuna iscrizione push trovata", "sent": 0}
    
    sent_count = 0
    failed_count = 0
    
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"]
                },
                data=json.dumps({
                    "title": title,
                    "body": body,
                    "url": url,
                    "icon": "/icons/icon-192x192.png"
                }),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": f"mailto:{VAPID_EMAIL}"
                }
            )
            sent_count += 1
        except WebPushException as e:
            failed_count += 1
            # Remove invalid subscription
            if e.response and e.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
        except Exception as e:
            failed_count += 1
            logging.error(f"Push notification error: {e}")
    
    return {
        "message": f"Notifiche inviate: {sent_count}, fallite: {failed_count}",
        "sent": sent_count,
        "failed": failed_count
    }

# ==================== ADMIN LOYALTY REWARDS ====================

@api_router.get("/admin/loyalty/transactions")
async def admin_get_loyalty_transactions(admin: dict = Depends(get_admin_user)):
    """Get all loyalty transactions for admin"""
    transactions = await db.loyalty_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return transactions

@api_router.post("/admin/loyalty/add")
async def admin_add_loyalty_points(data: dict, admin: dict = Depends(get_admin_user)):
    """Add loyalty points to a guest (admin)"""
    guest_id = data.get("guest_id")
    punti = data.get("punti")
    descrizione = data.get("descrizione")
    
    if not guest_id:
        raise HTTPException(status_code=400, detail="guest_id richiesto")
    if punti is None:
        raise HTTPException(status_code=400, detail="punti richiesto")
    
    punti = int(punti)
    
    guest = await db.guests.find_one({"id": guest_id})
    if not guest:
        raise HTTPException(status_code=404, detail="Ospite non trovato")
    
    # Update guest points
    await db.guests.update_one(
        {"id": guest_id},
        {"$inc": {"punti_fedelta": punti}}
    )
    
    # Create transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "guest_id": guest_id,
        "punti": punti,
        "tipo": "guadagno" if punti > 0 else "riscatto",
        "descrizione": descrizione or f"Punti {'aggiunti' if punti > 0 else 'rimossi'} da admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty_transactions.insert_one(transaction)
    
    return {
        "message": f"{punti} punti {'aggiunti' if punti > 0 else 'rimossi'} con successo",
        "nuovo_totale": (guest.get("punti_fedelta", 0) or 0) + punti
    }

@api_router.get("/admin/loyalty-rewards", response_model=List[LoyaltyRewardResponse])
async def admin_get_loyalty_rewards(admin: dict = Depends(get_admin_user)):
    rewards = await db.loyalty_rewards.find({}, {"_id": 0}).sort("ordine", 1).to_list(100)
    return rewards

@api_router.post("/admin/loyalty-rewards", response_model=LoyaltyRewardResponse)
async def admin_create_loyalty_reward(data: LoyaltyRewardCreate, admin: dict = Depends(get_admin_user)):
    reward_id = str(uuid.uuid4())
    reward_doc = {"id": reward_id, **data.model_dump()}
    await db.loyalty_rewards.insert_one(reward_doc)
    return LoyaltyRewardResponse(**reward_doc)

@api_router.put("/admin/loyalty-rewards/{reward_id}", response_model=LoyaltyRewardResponse)
async def admin_update_loyalty_reward(reward_id: str, data: LoyaltyRewardCreate, admin: dict = Depends(get_admin_user)):
    result = await db.loyalty_rewards.update_one({"id": reward_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Premio non trovato")
    reward = await db.loyalty_rewards.find_one({"id": reward_id}, {"_id": 0})
    return LoyaltyRewardResponse(**reward)

@api_router.delete("/admin/loyalty-rewards/{reward_id}")
async def admin_delete_loyalty_reward(reward_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.loyalty_rewards.delete_one({"id": reward_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Premio non trovato")
    return {"message": "Premio eliminato"}

# ==================== ADMIN GALLERY ====================

@api_router.get("/admin/gallery", response_model=List[GalleryImageResponse])
async def admin_get_gallery(admin: dict = Depends(get_admin_user)):
    images = await db.gallery.find({}, {"_id": 0}).sort("ordine", 1).to_list(100)
    return images

@api_router.post("/admin/gallery", response_model=GalleryImageResponse)
async def admin_create_gallery_image(data: GalleryImageCreate, admin: dict = Depends(get_admin_user)):
    image_id = str(uuid.uuid4())
    image_doc = {"id": image_id, **data.model_dump()}
    await db.gallery.insert_one(image_doc)
    return GalleryImageResponse(**image_doc)

@api_router.put("/admin/gallery/{image_id}", response_model=GalleryImageResponse)
async def admin_update_gallery_image(image_id: str, data: GalleryImageCreate, admin: dict = Depends(get_admin_user)):
    result = await db.gallery.update_one({"id": image_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Immagine non trovata")
    image = await db.gallery.find_one({"id": image_id}, {"_id": 0})
    return GalleryImageResponse(**image)

@api_router.delete("/admin/gallery/{image_id}")
async def admin_delete_gallery_image(image_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.gallery.delete_one({"id": image_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Immagine non trovata")
    return {"message": "Immagine eliminata"}

# ==================== ADMIN AMENITIES ====================

@api_router.get("/admin/amenities", response_model=List[AmenityResponse])
async def admin_get_amenities(admin: dict = Depends(get_admin_user)):
    amenities = await db.amenities.find({}, {"_id": 0}).sort("ordine", 1).to_list(100)
    return amenities

@api_router.post("/admin/amenities", response_model=AmenityResponse)
async def admin_create_amenity(data: AmenityCreate, admin: dict = Depends(get_admin_user)):
    amenity_id = str(uuid.uuid4())
    amenity_doc = {"id": amenity_id, **data.model_dump()}
    await db.amenities.insert_one(amenity_doc)
    return AmenityResponse(**amenity_doc)

@api_router.put("/admin/amenities/{amenity_id}", response_model=AmenityResponse)
async def admin_update_amenity(amenity_id: str, data: AmenityCreate, admin: dict = Depends(get_admin_user)):
    result = await db.amenities.update_one({"id": amenity_id}, {"$set": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    amenity = await db.amenities.find_one({"id": amenity_id}, {"_id": 0})
    return AmenityResponse(**amenity)

@api_router.delete("/admin/amenities/{amenity_id}")
async def admin_delete_amenity(amenity_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.amenities.delete_one({"id": amenity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    return {"message": "Servizio eliminato"}

# ==================== ADMIN BOOKINGS ====================

@api_router.get("/admin/bookings", response_model=List[BookingResponse])
async def admin_get_bookings(admin: dict = Depends(get_admin_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with unit name
    for booking in bookings:
        unit = await db.units.find_one({"id": booking["unit_id"]}, {"_id": 0, "nome": 1})
        if unit:
            booking["unit_nome"] = unit["nome"]
    
    return bookings

@api_router.post("/admin/bookings", response_model=BookingResponse)
async def admin_create_booking(data: AdminBookingCreate, admin: dict = Depends(get_admin_user)):
    """
    Crea una nuova prenotazione manualmente (admin).
    Può usare un cliente esistente (guest_id) o crearne uno nuovo.
    Genera automaticamente un codice prenotazione univoco.
    """
    unit = await db.units.find_one({"id": data.unit_id, "attivo": True}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unità non trovata o non attiva")
    
    # Verifica date
    from datetime import datetime as dt
    arrivo = dt.strptime(data.data_arrivo, "%Y-%m-%d")
    partenza = dt.strptime(data.data_partenza, "%Y-%m-%d")
    
    if arrivo >= partenza:
        raise HTTPException(status_code=400, detail="La data di partenza deve essere successiva all'arrivo")
    
    if data.num_ospiti > unit["capacita_max"]:
        raise HTTPException(status_code=400, detail=f"Capacità massima: {unit['capacita_max']} ospiti")
    
    # Check for conflicting bookings (solo confermate o pending)
    existing = await db.bookings.find_one({
        "unit_id": data.unit_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"data_arrivo": {"$lt": data.data_partenza}, "data_partenza": {"$gt": data.data_arrivo}}
        ]
    })
    if existing:
        raise HTTPException(status_code=409, detail="Date non disponibili - già prenotato")
    
    # Calcola prezzo se non fornito
    prezzo_totale = data.prezzo_totale
    if prezzo_totale is None:
        price_response = await get_unit_price(data.unit_id, data.data_arrivo, data.data_partenza)
        prezzo_totale = price_response["prezzo_totale"]
    
    booking_id = str(uuid.uuid4())
    codice_prenotazione = generate_booking_code()
    
    # Assicurati che il codice sia univoco
    while await db.bookings.find_one({"codice_prenotazione": codice_prenotazione}):
        codice_prenotazione = generate_booking_code()
    
    # Gestione ospite: esistente o nuovo
    if data.guest_id:
        # Usa cliente esistente
        existing_guest = await db.guests.find_one({"id": data.guest_id}, {"_id": 0})
        if not existing_guest:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        guest_id = existing_guest["id"]
        nome_ospite = f"{existing_guest.get('nome', '')} {existing_guest.get('cognome', '')}".strip()
        email_ospite = existing_guest.get("email", "")
        telefono_ospite = existing_guest.get("telefono", "")
        
        # Aggiorna il codice prenotazione dell'ospite
        await db.guests.update_one(
            {"id": guest_id},
            {"$set": {"codice_prenotazione": codice_prenotazione}}
        )
    else:
        # Crea nuovo cliente o trova esistente per email
        if not data.email_ospite or not data.nome_ospite:
            raise HTTPException(status_code=400, detail="Email e nome ospite sono obbligatori per nuovi clienti")
        
        guest_email = data.email_ospite.lower()
        existing_guest = await db.guests.find_one({"email": guest_email}, {"_id": 0})
        
        if existing_guest:
            # Ospite esiste già per email, usa il suo ID
            guest_id = existing_guest["id"]
            nome_ospite = data.nome_ospite
            email_ospite = guest_email
            telefono_ospite = data.telefono_ospite or existing_guest.get("telefono", "")
            
            # Aggiorna il codice prenotazione
            await db.guests.update_one(
                {"id": guest_id},
                {"$set": {"codice_prenotazione": codice_prenotazione}}
            )
        else:
            # Crea nuovo account ospite
            guest_id = str(uuid.uuid4())
            nome_parts = data.nome_ospite.strip().split(' ', 1)
            nome = nome_parts[0] if nome_parts else data.nome_ospite
            cognome = nome_parts[1] if len(nome_parts) > 1 else ''
            
            guest_doc = {
                "id": guest_id,
                "nome": nome,
                "cognome": cognome,
                "email": guest_email,
                "password_hash": hash_password(codice_prenotazione),
                "telefono": data.telefono_ospite or "",
                "punti_fedelta": 0,
                "is_admin": False,
                "codice_prenotazione": codice_prenotazione,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.guests.insert_one(guest_doc)
            
            nome_ospite = data.nome_ospite
            email_ospite = guest_email
            telefono_ospite = data.telefono_ospite or ""
    
    booking_doc = {
        "id": booking_id,
        "unit_id": data.unit_id,
        "guest_id": guest_id,
        "codice_prenotazione": codice_prenotazione,
        "data_arrivo": data.data_arrivo,
        "data_partenza": data.data_partenza,
        "num_ospiti": data.num_ospiti,
        "prezzo_totale": prezzo_totale,
        "status": data.status,
        "note": data.note,
        "nome_ospite": nome_ospite,
        "email_ospite": email_ospite,
        "telefono_ospite": telefono_ospite,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    booking_doc["unit_nome"] = unit["nome"]
    
    # Send notification email to admin
    try:
        await send_booking_notification(booking_doc, unit["nome"])
    except Exception as e:
        print(f"⚠️ Could not send notification email: {e}")
    
    return BookingResponse(**booking_doc)

@api_router.put("/admin/bookings/{booking_id}/status")
async def admin_update_booking_status(booking_id: str, status: str, admin: dict = Depends(get_admin_user)):
    if status not in ["pending", "confirmed", "cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Status non valido")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    return {"message": "Status aggiornato"}

@api_router.put("/admin/bookings/{booking_id}")
async def admin_update_booking(booking_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update booking details - creates/updates guest if email provided"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    # Build update data
    update_data = {}
    allowed_fields = [
        "nome_ospite", "email_ospite", "telefono_ospite",
        "data_arrivo", "data_partenza", "num_ospiti",
        "note", "prezzo_totale", "status"
    ]
    
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    
    # Validate status if provided
    if "status" in update_data and update_data["status"] not in ["pending", "confirmed", "cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Status non valido")
    
    # Gestione ospite
    email_ospite = data.get("email_ospite", "").strip().lower()
    nome_ospite = data.get("nome_ospite", booking.get("nome_ospite", ""))
    telefono_ospite = data.get("telefono_ospite", booking.get("telefono_ospite", ""))
    
    # Se l'email è valida (non placeholder)
    is_valid_email = email_ospite and "@" in email_ospite and "temp.com" not in email_ospite and "noemail" not in email_ospite
    
    if is_valid_email:
        existing_guest_id = booking.get("guest_id")
        
        # Check if guest with this email already exists
        existing_guest_by_email = await db.guests.find_one({"email": email_ospite}, {"_id": 0})
        
        if existing_guest_by_email:
            # Guest exists with this email, link to booking
            update_data["guest_id"] = existing_guest_by_email["id"]
            # Update guest info
            await db.guests.update_one(
                {"id": existing_guest_by_email["id"]},
                {"$set": {
                    "codice_prenotazione": booking.get("codice_prenotazione", ""),
                    "telefono": telefono_ospite or existing_guest_by_email.get("telefono", "")
                }}
            )
            print(f"✅ Linked existing guest {existing_guest_by_email['id']} to booking {booking_id}")
            
            # Delete old temp guest if different
            if existing_guest_id and existing_guest_id != existing_guest_by_email["id"]:
                old_guest = await db.guests.find_one({"id": existing_guest_id}, {"_id": 0})
                if old_guest and ("temp.com" in old_guest.get("email", "") or "noemail" in old_guest.get("email", "")):
                    await db.guests.delete_one({"id": existing_guest_id})
                    print(f"🗑️ Deleted temp guest {existing_guest_id}")
                    
        elif existing_guest_id:
            # Update existing guest with new email
            old_guest = await db.guests.find_one({"id": existing_guest_id}, {"_id": 0})
            if old_guest:
                old_email = old_guest.get("email", "")
                # If old email was temp, update it
                if "temp.com" in old_email or "noemail" in old_email:
                    nome_parts = nome_ospite.strip().split(' ', 1) if nome_ospite else [""]
                    await db.guests.update_one(
                        {"id": existing_guest_id},
                        {"$set": {
                            "email": email_ospite,
                            "nome": nome_parts[0],
                            "cognome": nome_parts[1] if len(nome_parts) > 1 else "",
                            "telefono": telefono_ospite,
                            "codice_prenotazione": booking.get("codice_prenotazione", "")
                        }}
                    )
                    print(f"✅ Updated guest {existing_guest_id} with real email {email_ospite}")
        else:
            # No guest exists, create new one
            guest_id = str(uuid.uuid4())
            nome_parts = nome_ospite.strip().split(' ', 1) if nome_ospite else ["Guest"]
            nome = nome_parts[0]
            cognome = nome_parts[1] if len(nome_parts) > 1 else ""
            codice = booking.get("codice_prenotazione", generate_booking_code())
            
            guest_doc = {
                "id": guest_id,
                "nome": nome,
                "cognome": cognome,
                "email": email_ospite,
                "password_hash": hash_password(codice),
                "telefono": telefono_ospite,
                "punti_fedelta": 0,
                "is_admin": False,
                "codice_prenotazione": codice,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.guests.insert_one(guest_doc)
            update_data["guest_id"] = guest_id
            print(f"✅ Created new guest {guest_id} for booking {booking_id}")
    
    # Update booking
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": update_data}
    )
    
    # Get updated booking
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/bookings/{booking_id}")
async def admin_delete_booking(booking_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.bookings.delete_one({"id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    return {"message": "Prenotazione eliminata"}

# ==================== SEED DATA ====================

@api_router.post("/admin/seed")
async def seed_data(admin: dict = Depends(get_admin_user)):
    # Seed Units (Casette)
    units = [
        {"id": str(uuid.uuid4()), "nome": "Casetta 1", "descrizione": "Casetta accogliente con tetto in legno, vista sugli ulivi. Perfetta per coppie o famiglie.", "capacita_max": 5, "prezzo_base": 90.0, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Casetta 2", "descrizione": "Casetta gemella con tetto in legno, atmosfera rilassante. Ideale per soggiorni romantici.", "capacita_max": 5, "prezzo_base": 90.0, "attivo": True},
    ]
    
    for u in units:
        await db.units.update_one({"nome": u["nome"]}, {"$set": u}, upsert=True)
    
    # Seed structures with coordinates
    structures = [
        {"id": str(uuid.uuid4()), "nome": "Farmacia Comunale Capaccio", "tipo": "farmacia", "indirizzo": "Via Magna Grecia, 123 - Capaccio Paestum", "telefono": "0828 811234", "orari": "Lun-Sab 8:30-13:00, 16:00-20:00", "coordinate": {"lat": 40.4231, "lng": 15.0056}},
        {"id": str(uuid.uuid4()), "nome": "Farmacia Paestum", "tipo": "farmacia", "indirizzo": "Via Nettuno, 45 - Paestum", "telefono": "0828 811567", "orari": "Lun-Dom 9:00-21:00", "coordinate": {"lat": 40.4195, "lng": 15.0048}},
        {"id": str(uuid.uuid4()), "nome": "Banca Intesa Sanpaolo", "tipo": "banca", "indirizzo": "Piazza Santini, 1 - Capaccio", "telefono": "0828 725100", "orari": "Lun-Ven 8:30-13:30, 14:45-16:15", "coordinate": {"lat": 40.4352, "lng": 15.0821}},
        {"id": str(uuid.uuid4()), "nome": "UniCredit", "tipo": "banca", "indirizzo": "Via Italia, 78 - Capaccio Paestum", "telefono": "0828 725200", "orari": "Lun-Ven 8:20-13:20, 14:40-16:10", "coordinate": {"lat": 40.4285, "lng": 15.0112}},
        {"id": str(uuid.uuid4()), "nome": "ATM Poste Italiane", "tipo": "atm", "indirizzo": "Via Magna Grecia, 200 - Paestum", "telefono": None, "orari": "24/7", "coordinate": {"lat": 40.4208, "lng": 15.0062}},
        {"id": str(uuid.uuid4()), "nome": "ATM BCC", "tipo": "atm", "indirizzo": "Piazza Veneto, 5 - Capaccio", "telefono": None, "orari": "24/7", "coordinate": {"lat": 40.4348, "lng": 15.0815}},
        {"id": str(uuid.uuid4()), "nome": "Museo Archeologico Nazionale di Paestum", "tipo": "museo", "indirizzo": "Via Magna Grecia, 919 - Paestum", "telefono": "0828 811023", "orari": "Mar-Dom 8:30-19:30 (ultimo ingresso 18:50)", "descrizione": "Uno dei più importanti musei archeologici d'Italia, ospita i famosi affreschi della Tomba del Tuffatore.", "coordinate": {"lat": 40.4213, "lng": 15.0052}},
        {"id": str(uuid.uuid4()), "nome": "Parco Archeologico di Paestum", "tipo": "parco", "indirizzo": "Via Magna Grecia - Paestum", "telefono": "0828 811023", "orari": "Tutti i giorni 8:30-19:30", "descrizione": "Sito UNESCO con i tre magnifici templi dorici: Tempio di Hera, Tempio di Nettuno e Tempio di Cerere.", "coordinate": {"lat": 40.4199, "lng": 15.0048}},
        {"id": str(uuid.uuid4()), "nome": "Museo Narrante di Hera Argiva", "tipo": "museo", "indirizzo": "Foce del Sele - Capaccio Paestum", "telefono": "0828 811016", "orari": "Mar-Dom 9:00-17:00", "descrizione": "Museo multimediale dedicato al santuario di Hera alla foce del Sele.", "coordinate": {"lat": 40.4678, "lng": 14.9412}},
    ]
    
    for s in structures:
        await db.structures.update_one({"nome": s["nome"]}, {"$set": s}, upsert=True)
    
    # Seed events
    events = [
        {"id": str(uuid.uuid4()), "titolo": "Notte dei Templi", "descrizione": "Visita notturna guidata al Parco Archeologico con illuminazione scenografica dei templi.", "data": "2025-07-15", "ora": "21:00", "luogo": "Parco Archeologico di Paestum", "categoria": "cultura", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "titolo": "Festival del Mozzarella di Bufala", "descrizione": "Degustazioni, cooking show e mercato dei produttori locali.", "data": "2025-08-10", "ora": "18:00", "luogo": "Piazza Basilica - Paestum", "categoria": "gastronomia", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "titolo": "Concerto all'Alba", "descrizione": "Musica classica al sorgere del sole tra le colonne del Tempio di Nettuno.", "data": "2025-06-21", "ora": "05:30", "luogo": "Tempio di Nettuno", "categoria": "musica", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    for e in events:
        await db.events.update_one({"titolo": e["titolo"]}, {"$set": e}, upsert=True)
    
    # Seed services with different interaction types
    services = [
        {"id": str(uuid.uuid4()), "nome": "Ombrellone in Spiaggia", "descrizione": "Ombrellone e lettini riservati presso le nostre spiagge convenzionate a pochi minuti dalla struttura.", "categoria": "spiaggia", "prezzo": 25.0, "gratuito": False, "icona": "Umbrella", "disponibile": True, "tipo_interazione": "booking"},
        {"id": str(uuid.uuid4()), "nome": "Biancheria Supplementare", "descrizione": "Set aggiuntivo di lenzuola, asciugamani e accappatoi di alta qualità.", "categoria": "comfort", "prezzo": 10.0, "gratuito": False, "icona": "Shirt", "disponibile": True, "tipo_interazione": "booking"},
        {"id": str(uuid.uuid4()), "nome": "Trasferimento NCC", "descrizione": "Servizio di trasferimento privato da/per aeroporto, stazione o altre destinazioni con autista.", "categoria": "trasporti", "prezzo": None, "gratuito": False, "icona": "Car", "disponibile": True, "tipo_interazione": "booking"},
        {"id": str(uuid.uuid4()), "nome": "WiFi Gratuito", "descrizione": "Connessione WiFi ad alta velocità gratuita in tutta la struttura.", "categoria": "comfort", "prezzo": None, "gratuito": True, "icona": "Wifi", "disponibile": True, "tipo_interazione": "info", "info_extra": "MaisonettePaestum2024"},
        {"id": str(uuid.uuid4()), "nome": "La Nostra Enoteca", "descrizione": "Selezione di vini locali DOC e DOCG della Campania. Ordina e metti sul conto!", "categoria": "shop", "prezzo": None, "gratuito": False, "icona": "Wine", "disponibile": True, "tipo_interazione": "shop"},
        {"id": str(uuid.uuid4()), "nome": "Escursioni in Barca", "descrizione": "Tour in barca lungo la costa cilentana, con soste per bagni e snorkeling. Costiera Amalfitana, Capri, Li Galli.", "categoria": "esperienze", "prezzo": None, "gratuito": False, "icona": "Ship", "disponibile": True, "tipo_interazione": "booking"},
        {"id": str(uuid.uuid4()), "nome": "La Nostra Vetrina", "descrizione": "Prodotti tipici locali: mozzarella di bufala DOP, olio EVO, limoncello, ceramiche. Ordina e metti sul conto!", "categoria": "shop", "prezzo": None, "gratuito": False, "icona": "ShoppingBag", "disponibile": True, "tipo_interazione": "shop"},
        {"id": str(uuid.uuid4()), "nome": "Colazione su Richiesta", "descrizione": "Colazione con prodotti freschi locali servita in camera o nel nostro spazio comune.", "categoria": "comfort", "prezzo": 12.0, "gratuito": False, "icona": "Coffee", "disponibile": True, "tipo_interazione": "booking"},
    ]
    
    for s in services:
        await db.services.update_one({"nome": s["nome"]}, {"$set": s}, upsert=True)
    
    # Seed products for shop/enoteca
    products = [
        # Vini
        {"id": str(uuid.uuid4()), "nome": "Aglianico del Cilento DOC", "descrizione": "Vino rosso corposo dal Cilento. 750ml", "categoria": "vino", "prezzo": 18.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Fiano di Avellino DOCG", "descrizione": "Vino bianco aromatico campano. 750ml", "categoria": "vino", "prezzo": 22.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Greco di Tufo DOCG", "descrizione": "Vino bianco fresco e minerale. 750ml", "categoria": "vino", "prezzo": 20.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Taurasi DOCG", "descrizione": "Il 'Barolo del Sud'. Vino rosso pregiato. 750ml", "categoria": "vino", "prezzo": 35.0, "disponibile": True},
        # Prodotti tipici
        {"id": str(uuid.uuid4()), "nome": "Mozzarella di Bufala DOP", "descrizione": "Freschissima, produzione locale. 500g", "categoria": "formaggi", "prezzo": 12.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Olio EVO Cilento DOP", "descrizione": "Olio extravergine di oliva. 500ml", "categoria": "olio", "prezzo": 15.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Limoncello Artigianale", "descrizione": "Fatto con limoni della Costiera. 500ml", "categoria": "liquori", "prezzo": 14.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Colatura di Alici di Cetara", "descrizione": "Antica salsa di pesce. 100ml", "categoria": "specialita", "prezzo": 18.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Ceramica Vietrese - Piatto", "descrizione": "Piatto decorato a mano. 25cm", "categoria": "souvenir", "prezzo": 35.0, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Magnete Templi di Paestum", "descrizione": "Souvenir ceramica", "categoria": "souvenir", "prezzo": 8.0, "disponibile": True},
    ]
    
    for p in products:
        await db.products.update_one({"nome": p["nome"]}, {"$set": p}, upsert=True)
    
    # Seed house rules
    house_rules = [
        {"id": str(uuid.uuid4()), "titolo": "Orario Check-in", "contenuto": "Il check-in è disponibile dalle ore 15:00 alle ore 20:00. Per arrivi al di fuori di questi orari, vi preghiamo di contattarci in anticipo al +39 393 4957532.", "categoria": "checkin", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Documenti Richiesti", "contenuto": "All'arrivo è necessario presentare un documento d'identità valido per tutti gli ospiti. Per gli ospiti stranieri è richiesto il passaporto.", "categoria": "checkin", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Orario Check-out", "contenuto": "Il check-out deve essere effettuato entro le ore 10:00. Late check-out disponibile su richiesta (soggetto a disponibilità e supplemento).", "categoria": "checkout", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Riconsegna Chiavi", "contenuto": "Le chiavi devono essere riconsegnate alla reception o lasciate nell'apposita cassetta all'uscita.", "categoria": "checkout", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Silenzio", "contenuto": "Si prega di rispettare il silenzio dalle ore 22:00 alle ore 08:00 per garantire il riposo di tutti gli ospiti.", "categoria": "soggiorno", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Divieto di Fumo", "contenuto": "È vietato fumare all'interno della struttura. Aree fumatori disponibili all'esterno.", "categoria": "soggiorno", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Animali Domestici", "contenuto": "Gli animali domestici di piccola taglia sono ammessi previo accordo. Supplemento di €10/notte.", "categoria": "soggiorno", "ordine": 3, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Parcheggio", "contenuto": "Parcheggio gratuito disponibile all'interno della struttura. Non custodito.", "categoria": "soggiorno", "ordine": 4, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Rifiuti", "contenuto": "Vi preghiamo di effettuare la raccolta differenziata secondo le indicazioni presenti in camera.", "categoria": "soggiorno", "ordine": 5, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Emergenze", "contenuto": "In caso di emergenza contattare il 112. Numeri utili e piano di evacuazione disponibili in camera.", "categoria": "sicurezza", "ordine": 1, "attivo": True},
    ]
    
    for r in house_rules:
        await db.house_rules.update_one({"titolo": r["titolo"]}, {"$set": r}, upsert=True)
    
    # Seed itineraries for weather-based suggestions
    itineraries = [
        # Sunny weather itineraries
        {"id": str(uuid.uuid4()), "nome": "Spiagge del Cilento", "descrizione": "Scopri le spiagge più belle del Cilento: Trentova, Baia di Trentova, Marina di Camerota.", "condizione_meteo": "sunny", "categoria": "spiaggia", "luogo": "Costa Cilentana", "durata": "Giornata intera", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Parco Archeologico di Paestum", "descrizione": "Visita i magnifici templi dorici patrimonio UNESCO. Ideale nelle giornate soleggiate per ammirare i giochi di luce sulle colonne.", "condizione_meteo": "sunny", "categoria": "cultura", "luogo": "Paestum", "durata": "2-3 ore", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Escursione in Barca a Capri", "descrizione": "Gita in barca verso l'isola di Capri con bagno alla Grotta Azzurra.", "condizione_meteo": "sunny", "categoria": "natura", "luogo": "Capri", "durata": "Giornata intera", "ordine": 3, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Oasi WWF di Persano", "descrizione": "Passeggiata naturalistica nell'oasi protetta lungo il fiume Sele.", "condizione_meteo": "sunny", "categoria": "natura", "luogo": "Persano", "durata": "Mezza giornata", "ordine": 4, "attivo": True},
        # Cloudy weather itineraries
        {"id": str(uuid.uuid4()), "nome": "Museo Archeologico di Paestum", "descrizione": "Ammira la Tomba del Tuffatore e i reperti della Magna Grecia in un museo di fama mondiale.", "condizione_meteo": "cloudy", "categoria": "cultura", "luogo": "Paestum", "durata": "2-3 ore", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Degustazione Mozzarella di Bufala", "descrizione": "Visita un caseificio locale e scopri come nasce la vera mozzarella di bufala DOP.", "condizione_meteo": "cloudy", "categoria": "gastronomia", "luogo": "Paestum", "durata": "2 ore", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Certosa di Padula", "descrizione": "Visita la più grande certosa d'Italia, patrimonio UNESCO, con i suoi magnifici chiostri.", "condizione_meteo": "cloudy", "categoria": "cultura", "luogo": "Padula", "durata": "Mezza giornata", "ordine": 3, "attivo": True},
        # Rainy weather itineraries
        {"id": str(uuid.uuid4()), "nome": "Grotte di Castelcivita", "descrizione": "Esplora le spettacolari grotte sotterranee con stalattiti e stalagmiti millenarie.", "condizione_meteo": "rainy", "categoria": "natura", "luogo": "Castelcivita", "durata": "2 ore", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Terme di Contursi", "descrizione": "Rilassati nelle acque termali naturali. Perfetto per una giornata di pioggia.", "condizione_meteo": "rainy", "categoria": "relax", "luogo": "Contursi Terme", "durata": "Mezza giornata", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Shopping a Salerno", "descrizione": "Passeggia sotto i portici del centro storico di Salerno con shopping e caffè.", "condizione_meteo": "rainy", "categoria": "gastronomia", "luogo": "Salerno", "durata": "Mezza giornata", "ordine": 3, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Cooking Class Cilentana", "descrizione": "Impara a preparare i piatti tipici della tradizione cilentana con uno chef locale.", "condizione_meteo": "rainy", "categoria": "gastronomia", "luogo": "Paestum", "durata": "3 ore", "ordine": 4, "attivo": True},
        # Cold weather itineraries
        {"id": str(uuid.uuid4()), "nome": "Terme Stufe di Nerone", "descrizione": "Terme naturali con saune e piscine calde. Ideale per riscaldarsi nelle giornate fredde.", "condizione_meteo": "cold", "categoria": "relax", "luogo": "Bacoli", "durata": "Mezza giornata", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Reggia di Caserta", "descrizione": "Visita la magnifica reggia borbonica con i suoi appartamenti reali e il parco.", "condizione_meteo": "cold", "categoria": "cultura", "luogo": "Caserta", "durata": "Giornata intera", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Tour Enogastronomico", "descrizione": "Visita cantine locali e assaggia i vini DOC del Cilento accompagnati da prodotti tipici.", "condizione_meteo": "cold", "categoria": "gastronomia", "luogo": "Cilento", "durata": "Mezza giornata", "ordine": 3, "attivo": True},
    ]
    
    for i in itineraries:
        await db.itineraries.update_one({"nome": i["nome"]}, {"$set": i}, upsert=True)
    
    # Seed Loyalty Rewards
    rewards = [
        {"id": str(uuid.uuid4()), "nome": "Bottiglia di Spumante", "descrizione": "Una bottiglia di spumante locale da gustare durante il soggiorno", "punti_richiesti": 30, "categoria": "bevande", "ordine": 1, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Cesto Prodotti Tipici", "descrizione": "Un cesto con prodotti tipici del Cilento: olio, miele, pasta artigianale", "punti_richiesti": 40, "categoria": "gastronomia", "ordine": 2, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Ingresso Area Archeologica x2", "descrizione": "Due biglietti d'ingresso gratuiti al Parco Archeologico di Paestum", "punti_richiesti": 50, "categoria": "esperienze", "ordine": 3, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Cena per Due", "descrizione": "Una cena romantica per due in un ristorante convenzionato", "punti_richiesti": 70, "categoria": "esperienze", "ordine": 4, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Escursione in Barca", "descrizione": "Un'escursione in barca lungo la costa cilentana per due persone", "punti_richiesti": 80, "categoria": "esperienze", "ordine": 5, "disponibile": True},
        {"id": str(uuid.uuid4()), "nome": "Soggiorno Gratuito (1 notte)", "descrizione": "Una notte gratuita presso La Maisonette di Paestum", "punti_richiesti": 100, "categoria": "soggiorni", "ordine": 6, "disponibile": True},
    ]
    
    for r in rewards:
        await db.loyalty_rewards.update_one({"nome": r["nome"]}, {"$set": r}, upsert=True)
    
    # Seed Gallery Images
    gallery = [
        {"id": str(uuid.uuid4()), "titolo": "Camera Matrimoniale", "url": "https://customer-assets.emergentagent.com/job_88383793-9b8e-4520-b738-24dee3c24d4e/artifacts/x28xxl91_678938161.jpg", "descrizione": "Camera con soffitto in legno e letto in ferro battuto", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Terrazza", "url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800", "descrizione": "Area relax con vista sulla campagna", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Vista Esterna", "url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=800", "descrizione": "Le nostre casette immerse nel verde", "ordine": 3, "attivo": True},
        {"id": str(uuid.uuid4()), "titolo": "Bagno", "url": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=800", "descrizione": "Bagno moderno con tutti i comfort", "ordine": 4, "attivo": True},
    ]
    
    for g in gallery:
        await db.gallery.update_one({"titolo": g["titolo"]}, {"$set": g}, upsert=True)
    
    # Seed Amenities
    amenities = [
        {"id": str(uuid.uuid4()), "nome": "WiFi Gratuito", "descrizione": "Connessione veloce in tutta la struttura", "icona": "wifi", "ordine": 1, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Parcheggio", "descrizione": "Gratuito e privato", "icona": "car", "ordine": 2, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Colazione", "descrizione": "Prodotti freschi locali su richiesta", "icona": "coffee", "ordine": 3, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Terrazza", "descrizione": "Area relax con vista", "icona": "sun", "ordine": 4, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Spiaggia", "descrizione": "A pochi minuti in auto", "icona": "waves", "ordine": 5, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Giardino", "descrizione": "Area verde privata", "icona": "tree", "ordine": 6, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "Aria Condizionata", "descrizione": "In tutte le camere", "icona": "wind", "ordine": 7, "attivo": True},
        {"id": str(uuid.uuid4()), "nome": "TV", "descrizione": "Smart TV con streaming", "icona": "tv", "ordine": 8, "attivo": True},
    ]
    
    for a in amenities:
        await db.amenities.update_one({"nome": a["nome"]}, {"$set": a}, upsert=True)
    
    return {"message": "Dati di esempio inseriti"}

# ==================== EVENT SCRAPER ====================

class ScrapedEvent(BaseModel):
    titolo: str
    descrizione: Optional[str] = None
    data: str
    data_fine: Optional[str] = None
    luogo: str
    indirizzo: Optional[str] = None
    categoria: Optional[str] = None
    url_fonte: Optional[str] = None

@api_router.post("/admin/scrape-events")
async def scrape_events(admin: dict = Depends(get_admin_user)):
    """Scrape events from Virgilio.it for Capaccio/Paestum area"""
    
    url = "https://www.virgilio.it/italia/capaccio/eventi/"
    scraped_events = []
    imported_count = 0
    duplicate_count = 0
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client_http:
            # Add headers to mimic a browser
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            }
            
            response = await client_http.get(url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Find all event articles with schema.org Event markup
            event_articles = soup.find_all('article', {'itemtype': 'http://schema.org/Event'})
            
            for article in event_articles:
                try:
                    # Extract title
                    title_elem = article.find('h2', itemprop='name')
                    if not title_elem:
                        continue
                    titolo = title_elem.get_text(strip=True)
                    
                    # Extract description
                    desc_elem = article.find('p', itemprop='description')
                    descrizione = desc_elem.get_text(strip=True) if desc_elem else None
                    
                    # Extract dates
                    start_date_elem = article.find('time', itemprop='startDate')
                    end_date_elem = article.find('time', itemprop='endDate')
                    
                    # Parse dates from datetime attribute
                    data = None
                    data_fine = None
                    
                    if start_date_elem and start_date_elem.get('datetime'):
                        dt_str = start_date_elem['datetime']
                        try:
                            # Format: 2026-01-02T00:00:00Z
                            data = dt_str.split('T')[0]
                        except:
                            pass
                    
                    if end_date_elem and end_date_elem.get('datetime'):
                        dt_str = end_date_elem['datetime']
                        try:
                            data_fine = dt_str.split('T')[0]
                        except:
                            pass
                    
                    if not data:
                        continue
                    
                    # Extract location
                    location_elem = article.find('a', itemprop='location')
                    luogo = "Capaccio Paestum"
                    if location_elem:
                        loc_text = location_elem.get_text(strip=True)
                        if loc_text:
                            luogo = loc_text
                    
                    # Extract category from tag
                    cat_elem = article.find('div', class_='categoria_ev')
                    categoria = None
                    if cat_elem:
                        cat_link = cat_elem.find('a')
                        if cat_link:
                            cat_text = cat_link.get_text(strip=True).lower()
                            # Map to our categories
                            cat_map = {
                                'rassegne': 'cultura',
                                'spettacoli': 'musica',
                                'concerti': 'musica',
                                'mercatini': 'mercato',
                                'mostre': 'cultura',
                                'sagre e feste': 'festa',
                                'sagre_e_feste': 'festa',
                                'visti in rete': 'altro'
                            }
                            categoria = cat_map.get(cat_text, 'altro')
                    
                    # Extract URL
                    url_fonte = None
                    link_elem = title_elem.find('a') if title_elem else None
                    if link_elem and link_elem.get('href'):
                        url_fonte = link_elem['href']
                    
                    # Extract image
                    immagine_url = None
                    img_elem = article.find('img', itemprop='image')
                    if img_elem:
                        # Virgilio uses data-src-a or data-src-b for lazy loading
                        immagine_url = (
                            img_elem.get('data-src-a') or 
                            img_elem.get('data-src-b') or 
                            img_elem.get('data-src') or 
                            img_elem.get('data-lazy-src')
                        )
                        # Skip placeholder images
                        if immagine_url and 'imgld.gif' in immagine_url:
                            immagine_url = None
                        # Make sure it's a full URL
                        if immagine_url and not immagine_url.startswith('http'):
                            immagine_url = f"https://www.virgilio.it{immagine_url}"
                        
                        # Download and save image locally if available
                        if immagine_url:
                            try:
                                img_response = await client_http.get(immagine_url, timeout=10.0)
                                if img_response.status_code == 200:
                                    # Save to uploads folder
                                    img_ext = immagine_url.split('.')[-1].split('?')[0] or 'jpg'
                                    img_filename = f"event_{uuid.uuid4()}.{img_ext}"
                                    img_path = UPLOADS_DIR / img_filename
                                    with open(img_path, 'wb') as f:
                                        f.write(img_response.content)
                                    immagine_url = f"/api/uploads/{img_filename}"
                                else:
                                    immagine_url = None
                            except Exception as img_err:
                                print(f"Failed to download image: {img_err}")
                                immagine_url = None
                    
                    scraped_events.append({
                        "titolo": titolo,
                        "descrizione": descrizione,
                        "data": data,
                        "data_fine": data_fine if data_fine and data_fine != data else None,
                        "luogo": luogo,
                        "categoria": categoria,
                        "url_fonte": url_fonte,
                        "immagine_url": immagine_url
                    })
                    
                except Exception as e:
                    print(f"Error parsing event: {e}")
                    continue
            
            # Now save events to database, avoiding duplicates
            updated_count = 0
            for event in scraped_events:
                # Check for duplicate by title and date
                existing = await db.events.find_one({
                    "titolo": event["titolo"],
                    "data": event["data"]
                })
                
                if existing:
                    # Update image if:
                    # - Current image is missing, OR
                    # - Current image is external (not local /api/uploads/)
                    current_img = existing.get("immagine_url") or ""
                    new_img = event.get("immagine_url")
                    should_update = new_img and (
                        not current_img or 
                        not current_img.startswith("/api/uploads/")
                    )
                    
                    if should_update:
                        await db.events.update_one(
                            {"id": existing["id"]},
                            {"$set": {
                                "immagine_url": new_img,
                                "importato_da": "virgilio.it",
                                "url_fonte": event["url_fonte"]
                            }}
                        )
                        updated_count += 1
                    duplicate_count += 1
                    continue
                
                # Create new event
                event_id = str(uuid.uuid4())
                event_doc = {
                    "id": event_id,
                    "titolo": event["titolo"],
                    "titolo_en": None,
                    "descrizione": event["descrizione"],
                    "descrizione_en": None,
                    "data": event["data"],
                    "data_fine": event["data_fine"] or event["data"],
                    "ora": None,
                    "ora_fine": None,
                    "luogo": event["luogo"],
                    "luogo_en": None,
                    "indirizzo": None,
                    "immagine_url": event.get("immagine_url"),
                    "categoria": event["categoria"],
                    "url_fonte": event["url_fonte"],
                    "importato_da": "virgilio.it",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.events.insert_one(event_doc)
                imported_count += 1
            
            return {
                "success": True,
                "message": f"Scraping completato",
                "eventi_trovati": len(scraped_events),
                "eventi_importati": imported_count,
                "eventi_aggiornati": updated_count,
                "eventi_duplicati": duplicate_count - updated_count,
                "eventi": scraped_events[:10]  # Return first 10 for preview
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Errore nel contattare virgilio.it: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante lo scraping: {str(e)}")

# Create admin user endpoint (for initial setup)
@api_router.post("/setup/admin")
async def create_admin():
    existing = await db.guests.find_one({"email": "admin@maisonette.it"})
    if existing:
        return {"message": "Admin già esistente", "codice": existing.get("codice_prenotazione")}
    
    admin_id = str(uuid.uuid4())
    codice = "ADMIN-2024"
    
    admin_doc = {
        "id": admin_id,
        "nome": "Admin",
        "cognome": "Maisonette",
        "email": "admin@maisonette.it",
        "password_hash": hash_password("admin123"),
        "telefono": None,
        "punti_fedelta": 0,
        "is_admin": True,
        "codice_prenotazione": codice,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.guests.insert_one(admin_doc)
    return {"message": "Admin creato", "email": "admin@maisonette.it", "password": "admin123", "codice": codice}

@api_router.get("/")
async def root():
    return {"message": "Maisonette di Paestum API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
