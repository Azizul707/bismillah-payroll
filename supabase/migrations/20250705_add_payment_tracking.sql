-- Migration: Add payment tracking columns to payroll_items table
-- Run this SQL in the Supabase Dashboard > SQL Editor

ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS paid_by_name TEXT;
