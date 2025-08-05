-- Script per aggiornare i constraint delle tabelle ordine e coda_stampa
-- Esegui questo script nel SQL Editor di Supabase

-- 1. Aggiorna constraint della tabella ordine
ALTER TABLE ordine DROP CONSTRAINT IF EXISTS ordine_stato_check;
ALTER TABLE ordine ADD CONSTRAINT ordine_stato_check 
CHECK (stato IN ('processamento', 'in_coda', 'in_stampa', 'pronto', 'consegnato', 'error'));

-- 2. Aggiorna constraint della tabella coda_stampa (se esiste)
ALTER TABLE coda_stampa DROP CONSTRAINT IF EXISTS coda_stampa_stato_check;
ALTER TABLE coda_stampa ADD CONSTRAINT coda_stampa_stato_check 
CHECK (stato IN ('processamento', 'in_coda', 'in_stampa', 'pronto', 'consegnato', 'error'));

-- 3. Verifica che i constraint siano stati applicati correttamente
SELECT 
    t.table_name,
    c.conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname IN ('ordine', 'coda_stampa')
AND c.contype = 'c'
AND c.conname LIKE '%stato_check';

-- 4. Verifica la struttura delle colonne stato
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('ordine', 'coda_stampa')
AND column_name = 'stato'
ORDER BY table_name; 