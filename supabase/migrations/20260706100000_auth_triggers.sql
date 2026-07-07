-- =====================================================================
-- ELEVA AUTH TRIGGER: auto-create profile + user_preferences on signup
-- Idempotent — safe to re-run
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profile row
  INSERT INTO public.profiles (user_id, email, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- User preferences with defaults
  INSERT INTO public.user_preferences (user_id, theme, default_model, email_digest, realtime_notifications, product_updates, updated_at)
  VALUES (NEW.id, 'system', 'google/gemini-2.5-flash', true, true, false, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Welcome notification (best-effort; ignore if RLS or perms are unusual)
  BEGIN
    INSERT INTO public.notifications (user_id, kind, title, body, href)
    VALUES (
      NEW.id,
      'welcome',
      'Welcome to Eleva 👋',
      'Paste any job description in Studio to run your first pipeline.',
      '/eleva/studio'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Activity log
  BEGIN
    INSERT INTO public.activity_log (user_id, kind, title, subtitle)
    VALUES (NEW.id, 'account_created', 'Welcome to Eleva', 'Account created successfully.');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

-- Attach trigger on auth.users AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill for any existing users missing a profile / preferences row
INSERT INTO public.profiles (user_id, email, first_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)),
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.user_preferences (user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id
WHERE up.user_id IS NULL;
