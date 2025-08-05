-- Script per aggiornare il constraint della tabella ordine
-- Esegui questo script nel SQL Editor di Supabase

-- 1. Rimuovi il constraint esistente
ALTER TABLE ordine DROP CONSTRAINT IF EXISTS ordine_stato_check;

-- 2. Aggiungi il nuovo constraint con tutti gli stati supportati
ALTER TABLE ordine ADD CONSTRAINT ordine_stato_check 
CHECK (stato IN ('processamento', 'in_coda', 'in_stampa', 'pronto', 'consegnato', 'error'));

-- 3. Verifica che il constraint sia stato applicato correttamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'ordine'::regclass 
AND contype = 'c';

-- 4. Verifica che la tabella ordine abbia la struttura corretta
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordine' 
AND column_name = 'stato'; 