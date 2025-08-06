# 3D Print Manager

Un'applicazione web per la gestione di stampanti 3D, file G-code e coda di stampa.

## Caratteristiche

- **Gestione File**: Upload e gestione di file STL, STEP e G-code
- **Analisi G-code**: Estrazione automatica di tempo di stampa, peso e materiale
- **Coda di Stampa**: Gestione della coda di stampa con stati avanzati
- **Integrazione Home Assistant**: Controllo remoto delle stampanti
- **Concatenazione Automatica**: Unione automatica di file G-code compatibili
- **Dashboard Analytics**: Statistiche e report di produzione

## Tecnologie

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, DaisyUI
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **Integrazione**: Home Assistant API

## Installazione

### Prerequisiti

- Node.js >= 18.0.0
- npm >= 8.0.0
- Account Supabase

### Setup

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd 3d-print-manager
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   ```bash
   cp .env.example .env.local
   ```
   
   Modifica `.env.local` con le tue credenziali:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_HOME_ASSISTANT_URL=your_home_assistant_url
   NEXT_PUBLIC_HOME_ASSISTANT_TOKEN=your_home_assistant_token
   ```

4. **Avvia in sviluppo**
   ```bash
   npm run dev
   ```

## Deploy

### Vercel (Raccomandato)

1. **Connetti il repository a Vercel**
2. **Configura le variabili d'ambiente**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_HOME_ASSISTANT_URL` (opzionale)
   - `NEXT_PUBLIC_HOME_ASSISTANT_TOKEN` (opzionale)

3. **Deploy automatico**:
   ```bash
   git push origin main
   ```

### Altri Provider

1. **Build per produzione**:
   ```bash
   npm run build
   ```

2. **Avvia il server**:
   ```bash
   npm start
   ```

## Database Setup

L'applicazione utilizza Supabase. Assicurati di avere configurato:

1. **Tabelle principali**:
   - `organizzazione`
   - `commessa`
   - `file_origine`
   - `gcode`
   - `ordine`
   - `stampante`

2. **Storage buckets**:
   - `files` (per i file caricati)

3. **Row Level Security (RLS)** abilitato su tutte le tabelle

## Funzionalità Principali

### Gestione File
- Upload di file STL, STEP, G-code
- Analisi automatica dei metadati
- Organizzazione per commessa e organizzazione

### Coda di Stampa
- Stati: processamento, in_coda, in_stampa, pronto, consegnato, error
- Concatenazione automatica di file compatibili
- Gestione errori con duplicazione automatica

### Integrazione Home Assistant
- Controllo remoto delle stampanti
- Monitoraggio temperatura e stato
- Avvio/stop stampe

### Analytics
- Statistiche di produzione
- Report per organizzazione
- Tracking tempi e materiali

## Sviluppo

### Script Disponibili

- `npm run dev` - Avvia server di sviluppo
- `npm run build` - Build per produzione
- `npm run start` - Avvia server di produzione
- `npm run lint` - Controllo codice
- `npm run type-check` - Controllo TypeScript
- `npm run clean` - Pulisce cache

### Struttura Progetto

```
src/
├── app/                 # App Router (Next.js 15)
├── components/          # Componenti React
├── hooks/              # Custom hooks
├── lib/                # Librerie e configurazioni
├── services/           # Servizi API
├── types/              # Definizioni TypeScript
└── utils/              # Utility functions
```

## Licenza

MIT License
