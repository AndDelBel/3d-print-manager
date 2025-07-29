# Risoluzione Problemi CORS - API Stampanti

## 🚨 **Problema CORS**

Il browser blocca le chiamate HTTP dirette a IP locali per motivi di sicurezza. Questo è il motivo dell'errore "Failed to fetch".

## ✅ **Soluzione Implementata**

### **1. API Route Proxy**

Abbiamo creato un'API route che fa da proxy:
- **URL**: `/api/stampanti/[id]/status`
- **Funzione**: Gestisce le chiamate alle stampanti dal server
- **Vantaggi**: Evita problemi CORS, gestisce autenticazione, timeout

### **2. Configurazione Server**

Il server Next.js ora:
- Gestisce timeout di 5 secondi per le chiamate esterne
- Applica headers CORS appropriati
- Gestisce errori di connessione

## 🔧 **Come Funziona**

### **Flusso delle Chiamate**

1. **Browser** → **API Route** (`/api/stampanti/1/status`)
2. **API Route** → **Verifica Autenticazione**
3. **API Route** → **Verifica Permessi**
4. **API Route** → **Stampante Klipper/Bambu**
5. **API Route** → **Browser** (con dati formattati)

### **Gestione Errori**

- **Timeout**: 5 secondi per ogni chiamata
- **Offline**: Stato "offline" se la stampante non risponde
- **Errori**: Messaggi dettagliati per debug

## 🛠️ **Configurazione Stampanti**

### **Klipper/Mainsail**

1. **Verifica CORS in moonraker.conf**:
   ```ini
   [cors_domains]
   *.lan
   *.local
   *://localhost
   *://localhost:*
   *://my.mainsail.xyz
   *://app.fluidd.xyz
   ```

2. **Verifica API Key** (opzionale):
   ```ini
   [authorization]
   api_key_file: ~/.moonraker_api_key
   ```

3. **Test Endpoint**:
   ```bash
   curl http://IP_STAMPANTE:7125/printer/info
   ```

### **Bambu Lab**

1. **Access Code**: Ottenuto dalla stampante
2. **Device ID**: Configurato nell'app
3. **Endpoint**: `https://api.bambulab.com`

## 🧪 **Test della Connessione**

### **1. Test API Route**

```bash
# Test diretto dell'API route
curl http://localhost:3000/api/stampanti/1/status
```

### **2. Test Stampante Klipper**

```bash
# Test diretto della stampante
curl http://IP_STAMPANTE:7125/printer/info
```

### **3. Verifica Log**

Controlla la console del browser per:
- Chiamate API effettuate
- Errori di connessione
- Timeout

## 🔍 **Debug Avanzato**

### **Problemi Comuni**

#### **1. Timeout di Connessione**
- **Causa**: Stampante offline o IP errato
- **Soluzione**: Verifica IP e connessione di rete

#### **2. Errore 404**
- **Causa**: Endpoint API non corretto
- **Soluzione**: Verifica URL e porta

#### **3. Errore 401/403**
- **Causa**: API key errata o permessi insufficienti
- **Soluzione**: Verifica configurazione autenticazione

#### **4. CORS Error**
- **Causa**: Configurazione CORS mancante
- **Soluzione**: Aggiorna moonraker.conf

### **Log di Debug**

Aggiungi questo al servizio per debug dettagliato:

```typescript
console.log('Chiamata API stampante:', {
  id: stampante.id,
  endpoint: stampante.endpoint_api,
  tipo: stampante.tipo_sistema
});
```

## 📋 **Checklist Risoluzione**

- [ ] Verifica IP stampante nella rete locale
- [ ] Testa connessione diretta alla stampante
- [ ] Verifica configurazione CORS in moonraker.conf
- [ ] Controlla API key (se configurata)
- [ ] Testa API route del server
- [ ] Verifica log browser e server

## 🚀 **Prossimi Passi**

1. **Test con stampanti reali**
2. **Implementazione retry automatico**
3. **Notifiche per errori di connessione**
4. **Dashboard di monitoraggio connessioni**

## 📞 **Supporto**

Se il problema persiste:
1. Controlla i log del server Next.js
2. Verifica la configurazione di rete
3. Testa con stampanti diverse
4. Controlla firewall e antivirus 