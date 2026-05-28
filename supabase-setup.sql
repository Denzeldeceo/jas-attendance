-- ============================================
-- JAS Attendance — Supabase Database Setup
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================

-- 1. Employees table
create table if not exists employees (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text not null,
  pin        char(4) not null unique,
  created_at timestamptz default now()
);

-- 2. Attendance table
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date        date not null,
  clock_in    text,
  clock_out   text,
  status      text check (status in ('present','late','absent')) default 'absent',
  created_at  timestamptz default now(),
  unique (employee_id, date)
);

-- 3. Index for fast date lookups
create index if not exists attendance_date_idx on attendance(date);

-- ============================================
-- Optional: add your first staff member here
-- (you can also use the Admin Panel instead)
-- ============================================
-- insert into employees (name, role, pin) values
--   ('Jane Doe',  'Photographer', '1234'),
--   ('John Smith','Glam Artist',  '5678');
