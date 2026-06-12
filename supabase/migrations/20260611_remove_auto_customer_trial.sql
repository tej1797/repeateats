-- Stop auto-granting 3-day Pro trial on signup; trial must be opted in explicitly.
-- Mobile app shares this database — coordinate with mobile team before deploying.

DROP TRIGGER IF EXISTS trg_customer_start_trial ON public.users;

CREATE OR REPLACE FUNCTION public.start_customer_pro_trial(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated int;
BEGIN
  UPDATE public.users
  SET
    repeat_plus_trial_started_at = now(),
    repeat_plus_trial_ends_at    = now() + interval '3 days',
    repeat_plus_trial_used       = true
  WHERE id = p_user_id
    AND coalesce(repeat_plus_tier, 'free') = 'free'
    AND coalesce(repeat_plus_trial_used, false) = false
    AND (repeat_plus_trial_ends_at IS NULL OR repeat_plus_trial_ends_at <= now());

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_customer_pro_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_customer_pro_trial(uuid) TO service_role;
