-- Script per verificare tutti i constraint esistenti nel database
-- Esegui questo script nel SQL Editor di Supabase

-- 1. Verifica tutti i constraint di check esistenti
SELECT 
    t.table_name,
    c.conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE c.contype = 'c'
ORDER BY t.table_name, c.conname;

-- 2. Verifica specificamente i constraint per gli stati
SELECT 
    t.table_name,
    c.conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE c.contype = 'c'
AND c.conname LIKE '%stato%'
ORDER BY t.table_name, c.conname;

-- 3. Verifica la struttura delle tabelle ordine e coda_stampa
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('ordine', 'coda_stampa')
ORDER BY table_name, ordinal_position;

-- 4. Verifica se esistono record con stato 'error'
SELECT 
    table_name,
    COUNT(*) as count
FROM (
    SELECT 'ordine' as table_name, stato FROM ordine WHERE stato = 'error'
    UNION ALL
    SELECT 'coda_stampa' as table_name, stato FROM coda_stampa WHERE stato = 'error'
) t
GROUP BY table_name; 