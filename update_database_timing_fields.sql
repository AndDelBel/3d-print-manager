-- Script per aggiornare il database con i campi di timing per gli ordini
-- Esegui questo script nel tuo database Supabase

-- 1. Aggiungi i nuovi campi alla tabella ordine
ALTER TABLE ordine 
ADD COLUMN IF NOT EXISTS data_inizio TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_fine TIMESTAMP WITH TIME ZONE;

-- 2. Aggiungi commenti per documentare i nuovi campi
COMMENT ON COLUMN ordine.data_inizio IS 'Timestamp di inizio stampa (impostato quando stato = in_stampa)';
COMMENT ON COLUMN ordine.data_fine IS 'Timestamp di fine stampa (impostato quando stato = pronto)';

-- 3. Verifica che i campi siano stati aggiunti correttamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordine' 
AND column_name IN ('data_inizio', 'data_fine')
ORDER BY ordinal_position;

-- 4. Mostra la struttura completa della tabella ordine
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordine' 
ORDER BY ordinal_position;

-- 5. Verifica che non ci siano errori
SELECT 'Database aggiornato con successo!' as status; 