# Configurazione API Stampanti 3D

Questo documento spiega come configurare le API per il monitoraggio remoto delle stampanti 3D.

## Tipi di Sistema Supportati

### 1. Klipper (Mainsail/Fluidd)

**Configurazione:**
- **Endpoint API**: `http://IP_STAMPANTE:7125`
- **API Key**: Opzionale, configurabile in `moonraker.conf`
- **Esempio**: `http://192.168.1.100:7125`

**Passi per configurare:**
1. Assicurati che Moonraker sia installato e configurato
2. Verifica che l'API sia accessibile: `http://IP_STAMPANTE:7125/printer/info`
3. Se necessario, configura l'API key in `moonraker.conf`:
   ```ini
   [authorization]
   api_key_file: ~/.moonraker_api_key
   ```

**Endpoint utilizzati:**
- `/printer/info` - Informazioni generali stampante
- `/printer/objects/query?extruder&heater_bed` - Temperature
- `/printer/objects/query?print_stats` - Stato stampa

### 2. Bambu Lab

**Configurazione:**
- **Endpoint API**: `https://api.bambulab.com`
- **API Key**: Access Code dalla stampante
- **Device ID**: ID dispositivo dalla stampante

**Passi per configurare:**
1. Accedi alla stampante Bambu Lab tramite app o web interface
2. Vai nelle impostazioni e trova l'Access Code
3. Annota il Device ID della stampante
4. Configura l'endpoint e l'API key nel sistema

**Note:**
- L'API Bambu Lab richiede autenticazione OAuth
- I dati sono sincronizzati tramite cloud Bambu Lab
- Alcuni dati potrebbero essere limitati dall'API pubblica

## Configurazione nel Sistema

### Aggiungere una Nuova Stampante

1. Vai alla pagina "Stampanti" nel dashboard
2. Clicca su "+ Nuova Stampante" (solo superuser)
3. Compila i campi:
   - **Nome**: Nome identificativo della stampante
   - **Modello**: Modello della stampante (es. X1C, A1, Ender 3)
   - **Numero Seriale**: Seriale della stampante (opzionale)
   - **Organizzazione**: Organizzazione proprietaria
   - **Tipo Sistema**: Seleziona Klipper o Bambu Lab
   - **Endpoint API**: URL dell'API
   - **API Key**: Chiave API (se richiesta)

### Testare la Connessione

Dopo aver configurato una stampante:
1. La card della stampante mostrerà lo stato "offline" inizialmente
2. Clicca sul pulsante di aggiornamento (🔄) per testare la connessione
3. Se la connessione funziona, vedrai i dati in tempo reale
4. Se ci sono errori, controlla la configurazione

## Dati Monitorati

### Temperature
- **Nozzle**: Temperatura dell'estrusore
- **Piatto**: Temperatura del piatto di stampa
- **Camera**: Temperatura della camera (se disponibile)

### Stato Stampa
- **Stato**: pronta, in_stampa, pausa, errore, offline
- **Progresso**: Percentuale di completamento
- **Tempo rimanente**: Tempo stimato per completare
- **Tempo totale**: Tempo totale della stampa
- **File corrente**: Nome del file in stampa

### Aggiornamenti
- I dati vengono aggiornati automaticamente ogni 30 secondi
- È possibile aggiornare manualmente cliccando il pulsante 🔄
- L'ultimo aggiornamento è mostrato in ogni card

## Risoluzione Problemi

### Errore "Stampante non configurata per API"
- Verifica che il campo "Tipo Sistema" sia selezionato
- Controlla che l'endpoint API sia compilato

### Errore "Errore nel recupero dati"
- Verifica che l'endpoint sia raggiungibile dalla rete
- Controlla che l'API key sia corretta (se richiesta)
- Verifica che il firewall non blocchi le connessioni

### Klipper - Errore 404
- Verifica che Moonraker sia in esecuzione
- Controlla che la porta 7125 sia aperta
- Verifica la configurazione di `moonraker.conf`

### Bambu Lab - Errore di autenticazione
- Verifica che l'Access Code sia corretto
- Controlla che il Device ID sia valido
- Verifica che la stampante sia online

## Sicurezza

- Le API key sono memorizzate in modo sicuro nel database
- Le connessioni API utilizzano HTTPS quando disponibile
- I dati sono filtrati per organizzazione (RLS)
- Solo i superuser possono configurare le stampanti

## Sviluppi Futuri

- Supporto per altri sistemi (OctoPrint, Repetier Server)
- Notifiche push per cambi di stato
- Controllo remoto delle stampanti
- Integrazione con software di slicing
- Dashboard analytics avanzate 