-- 회사 소개서 PDF 저장소.
-- 비공개 버킷이라 URL을 알아도 읽을 수 없다. 사무국은 대시보드나
-- service_role 키로만 내려받는다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meetup-attachments',
  'meetup-attachments',
  false,
  5242880,                      -- 5MB
  array['application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 브라우저는 업로드만 할 수 있다. 읽기/수정/삭제 정책은 만들지 않는다.
-- 정책이 없으면 해당 동작은 거부된다.
drop policy if exists "meetup attachment upload" on storage.objects;
create policy "meetup attachment upload"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'meetup-attachments');
