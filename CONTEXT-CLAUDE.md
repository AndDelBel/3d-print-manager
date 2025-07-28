# 🎯 Contesto Applicazione Web: Gestione Automazione Stampe 3D

## 🛠️ Stack Tecnologico
- Frontend: Next.js 15+ (React 19, TypeScript, App Router)
- Backend/Auth/Database: Supabase (Postgres, RLS)
- Storage: Supabase Storage (unico bucket "files")
- Styling: TailwindCSS + DaisyUI
- IDE: Visual Studio Code
- Stampanti 3D: Bambu Lab (X1C, A1, A1mini, H2D)
- Formato stampa: STL/STEP (utenti), `.gcode.3mf` (admin)
- Slicing Software: Bambu Studio (manuale)

## 🗂️ Scopo e Funzionalità Generali
- Caricamento STL/STEP (utenti)
- Gestione commesse e organizzazioni
- Associazione `.gcode.3mf` (admin)
- Automazione stampe in sequenza
- Supporto multi-stampante
- Gestione ordini con stati avanzati

## 🗃️ Architettura dati ottimizzata e best practice

### Struttura dati (tabelle principali)
- **utente**: anagrafica utenti, FK su auth.users, campo `is_superuser` per permessi globali
- **organizzazione**: entità organizzativa
- **organizzazioni_utente**: relazione user-org con campo `role` ('user', 'admin', ...)
- **commessa**: progetto/ordine di lavoro, FK su organizzazione
- **file_origine**: file STL/STEP caricati, FK su commessa, campo `gcode_principale_id` per indicare il G-code principale
- **gcode**: output slicing, metadati tecnici (peso, tempo, materiale, stampante, ...), FK su file_origine
- **stampante**: anagrafica stampanti, FK su organizzazione
- **ordine**: job di stampa, FK su gcode, commessa, organizzazione, utente, con campi `consegna_richiesta` (date) e `note` (text)
- **coda_stampa**: gestione automazione e assegnazione job a stampante

### Stati degli ordini (aggiornati)
- **processamento**: ordine in fase di preparazione
- **in_coda**: ordine in coda per la stampa
- **in_stampa**: ordine attualmente in stampa
- **pronto**: stampa completata, pronta per la consegna
- **consegnato**: ordine consegnato al cliente

### Stati della coda stampa
- **in_coda**: job in attesa di stampa
- **in_stampa**: job attualmente in stampa
- **pronto**: stampa completata
- **error**: errore durante la stampa

### Implementazioni future
- **Gestione stato file**: implementazione del campo `is_superato` per marcare file obsoleti
- **Versioning file**: sistema di versioning per tracciare modifiche ai file STL/STEP
- **Workflow approvazione**: sistema di approvazione per G-code prima della produzione
- **Notifiche**: sistema di notifiche per ordini completati, errori di stampa, ecc.
- **Dashboard analytics**: statistiche di produzione, tempi medi, materiali utilizzati
- **API esterne**: integrazione con software di slicing e stampanti 3D

### Sicurezza e RLS
- **RLS attiva su tutte le tabelle sensibili** (file_origine, gcode, ordine, commessa, stampante, coda_stampa)
- **Policy granulari**: solo membri della stessa organizzazione possono vedere/gestire i dati della loro org
- **Superuser**: campo `is_superuser` su utente, controllato in tutte le policy (SELECT, INSERT, UPDATE, DELETE)
- **Ruoli**: campo `role` in organizzazioni_utente per eventuali permessi futuri
- **FK con ON DELETE CASCADE/RESTRICT**: integrità referenziale
- **Audit log** (opzionale): tabella per tracciare azioni sensibili
- **Testa le policy** con utenti di diversi ruoli e organizzazioni
- **Documenta le policy** e la struttura dati in questo file

### Linee guida per adattare/ottimizzare il codice Next.js
- **Tipizzazione forte**: i tipi TypeScript rispecchiano 1:1 lo schema SQL (vedi cartella `src/types/`)
- **Servizi modulari**: ogni entità ha un servizio dedicato in `src/services/` (es. `fileOrigine.ts`, `gcode.ts`, `ordine.ts`, ...)
- **Gestione ruoli e permessi**: la logica superuser è propagata in tutti i servizi e nelle UI (filtri, azioni CRUD, visibilità dati)
- **Gestione multi-stampante**: la tabella `stampante` e la `coda_stampa` sono integrate e filtrabili per organizzazione
- **Analisi avanzata**: i metadati di `gcode` sono disponibili per report, costi, materiali, tempi, ecc.
- **Eliminazione sicura**: le azioni di delete sono protette da modali di conferma e policy DB
- **Validazione dati**: sia lato frontend (form) che backend (policy e constraint SQL)
- **Componenti riutilizzabili**: modali, alert, loading button, tabelle filtrabili
- **Testing**: struttura pronta per test automatici su servizi e componenti

### Policy RLS (esempio generico)
```sql
CREATE POLICY select_file_origine ON file_origine
  FOR SELECT USING (
    (SELECT is_superuser FROM utente WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM commessa
      JOIN organizzazioni_utente ON commessa.organizzazione_id = organizzazioni_utente.organizzazione_id
      WHERE commessa.id = file_origine.commessa_id
        AND organizzazioni_utente.user_id = auth.uid()
    )
  );
-- Stessa logica per UPDATE, INSERT (WITH CHECK), DELETE (USING)
```

### Stato attuale del frontend

#### ✅ Funzionalità implementate e testate
- **Autenticazione**: login/register con Supabase Auth
- **Gestione organizzazioni**: CRUD completo per superuser, visualizzazione per utenti normali
- **Gestione commesse**: CRUD con filtro per organizzazione
- **Upload file**: caricamento STL/STEP con associazione a commessa
- **Gestione G-code**: upload, download, eliminazione, impostazione principale
- **Gestione ordini**: creazione, visualizzazione, modifica stato, eliminazione
- **Gestione stampanti**: CRUD con filtro per organizzazione
- **Coda stampa**: visualizzazione e gestione (solo superuser)
- **Filtri avanzati**: per organizzazione, commessa, ricerca testuale
- **UI/UX migliorata**: modali, badge colorati, loading states, conferme

#### 🎯 Gestione stati ordini (NUOVO)
- **Stati implementati**: processamento, in_coda, in_stampa, pronto, consegnato
- **Modifica stato**: solo superuser può modificare gli stati
- **UI stato**: badge colorati per tutti, modal popup per superuser
- **Colori stati**: 
  - `consegnato`: verde (success)
  - `pronto`: azzurro (info)
  - `in_stampa`: giallo (warning)
  - `in_coda`: blu (primary)
  - `processamento`: grigio (neutral)

#### 🎯 Pagina ordini ottimizzata (NUOVO)
- **Filtri intelligenti**: per utenti non superuser, carica commesse delle loro organizzazioni
- **Colonna organizzazione**: nascosta per utenti con una sola organizzazione
- **Modifica stato**: modal popup centrato per superuser
- **Gestione G-code**: cambio G-code associato all'ordine
- **Visualizzazione dati**: nome commessa, organizzazione (se applicabile), dettagli ordine

#### 🎯 Componenti riutilizzabili
- **AlertMessage**: messaggi di successo/errore con auto-dismiss
- **LoadingButton**: bottoni con stato di loading
- **ConfirmModal**: modali di conferma per azioni distruttive
- **TabellaFile**: componente tabella con filtri e azioni
- **Navbar**: navigazione principale dell'app

#### 🎯 Servizi modulari
- **fileOrigine.ts**: gestione file STL/STEP
- **gcode.ts**: gestione G-code e metadati
- **ordine.ts**: gestione ordini con nuovi stati
- **organizzazione.ts**: gestione organizzazioni
- **commessa.ts**: gestione commesse
- **stampante.ts**: gestione stampanti
- **codaStampa.ts**: gestione coda stampa
- **utente.ts**: gestione utenti

#### 🎯 Tipi TypeScript aggiornati
- **Ordine**: nuovi stati implementati
- **CodaStampa**: stati coerenti con ordini
- **FileItem**: tipo generico per tabelle file
- **Tutti i tipi**: rispecchiano fedelmente lo schema SQL

#### 🎯 Gestione permessi implementata
- **Superuser**: accesso completo a tutte le funzionalità
- **Utenti normali**: accesso limitato ai dati delle proprie organizzazioni
- **Filtri automatici**: commesse e organizzazioni filtrate per utente
- **UI adattiva**: colonne e filtri mostrati/nascosti in base ai permessi

### Prossimi step
- ✅ Debug e test di tutte le funzionalità CRUD con superuser e utenti normali
- ✅ Ottimizzazione UI/UX e micro-migliorie
- 🔄 Aggiornamento/estensione test automatici e documentazione se necessario
- 🔄 Implementazione notifiche per cambi di stato ordini
- 🔄 Dashboard analytics con statistiche produzione
- 🔄 Integrazione con API esterne per automazione stampa