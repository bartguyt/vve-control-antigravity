-- INSPECTION SCRIPT: Find triggers on association_memberships
-- Run this in Supabase SQL Editor

-- 1. List Triggers on association_memberships
SELECT 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'association_memberships';

-- 2. List Functions with suspicious 'vve_id' content
SELECT 
    routine_name, 
    routine_definition 
FROM information_schema.routines 
WHERE routine_definition LIKE '%vve_id%'
AND routine_schema = 'public';
