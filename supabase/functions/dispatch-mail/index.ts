/**
 * 메일 발송기.
 *
 * public.mail_outbox 에 쌓인 대기 건을 꺼내 Resend로 보낸다.
 * 호출자: DB의 jgcf_dispatch_mail() — 예약 확정·취소 직후, 그리고 1분마다 cron.
 *
 * 필요한 비밀값(Supabase → Edge Functions → Secrets):
 *   RESEND_API_KEY  Resend API 키
 *   DISPATCH_KEY    호출자 확인용. public.mail_settings.dispatch_key 와 같아야 한다
 *   MAIL_FROM       보내는 사람. 예: JGCF 2026 운영사무국 <noreply@2026jejugcf.com>
 */
const BATCH = 20;
const MAX_ATTEMPTS = 5;      // 우리 쪽 원인으로 실패했을 때의 재시도 한도
const MAX_DEFERRALS = 60;    // 한도 초과로 미리미리 보류한 횟수 상한(대략 하루치)
// 재시도해도 결과가 같은 응답들. 주소가 틀렸거나 키가 잘못된 경우다.
const PERMANENT = new Set([400, 401, 403, 404, 422]);
const SITE = 'https://2026jejugcf.com';
const VENUE = '제주특별자치도 제주시 신산로 82 제주콘텐츠진흥원 내 1층 Be IN; (비인)';
const CONTACT = '제주콘텐츠진흥원 064-735-0677';

type Row = {
  id: number;
  kind: string;
  to_email: string;
  payload: Record<string, string>;
  attempts: number;
  deferrals: number;
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f5f5f5;padding:24px 12px">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1a1a1a">
  <div style="padding:20px 24px;border-bottom:1px solid #eee">
    <div style="font-size:13px;color:#666;letter-spacing:.02em">2026 제주글로벌콘텐츠포럼</div>
    <div style="font-size:19px;font-weight:700;margin-top:4px">${esc(title)}</div>
  </div>
  <div style="padding:24px;font-size:15px;line-height:1.7">${bodyHtml}</div>
  <div style="padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#777;line-height:1.6">
    문의: ${esc(CONTACT)}<br>
    이 메일은 발신 전용입니다. 회신하셔도 확인되지 않습니다.
  </div>
</div></body></html>`;
}

function detailTable(rows: [string, string][]) {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#666;width:110px;vertical-align:top;font-size:14px">${esc(k)}</td>
             <td style="padding:8px 0;font-weight:600">${esc(v)}</td></tr>`
    )
    .join('')}</table>`;
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">${esc(label)}</a>`;
}

/** Retry-After 헤더는 초 단위 숫자 또는 날짜다. 못 읽으면 null. */
function retryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 6 * 3600) * 1000;
  const at = Date.parse(value);
  if (!Number.isNaN(at)) return Math.max(0, Math.min(at - Date.now(), 6 * 3600 * 1000));
  return null;
}

function render(row: Row): { subject: string; html: string } | null {
  const p = row.payload || {};
  const slot = `2026년 9월 16일(수) ${p.time_slot ?? ''}`;

  if (row.kind === 'reservation_confirmed') {
    return {
      subject: `[JGCF 2026] 비즈니스 밋업 예약이 확정되었습니다 (${p.reservation_no ?? ''})`,
      html: layout('비즈니스 밋업 예약 확정', `
        <p>${esc(p.manager_name)} 님, 비즈니스 밋업 상담 예약이 확정되었습니다.</p>
        ${detailTable([
          ['예약번호', String(p.reservation_no ?? '')],
          ['상담기관', String(p.company_name ?? '')],
          ['상담 시간', slot],
          ['신청 기업', String(p.applicant_company ?? '')],
          ['장소', VENUE]
        ])}
        <p style="margin:20px 0 8px">예약 조회와 취소는 아래에서 하실 수 있습니다. 예약번호와 연락처가 필요합니다.</p>
        <p>${button(`${SITE}/meetup/confirm`, '예약 조회·취소')}</p>
        <p style="color:#666;font-size:13.5px;margin-top:20px">
          · 예약 변경·취소는 <strong>9월 15일(화) 자정</strong>까지 가능합니다.<br>
          · 참석이 어려우시면 꼭 취소해 주세요. 다른 기업이 그 시간을 쓸 수 있습니다.<br>
          · 상담 10분 전까지 행사장 접수 데스크에서 출석 확인을 해주세요.
        </p>`)
    };
  }

  if (row.kind === 'reservation_cancelled') {
    return {
      subject: `[JGCF 2026] 비즈니스 밋업 예약이 취소되었습니다 (${p.reservation_no ?? ''})`,
      html: layout('비즈니스 밋업 예약 취소', `
        <p>${esc(p.manager_name)} 님, 아래 예약이 취소되었습니다.</p>
        ${detailTable([
          ['예약번호', String(p.reservation_no ?? '')],
          ['상담기관', String(p.company_name ?? '')],
          ['상담 시간', slot],
          ['신청 기업', String(p.applicant_company ?? '')]
        ])}
        <p>직접 취소하지 않으셨다면 사무국으로 연락해 주세요.</p>
        <p style="margin-top:16px">${button(`${SITE}/meetup/reserve`, '다시 예약하기')}</p>
        <p style="color:#666;font-size:13.5px;margin-top:20px">예약 접수는 9월 15일(화) 자정까지입니다.</p>`)
    };
  }

  if (row.kind === 'registration_confirmed') {
    const typeLabel = { company: '기업', general: '일반', student: '학생' }[p.participant_type ?? ''] ?? '';
    return {
      subject: `[JGCF 2026] 행사 참가신청이 접수되었습니다 (${p.registration_no ?? ''})`,
      html: layout('행사 참가신청 완료', `
        <p>${esc(p.name)} 님, 2026 제주글로벌콘텐츠포럼 참가신청이 접수되었습니다.</p>
        ${detailTable([
          ['신청번호', String(p.registration_no ?? '')],
          ['구분', typeLabel],
          ...(p.organization ? ([['소속', String(p.organization)]] as [string, string][]) : []),
          ['행사 일시', '2026년 9월 16일(수) 10:00–18:00'],
          ['장소', VENUE]
        ])}
        <p style="margin:20px 0 8px">상담이 필요하시면 비즈니스 밋업도 예약하실 수 있습니다.</p>
        <p>${button(`${SITE}/meetup/reserve`, '비즈니스 밋업 예약')}</p>
        <p style="color:#666;font-size:13.5px;margin-top:20px">
          · 행사 당일 접수 데스크에서 <strong>신청번호</strong>를 말씀해 주세요.<br>
          · 프로그램은 <a href="${SITE}/program" style="color:#1a1a1a">행사 사이트</a>에서 확인하실 수 있습니다.
        </p>`)
    };
  }

  if (row.kind === 'partner_cancelled') {
    return {
      subject: `[JGCF 2026] 상담 예약 취소 알림 — ${p.time_slot ?? ''} ${p.applicant_company ?? ''}`,
      html: layout('상담 예약 취소 알림', `
        <p>${esc(p.company_name)} 담당자님, 귀 기관에 배정된 상담 한 건이 취소되었습니다.</p>
        ${detailTable([
          ['상담 시간', slot],
          ['신청 기업', String(p.applicant_company ?? '')],
          ['담당자', String(p.manager_name ?? '')],
          ['예약번호', String(p.reservation_no ?? '')]
        ])}
        <p>해당 시간은 다시 열려 다른 기업이 예약할 수 있습니다. 최신 일정은 아래에서 확인하세요.</p>
        <p style="margin-top:16px">${button(`${SITE}/admin`, '상담 일정 확인')}</p>`)
    };
  }

  return null;
}

Deno.serve(async (req) => {
  const expected = Deno.env.get('DISPATCH_KEY') ?? '';
  if (!expected || req.headers.get('x-dispatch-key') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM') ?? 'JGCF 2026 운영사무국 <noreply@2026jejugcf.com>';

  const db = (path: string, init: RequestInit = {}) =>
    fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    });

  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY 없음' }), { status: 500 });

  const now = new Date().toISOString();
  const pending: Row[] = await db(
    `mail_outbox?status=eq.pending&attempts=lt.${MAX_ATTEMPTS}` +
      `&or=(deferred_until.is.null,deferred_until.lte.${now})` +
      `&order=created_at.asc&limit=${BATCH}` +
      `&select=id,kind,to_email,payload,attempts,deferrals`
  ).then((r) => r.json());

  let sent = 0;
  let failed = 0;
  let deferred = 0;

  /** 일시적 실패: 간격을 늘려 가며 다시 시도한다(2,4,8,16분… 최대 60분). */
  const defer = async (r: Row, message: string) => {
    const attempts = r.attempts + 1;
    const wait = Math.min(60, 2 ** attempts) * 60 * 1000;
    await db(`mail_outbox?id=eq.${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        attempts,
        deferred_until: new Date(Date.now() + wait).toISOString(),
        last_error: message
      })
    });
  };

  for (const row of pending) {
    const mail = render(row);
    if (!mail) {
      await db(`mail_outbox?id=eq.${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'failed', attempts: row.attempts + 1, last_error: `알 수 없는 종류: ${row.kind}` })
      });
      failed++;
      continue;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [row.to_email], subject: mail.subject, html: mail.html })
      });
      if (res.ok) {
        await db(`mail_outbox?id=eq.${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'sent', attempts: row.attempts + 1,
            sent_at: new Date().toISOString(), last_error: null, deferred_until: null
          })
        });
        sent++;
        continue;
      }

      const text = (await res.text()).slice(0, 400);

      // 한도 초과: 시간이 지나면 풀린다. 재시도 횟수를 깎지 않고 미뤄 둔다.
      // 그러지 않으면 행사 당일 한 번 걸렸을 때 메일이 영영 안 나간다.
      if (res.status === 429) {
        const deferrals = row.deferrals + 1;
        const wait = retryAfterMs(res.headers.get('retry-after')) ?? 15 * 60 * 1000;
        await db(`mail_outbox?id=eq.${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: deferrals >= MAX_DEFERRALS ? 'failed' : 'pending',
            deferrals,
            deferred_until: new Date(Date.now() + wait).toISOString(),
            last_error: `429 (${deferrals}번째 보류) ${text}`
          })
        });
        deferred++;
        continue;
      }

      // 주소·키 오류처럼 다시 보내도 같은 결과인 응답은 즉시 포기한다.
      if (PERMANENT.has(res.status)) {
        await db(`mail_outbox?id=eq.${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'failed', attempts: row.attempts + 1, last_error: `${res.status} ${text}` })
        });
        failed++;
        continue;
      }

      // 그 밖(5xx 등)은 간격을 늘려 가며 다시 시도한다.
      await defer(row, `${res.status} ${text}`);
      failed++;
    } catch (error) {
      // 네트워크 오류도 일시적인 것으로 본다.
      await defer(row, String((error as Error).message).slice(0, 400));
      failed++;
    }
  }

  return new Response(JSON.stringify({ picked: pending.length, sent, failed, deferred }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
