-- 회사 소개서 PDF 상한을 5MB → 20MB로. 기업 소개자료는 이미지가 많아 5MB를 넘기기 쉽다.
-- 화면(meetup.js ATTACHMENT_MAX_MB)과 안내 문구도 같은 값이어야 한다.
update storage.buckets set file_size_limit = 20971520 where id = 'meetup-attachments';
