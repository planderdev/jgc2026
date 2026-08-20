(function () {
  /**
   * Supabase 접속 정보.
   *
   * 이 키는 브라우저에 노출되는 공개 키(publishable)입니다. 노출되어도
   * 문제가 없도록 설계되어 있습니다. 데이터베이스 테이블은 RLS로 전면
   * 차단되어 있고, 이 키로는 jgcf_* 함수만 호출할 수 있습니다. 함수는
   * 각자 필요한 데이터만 돌려주고, 예약 조회는 예약번호와 담당자
   * 연락처가 모두 맞아야 응답합니다.
   *
   * 절대 넣지 말아야 할 것: service_role 키. 그 키는 RLS를 무시하므로
   * 브라우저에 들어가면 신청자 전원의 개인정보가 그대로 노출됩니다.
   * 사무국 작업에는 Supabase 대시보드를 쓰세요.
   */
  window.JGCFSupabase = {
    url: 'https://ahabmxxenajosbdkzull.supabase.co',
    publishableKey: 'sb_publishable_sZXEH2tRPx58B5AolInjhw_eai6mdb6',
    attachmentBucket: 'meetup-attachments'
  };
})();
