(function () {
  /**
   * 예약/신청 저장소.
   *
   * Supabase의 jgcf_* 함수만 호출합니다. 테이블에는 직접 접근하지 않으며,
   * 접근하려 해도 RLS가 막습니다. 중복 예약과 중복 신청 차단, 입력 검증은
   * 모두 서버에서 처리하므로 브라우저 쪽 검증을 우회해도 통과하지 못합니다.
   *
   * 모든 함수는 Promise를 돌려줍니다.
   */
  const config = () => window.JGCFSupabase;

  const REASON_MESSAGES = {
    closed: '밋업 예약 접수가 마감되었습니다(행사 전날 자정까지). 변경·취소는 운영사무국에 문의해 주세요.',
    registration_closed: '행사가 종료되어 참가신청 접수를 마감했습니다.',
    slot_taken: '방금 다른 참가자가 이 시간대를 예약했습니다. 다른 시간을 선택해 주세요.',
    already_reserved: '이미 예약이 있습니다. 한 담당자당 한 건만 신청할 수 있습니다. 예약 조회에서 기존 예약을 확인해 주세요.',
    already_registered: '이미 참가신청이 접수된 연락처입니다.',
    invalid_email: '메일 주소를 정확하게 입력해 주세요.',
    invalid_phone: '연락처를 정확하게 입력해 주세요.',
    missing_field: '필수 항목이 비어 있습니다.',
    too_long: '입력 내용이 너무 깁니다.',
    invalid_type: '참가 구분을 다시 선택해 주세요.',
    not_found: '예약번호와 담당자 연락처가 일치하는 예약이 없습니다.',
    not_found_or_already_cancelled: '이미 취소되었거나 일치하는 예약이 없습니다.',
    code_generation_failed: '예약번호 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    network: '서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'
  };

  function messageFor(reason) {
    return REASON_MESSAGES[reason] || '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  async function callFunction(name, payload) {
    const { url, publishableKey } = config();
    let response;
    try {
      response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload || {})
      });
    } catch (error) {
      console.error(`${name} 호출 실패`, error);
      return { ok: false, reason: 'network' };
    }

    if (!response.ok) {
      console.error(`${name} 응답 오류`, response.status, await response.text().catch(() => ''));
      return { ok: false, reason: 'network' };
    }

    return response.json();
  }

  /** 접수 기간인지. 마감은 서버가 강제하고 이 값은 화면 안내용이다. */
  async function isOpen() {
    const result = await callFunction('jgcf_reservation_open', {});
    return result === true;
  }

  /** 참가신청 접수 기간인지(행사 종료 시각까지). 화면 안내용이며 서버가 강제한다. */
  async function isRegistrationOpen() {
    const result = await callFunction('jgcf_registration_open', {});
    return result === true;
  }

  /** 선택한 상담기관에서 이미 예약된 시간대 목록. 개인정보는 오지 않는다. */
  async function takenSlots(companyId) {
    const result = await callFunction('jgcf_taken_slots', { p_company_id: companyId });
    return Array.isArray(result) ? result : [];
  }

  /**
   * 회사 소개서 PDF 업로드.
   * 예약번호가 나오기 전에 올려야 하므로 임의 경로를 쓴다.
   * 버킷은 비공개라 경로를 알아도 내려받을 수 없다.
   */
  async function uploadAttachment(file) {
    if (!file) return { ok: true, path: null, name: null };

    const { url, publishableKey, attachmentBucket } = config();
    const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(-80);
    const path = `${crypto.randomUUID()}/${safeName}`;

    try {
      const response = await fetch(`${url}/storage/v1/object/${attachmentBucket}/${path}`, {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          'Content-Type': file.type || 'application/pdf'
        },
        body: file
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('첨부파일 업로드 실패', response.status, detail);
        // 20MB 초과나 PDF가 아닌 파일은 버킷 설정에서 거부된다(화면에서도 먼저 검사한다).
        return { ok: false, reason: 'upload_failed', status: response.status };
      }
    } catch (error) {
      console.error('첨부파일 업로드 실패', error);
      return { ok: false, reason: 'network' };
    }

    return { ok: true, path, name: file.name };
  }

  async function create(payload) {
    return callFunction('jgcf_create_reservation', {
      p_company_id: payload.companyId,
      p_company_name: payload.companyName,
      p_company_field: payload.companyField,
      p_time_slot: payload.time,
      p_applicant_company: payload.applicantCompany,
      p_manager_name: payload.managerName,
      p_phone: payload.phone,
      p_email: payload.email,
      p_inquiry: payload.inquiry,
      p_attachment_path: payload.attachmentPath || null,
      p_attachment_name: payload.attachmentName || null
    });
  }

  async function findForLookup(reservationNo, phone) {
    return callFunction('jgcf_lookup_reservation', {
      p_reservation_no: reservationNo,
      p_phone: phone
    });
  }

  async function cancel(reservationNo, phone) {
    return callFunction('jgcf_cancel_reservation', {
      p_reservation_no: reservationNo,
      p_phone: phone
    });
  }

  async function createRegistration(payload) {
    return callFunction('jgcf_create_registration', {
      p_participant_type: payload.type,
      p_name: payload.name,
      p_organization: payload.organization || null,
      p_phone: payload.phone
    });
  }

  window.ReservationService = {
    isOpen,
    isRegistrationOpen,
    takenSlots,
    uploadAttachment,
    create,
    findForLookup,
    cancel,
    createRegistration,
    messageFor
  };
})();
