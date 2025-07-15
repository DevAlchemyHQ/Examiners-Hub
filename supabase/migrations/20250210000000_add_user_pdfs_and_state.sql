-- Migration: Add user_pdfs and user_pdf_state tables for PDF management

-- Create user_pdfs table
create table if not exists public.user_pdfs (
  user_id uuid references auth.users on delete cascade,
  name text,
  url text,
  upload_date timestamptz,
  primary key (user_id, name)
);

-- Enable RLS
alter table public.user_pdfs enable row level security;

-- Allow users to manage their own PDFs
create policy "Users can manage their own PDFs"
  on public.user_pdfs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create user_pdf_state table
create table if not exists public.user_pdf_state (
  user_id uuid references auth.users on delete cascade,
  viewer integer,
  file_path text,
  public_url text,
  file_name text,
  primary key (user_id, viewer)
);

-- Enable RLS
alter table public.user_pdf_state enable row level security;

-- Allow users to manage their own PDF state
create policy "Users can manage their own PDF state"
  on public.user_pdf_state
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id); 