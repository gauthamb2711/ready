#!/usr/bin/env node

/**
 * READY Platform - Secure Platform Admin Account Seeding & Management Script
 * 
 * Usage:
 *   node scripts/setup-platform-admin.mjs
 *   node scripts/setup-platform-admin.mjs --email custom.admin@ready.platform --password "MySecretPass123!#"
 * 
 * This script ensures the Platform Admin role is created ONLY through secure
 * database/admin infrastructure, never through public sign-up flows.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
let email = "admin@ready.platform";
let password = "AdminReady2026!#";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--email" && args[i + 1]) {
    email = args[i + 1].trim().toLowerCase();
    i++;
  } else if (args[i] === "--password" && args[i + 1]) {
    password = args[i + 1];
    i++;
  }
}

console.log(`[Platform Admin Setup] Seeding internal platform administrator: ${email}...`);

const sqlScript = `
DO $$
DECLARE
    v_admin_id uuid;
    v_email text := '${email.replace(/'/g, "''")}';
    v_password text := '${password.replace(/'/g, "''")}';
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = v_email;
    
    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            role,
            aud,
            created_at,
            updated_at
        ) VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000',
            v_email,
            extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
              'email', v_email,
              'first_name', 'Platform',
              'last_name', 'Administrator',
              'system_role', 'PLATFORM_ADMIN',
              'account_type', 'STUDENT'
            ),
            'authenticated',
            'authenticated',
            now(),
            now()
        );
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            confirmation_token = coalesce(confirmation_token, ''),
            email_change = coalesce(email_change, ''),
            email_change_token_current = coalesce(email_change_token_current, ''),
            email_change_token_new = coalesce(email_change_token_new, ''),
            recovery_token = coalesce(recovery_token, ''),
            phone_change = coalesce(phone_change, ''),
            phone_change_token = coalesce(phone_change_token, ''),
            reauthentication_token = coalesce(reauthentication_token, ''),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            updated_at = now()
        WHERE id = v_admin_id;
    END IF;

    -- Ensure matching auth.identities record exists for password authentication
    IF NOT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = v_admin_id AND provider = 'email'
    ) THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_admin_id,
            jsonb_build_object(
              'sub', v_admin_id,
              'email', v_email,
              'email_verified', true,
              'phone_verified', false,
              'first_name', 'Platform',
              'last_name', 'Administrator'
            ),
            'email',
            v_admin_id,
            now(),
            now(),
            now()
        );
    END IF;

    -- Upsert profile with ACTIVE state and PLATFORM_ADMIN system role
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        display_name,
        account_type,
        account_state,
        metadata
    ) VALUES (
        v_admin_id,
        v_email,
        'Platform',
        'Administrator',
        'Platform Admin',
        'STUDENT',
        'ACTIVE',
        '{"system_role":"PLATFORM_ADMIN","onboarding_completed":true}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        account_state = 'ACTIVE',
        metadata = coalesce(public.profiles.metadata, '{}'::jsonb) || '{"system_role":"PLATFORM_ADMIN","onboarding_completed":true}'::jsonb;

    -- Ensure public.user_roles contains PLATFORM_ADMIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = v_admin_id AND role = 'PLATFORM_ADMIN'
    ) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_admin_id, 'PLATFORM_ADMIN');
    END IF;

    -- Synchronize Chinmayi / Simats Engineering organization if pending
    IF EXISTS (
        SELECT 1 FROM public.verification_requests 
        WHERE organization_name = 'Simats Engineering'
    ) AND NOT EXISTS (
        SELECT 1 FROM public.organizations WHERE slug = 'simats-engineering' OR name = 'Simats Engineering'
    ) THEN
        DECLARE
            v_org_id uuid := gen_random_uuid();
            v_creator_id uuid;
        BEGIN
            SELECT user_id INTO v_creator_id FROM public.verification_requests WHERE organization_name = 'Simats Engineering' LIMIT 1;
            INSERT INTO public.organizations (
                id, name, slug, type, verified, verification_status, created_by, country_code, timezone
            ) VALUES (
                v_org_id, 'Simats Engineering', 'simats-engineering', 'COLLEGE_UNIVERSITY', false, 'PENDING', v_creator_id, 'IN', 'Asia/Kolkata'
            );
            INSERT INTO public.organization_verifications (
                organization_id, submitted_by, official_email, status, review_notes
            ) VALUES (
                v_org_id, v_creator_id, 'chinmayi@gmail.com', 'PENDING', 'College / University registration awaiting Platform Admin review'
            );
            INSERT INTO public.organization_members (
                organization_id, user_id, role, status
            ) VALUES (
                v_org_id, v_creator_id, 'COLLEGE_ADMIN', 'INVITED'
            );
        END;
    END IF;

END $$;
`;

const tempSqlFile = path.join(process.cwd(), "scripts", "_temp_admin_seed.sql");
fs.writeFileSync(tempSqlFile, sqlScript, "utf8");

try {
  console.log(`[Platform Admin Setup] Executing SQL against Supabase database...`);
  execSync(`npx supabase db query --linked --file scripts/_temp_admin_seed.sql`, {
    stdio: "inherit",
  });
  console.log(`\n======================================================`);
  console.log(`[SUCCESS] Platform Admin Setup Completed Successfully!`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Target:   /admin/overview (via standard /login)`);
  console.log(`======================================================\n`);
} catch (err) {
  console.error(`[Platform Admin Setup Error]:`, err.message);
  process.exit(1);
} finally {
  if (fs.existsSync(tempSqlFile)) {
    fs.unlinkSync(tempSqlFile);
  }
}
