alter table public.profiles
  alter column max_quotes set default 15;

update public.profiles
set max_quotes = 15,
    features = features || jsonb_build_object(
      'branding', false,
      'advanced_metrics', false,
      'pdf_watermark', true,
      'advanced_exports', false,
      'quote_export', true,
      'cloud_sync', false
    )
where plan = 'beta'
  and (
    max_quotes is distinct from 15
    or not features @> jsonb_build_object(
      'branding', false,
      'advanced_metrics', false,
      'pdf_watermark', true,
      'advanced_exports', false,
      'quote_export', true,
      'cloud_sync', false
    )
  );
