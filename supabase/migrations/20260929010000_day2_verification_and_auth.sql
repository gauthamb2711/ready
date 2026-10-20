-- ==============================================================================
-- READY Platform - Day 2 Verification Foundation Migration
-- ==============================================================================

create table if not exists public.verification_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    target_ecosystem public.account_type not null,
    status public.account_state not null default 'PENDING',
    organization_name text,
    work_email text,
    notes text,
    submitted_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_verification_requests_user on public.verification_requests(user_id);
create index if not exists idx_verification_requests_status on public.verification_requests(status);

-- Enable RLS
alter table public.verification_requests enable row level security;

-- Policies:
-- Users can view their own verification requests
create policy "Users can view own verification requests"
    on public.verification_requests for select
    using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

-- Users can submit their own verification request
create policy "Users can submit own verification request"
    on public.verification_requests for insert
    with check (auth.uid() = user_id);

-- Only platform admins can update verification requests
create policy "Platform admins can review verification requests"
    on public.verification_requests for update
    using (public.is_platform_admin(auth.uid()));
