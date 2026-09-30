update public.profiles
set plan = 'pro',
    beta_expires_at = null,
    max_quotes = 9999,
    features = coalesce(features, '{}'::jsonb) || jsonb_build_object(
      'branding', true,
      'advanced_metrics', true,
      'pdf_watermark', false,
      'advanced_exports', true,
      'quote_export', true,
      'cloud_sync', true
    )
where lower(trim(email)) = 'totyslandjugueteria@gmail.com';