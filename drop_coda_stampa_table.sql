-- Script per eliminare la tabella coda_stampa (non più necessaria)
-- ATTENZIONE: Esegui questo script solo dopo aver verificato che tutto funzioni correttamente

-- 1. Verifica che la tabella coda_stampa esista
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'coda_stampa'
) as table_exists;

-- 2. Se la tabella esiste, eliminala
DROP TABLE IF EXISTS coda_stampa CASCADE;

-- 3. Verifica che la tabella sia stata eliminata
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'coda_stampa'
) as table_still_exists;

-- 4. Mostra le tabelle rimanenti
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 5. Verifica che non ci siano errori
SELECT 'Tabella coda_stampa eliminata con successo!' as status; 