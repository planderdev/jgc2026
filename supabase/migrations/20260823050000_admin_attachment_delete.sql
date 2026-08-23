-- 사무국이 Storage의 첨부(소개서 PDF)를 삭제할 수 있게 한다.
-- 테스트 파일 정리와 행사 후 파기용. 기관·익명은 여전히 삭제 불가.
create policy "admin attachment delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'meetup-attachments' and public.jgcf_is_admin());
