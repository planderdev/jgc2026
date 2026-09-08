-- 2026-09-08 뉴키즈인베스트먼트 요청: 16:00·16:30 상담 개방.
-- data.js companyReservationBreaks 와 항상 같은 값을 유지한다.
create or replace function public.jgcf_company_slot_blocked(p_company_id text, p_time_slot text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce((
    '{
      "kb-investment":                       ["10:00","10:30","11:00","11:30","13:00","16:00","16:30"],
      "daekyo-investment":                   ["13:30","14:00","16:00","16:30"],
      "logan-ventures":                      ["16:00","16:30"],
      "smartrun":                            ["13:30","14:00","16:00","16:30"],
      "gomao-ventures":                      ["10:00","10:30","11:00","11:30","13:00","13:30","14:00"],
      "newkids-investment":                  ["10:00","10:30","11:00","11:30","13:00","13:30","14:00"],
      "jeju-content-agency":                 ["14:30"],
      "jeju-hrd":                            ["14:30"],
      "kb-financial":                        ["14:30"],
      "kibo-busan-content-finance":          ["14:30"],
      "jeju-economic-trade-agency":          ["14:30"],
      "jeju-credit-guarantee-foundation":    ["14:30"],
      "cheju-halla-k-hightech-platform":     ["14:30"],
      "jeju-national-tech-commercialization":["14:30"],
      "jeju-creative-economy":               ["13:00","13:30","16:30"],
      "jeju-startup-onestop":                ["13:00","13:30","16:30"],
      "jeju-ip-center":                      ["13:00","13:30","16:30"]
    }'::jsonb -> p_company_id
  ) ? p_time_slot, false);
$$;
