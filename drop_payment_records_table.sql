
-- Cleanup Migration: Verwijder de overbodige 'contribution_payment_records' tabel
-- Deze tabel is vervangen door een real-time berekening op basis van 'bank_transactions'.

DROP TABLE IF EXISTS contribution_payment_records;
