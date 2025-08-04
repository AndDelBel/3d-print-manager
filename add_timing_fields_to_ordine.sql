-- Migrazione: Aggiungi campi per tracciare i tempi di stampa alla tabella ordine
-- Data: 2024-12-19
-- Descrizione: Aggiunge data_inizio e data_fine per tracciare i tempi di stampa

-- Aggiungi campi per tracciare i tempi di stampa
ALTER TABLE ordine 
ADD COLUMN data_inizio TIMESTAMP WITH TIME ZONE,
ADD COLUMN data_fine TIMESTAMP WITH TIME ZONE;

-- Aggiungi commenti per documentare i nuovi campi
COMMENT ON COLUMN ordine.data_inizio IS 'Timestamp di inizio stampa (impostato quando stato = in_stampa)';
COMMENT ON COLUMN ordine.data_fine IS 'Timestamp di fine stampa (impostato quando stato = pronto)';

-- Verifica che i campi siano stati aggiunti correttamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ordine' 
AND column_name IN ('data_inizio', 'data_fine')
ORDER BY ordinal_position; 