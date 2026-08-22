-- QA 자동 검증이 남긴 테스트 데이터 정리. Supabase SQL Editor에서 실행.
-- 예약은 검증 끝에 취소되지만 행은 남고, 참가신청은 브라우저 키로 삭제할 수 없어 남는다.
delete from public.reservations        where applicant_company like '\_\_QA\_\_%';
delete from public.event_registrations where name like '\_\_QA\_\_%';
-- 첨부 더미 PDF는 Storage → meetup-attachments 에서 삭제한다(내용 없는 20바이트 파일).
