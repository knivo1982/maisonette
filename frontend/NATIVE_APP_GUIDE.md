# 📱 La Maisonette - Guida App Native iOS & Android

## Prerequisiti

### Per iOS:
- Mac con macOS
- Xcode installato (App Store)
- Account Apple Developer ($99/anno)
- CocoaPods installato (`sudo gem install cocoapods`)

### Per Android:
- Android Studio installato
- Account Google Play ($25 una tantum)

---

## 🍎 Compilare per iOS

### 1. Scarica il progetto
Dopo aver fatto "Save to GitHub", clona il repository sul tuo Mac:
```bash
git clone <URL_REPOSITORY>
cd frontend
```

### 2. Installa le dipendenze
```bash
yarn install
yarn build
npx cap sync ios
```

### 3. Installa CocoaPods
```bash
cd ios/App
pod install
cd ../..
```

### 4. Apri in Xcode
```bash
npx cap open ios
```

### 5. Configura il Team di Sviluppo
1. In Xcode, seleziona il progetto "App" nel navigator
2. Vai su "Signing & Capabilities"
3. Seleziona il tuo Team Apple Developer
4. Assicurati che "Automatically manage signing" sia attivo

### 6. Testa sul Simulatore
1. Seleziona un dispositivo simulato (es. iPhone 15)
2. Premi ▶️ per eseguire

### 7. Testa su Dispositivo Reale
1. Collega il tuo iPhone via USB
2. Selezionalo come destinazione
3. Premi ▶️ per eseguire

### 8. Pubblica su App Store
1. In Xcode: Product → Archive
2. Una volta completato, Window → Organizer
3. Clicca "Distribute App"
4. Seleziona "App Store Connect"
5. Segui le istruzioni

---

## 🤖 Compilare per Android

### 1. Scarica il progetto
```bash
git clone <URL_REPOSITORY>
cd frontend
```

### 2. Installa le dipendenze
```bash
yarn install
yarn build
npx cap sync android
```

### 3. Apri in Android Studio
```bash
npx cap open android
```

### 4. Configura la Firma dell'App
1. Build → Generate Signed Bundle / APK
2. Crea una nuova keystore (conservala al sicuro!)
3. Compila i campi richiesti

### 5. Genera l'APK/Bundle
1. Build → Generate Signed Bundle / APK
2. Scegli "Android App Bundle" per Play Store
3. Seleziona "release"
4. Clicca "Create"

### 6. Pubblica su Google Play
1. Vai su [Google Play Console](https://play.google.com/console)
2. Crea una nuova applicazione
3. Carica l'App Bundle (.aab)
4. Compila le informazioni richieste
5. Invia per la review

---

## 📋 Informazioni App Store

### Nome App
**La Maisonette**

### Bundle ID
`com.lamaisonettepaestum.app`

### Versione
1.0.0

### Descrizione Suggerita (IT)
```
La Maisonette di Paestum - La tua esperienza in un B&B esclusivo nel cuore del Cilento.

Scopri i nostri servizi, prenota il tuo soggiorno e resta sempre aggiornato sugli eventi del territorio. Con l'app La Maisonette puoi:

• Visualizzare le nostre casette e i servizi offerti
• Effettuare check-in digitale
• Scoprire eventi locali e attrazioni
• Accumulare punti fedeltà
• Ricevere notifiche sulle tue prenotazioni

Vivi un'esperienza unica tra i templi di Paestum e le meraviglie del Cilento.
```

### Categoria
- Primaria: Travel (Viaggi)
- Secondaria: Lifestyle

### Parole Chiave
paestum, cilento, b&b, bed and breakfast, salerno, campania, vacanze, mare, templi

---

## 🔧 Comandi Utili

```bash
# Rebuild dopo modifiche al codice web
yarn build && npx cap sync

# Aggiorna solo iOS
npx cap sync ios

# Aggiorna solo Android
npx cap sync android

# Apri iOS in Xcode
npx cap open ios

# Apri Android in Android Studio
npx cap open android
```

---

## ⚠️ Note Importanti

1. **Backend**: L'app si connette al server `https://lamaisonettepaestum.com`. Assicurati che il sito sia online.

2. **Icone**: Le icone sono già configurate per tutte le risoluzioni richieste.

3. **Splash Screen**: Lo splash screen mostra il logo su sfondo scuro (#1A202C).

4. **Orientamento**: L'app iPhone è solo in Portrait, iPad supporta tutte le rotazioni.

5. **Privacy**: Se l'app accede a fotocamera, posizione, etc., dovrai aggiungere le descrizioni nel Info.plist.

---

## 📞 Supporto

Per problemi tecnici con la compilazione, contatta il supporto Emergent o consulta la documentazione di Capacitor: https://capacitorjs.com/docs
