-- 기관 계정의 소개서 PDF 내려받기 수리.
-- storage.objects의 "partner attachment read" 정책이 reservations/partner_users를
-- 직접 서브쿼리했는데, 두 테이블은 RLS 전면 차단이라 기관 토큰으로 실행되는
-- 서브쿼리가 항상 빈 결과 → 다운로드가 무조건 거부됐다(관리자는 별도 정책으로 통과).
-- RLS를 우회해 "내 기관의 확정 예약에 달린 파일인가"만 판정하는
-- SECURITY DEFINER 함수로 바꾼다.
create or replace function public.jgcf_partner_can_read_attachment(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.reservations r
      join public.partner_users p on p.company_id = r.company_id
     where p.user_id = auth.uid()
       and r.attachment_path = p_path
       and r.status = 'confirmed'
  );
$$;

revoke all on function public.jgcf_partner_can_read_attachment(text) from public, anon;
grant execute on function public.jgcf_partner_can_read_attachment(text) to authenticated;

drop policy if exists "partner attachment read" on storage.objects;
create policy "partner attachment read" on storage.objects
  for select to authenticated
  using (bucket_id = 'meetup-attachments' and public.jgcf_partner_can_read_attachment(name));
