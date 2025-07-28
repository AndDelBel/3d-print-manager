# Test API Stampanti 3D

Questa guida spiega come testare le API delle stampanti nel sistema.

## 🧪 Pagina di Test

È disponibile una pagina dedicata per testare le API:
- **URL**: `/dashboard/stampanti/test`
- **Accesso**: Solo superuser
- **Funzionalità**: Test API Klipper, Bambu Lab e dati mock

## 📋 Come Testare

### 1. Test con Dati Mock
- Vai alla pagina di test
- Seleziona "Test con Dati Mock"
- Clicca "Esegui Test"
- Verifica che i dati vengano generati correttamente

### 2. Test API Klipper Reale
- Configura una stampante Klipper nel sistema
- Endpoint: `http://IP_STAMPANTE:7125`
- API Key: opzionale
- Testa la connessione dalla pagina di test

### 3. Test API Bambu Lab Reale
- Configura una stampante Bambu Lab nel sistema
- Endpoint: `https://api.bambulab.com`
- API Key: Access Code dalla stampante
- Testa la connessione dalla pagina di test

## 🔧 Configurazione Database

Per testare con dati reali, inserisci stampanti di test nel database:

```sql
-- Esempio di inserimento stampante di test
INSERT INTO stampante (
    nome, 
    modello, 
    seriale, 
    organizzazione_id, 
    attiva, 
    tipo_sistema, 
    endpoint_api, 
    api_key, 
    note
) VALUES (
    'Klipper Test',
    'Ender 3 V2',
    'TEST001',
    1, -- ID organizzazione
    true,
    'klipper',
    'http://192.168.1.100:7125',
    '', -- API key opzionale
    'Stampante di test'
);
```

## 🎯 Test delle Card

### Verifica Visualizzazione
1. Vai alla pagina `/dashboard/stampanti`
2. Verifica che le card mostrino:
   - Nome e modello stampante
   - Stato con badge colorato
   - Temperature (se disponibili)
   - Progresso stampa (se in stampa)
   - Tempi rimanenti
   - File corrente

### Verifica Aggiornamenti
1. Clicca il pulsante 🔄 su una card
2. Verifica che i dati si aggiornino
3. Controlla che l'ultimo aggiornamento sia mostrato

### Verifica Stati
- **Pronta**: Verde, nessun progresso
- **In Stampa**: Blu, con progresso e tempi
- **Pausa**: Giallo
- **Errore**: Rosso
- **Offline**: Grigio

## 🐛 Debug

### Console Browser
Apri la console del browser (F12) per vedere:
- Chiamate API effettuate
- Errori di connessione
- Dati ricevuti

### Log Server
Controlla i log del server per:
- Errori di autenticazione
- Timeout di connessione
- Problemi di CORS

## 📊 Esempi di Risposta

### Klipper API
```json
{
  "result": {
    "status": {
      "extruder": {
        "temperature": 200.5,
        "target": 200.0
      },
      "heater_bed": {
        "temperature": 60.0,
        "target": 60.0
      },
      "print_stats": {
        "state": "printing",
        "progress": 0.45,
        "print_duration": 3600,
        "total_duration": 8000,
        "filename": "test.gcode"
      }
    }
  }
}
```

### Bambu Lab API
```json
{
  "state": "printing",
  "temperature": {
    "nozzle": 210.0,
    "bed": 65.0
  },
  "progress": {
    "percentage": 45.5,
    "remaining_time": 3600,
    "total_time": 8000
  },
  "current_file": "test.gcode"
}
```

## 🔒 Sicurezza

### Test di Sicurezza
- Verifica che le API key non vengano esposte
- Controlla che i dati siano filtrati per organizzazione
- Testa l'accesso con utenti non autorizzati

### CORS
Per testare API locali, configura CORS:
```javascript
// moonraker.conf per Klipper
[cors_domains]
*.lan
*.local
*://localhost
*://localhost:*
*://my.mainsail.xyz
*://app.fluidd.xyz
```

## 🚀 Prossimi Passi

1. **Test con stampanti reali**
2. **Implementazione API Bambu Lab completa**
3. **Sistema di notifiche**
4. **Controllo remoto**
5. **Dashboard analytics**

## 📞 Supporto

Se riscontri problemi:
1. Controlla la console del browser
2. Verifica la configurazione dell'API
3. Testa la connessione di rete
4. Controlla i log del server 