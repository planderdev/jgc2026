(function () {
  const image = (path) => path;
  const eventDate = '2026.09.16';
  const eventTime = '10:00-18:00';
  const eventPlace = '비인공연장 등 제주콘텐츠진흥원 일원';
  const eventVenueDetail = '비인공연장 등 제주콘텐츠진흥원 일원';
  const eventPeriod = `${eventDate} - ${eventDate}`;

  const partnerLogoLabels = {
    1: 'Jeju Special Self-Governing Province',
    2: 'Jeju Content Agency',
    3: 'Jeju Regional Human Resources Development Committee',
    4: 'Ministry of Culture, Sports and Tourism',
    6: 'Korea Creative Content Agency',
    7: 'Jeju Special Self-Governing Province Development Corporation',
    8: 'Amazon Web Services',
    9: 'Megazone Cloud',
    10: 'UNESCO WHIPIC'
  };

  const partnerLogo = (number) => ({
    label: partnerLogoLabels[number] || `Partner ${String(number).padStart(2, '0')}`,
    number,
    logoClass: `is-partner-logo-${number}`,
    logo: image(`assets/images/partners/partner-${number}.svg`)
  });

  const partnerLogos = [1, 2, 3, 4, 6, 7, 8, 9, 10].map(partnerLogo);
  const partnerLogoByNumber = partnerLogos.reduce((items, item) => {
    items[item.number] = item;
    return items;
  }, {});

  const hostOrganizerItems = [
    partnerLogoByNumber[1],
    partnerLogoByNumber[2],
    partnerLogoByNumber[3]
  ];

  const partnerItems = [
    partnerLogoByNumber[10],
    partnerLogoByNumber[4],
    partnerLogoByNumber[6],
    partnerLogoByNumber[7],
    partnerLogoByNumber[8],
    partnerLogoByNumber[9]
  ];

  const partnerGroups = [
    {
      title: 'Host/Organizer',
      subtitle: '주최/주관',
      items: hostOrganizerItems
    },
    {
      title: 'PARTNERS',
      subtitle: '협력기관',
      items: partnerItems
    }
  ];

  const mainIrCompanies = [
    {
      id: 'haenyeo-kitchen',
      name: '해녀의 부엌',
      project: '진행중',
      field: '관광 / 공연',
      points: [
        '제주 해녀문화 기반 공연, 미식, 관광 융합 콘텐츠',
        '2026 지역관광 활성화 우수사례 선정',
        '2025 해녀의 부엌 싱가포르점 오픈',
        '2024 한국 관광의 별 융복합 관광콘텐츠 분야 선정',
        '2022 씨엔티테크 투자 유치'
      ]
    },
    {
      id: 'greenwood',
      name: '그린우드',
      project: '진행중',
      field: '애니메이션',
      points: [
        '제주 기반 애니메이션 「신비할망」, 「프린세스 바리」 제작',
        '「신비할망」 KBS, 채널A, 대원, 대교 방영 및 라프텔, 티빙, 쿠팡 서비스',
        '2025 한국콘텐츠진흥원 국산애니메이션 본편 지원사업 선정',
        '2024 문화체육관광부장관 표창',
        '2023 글로벌 IP스타기업 선정'
      ]
    },
    {
      id: 'inspire',
      name: '인스피어',
      project: '진행중',
      field: '영상 / 미디어아트',
      points: [
        'K-Heritage, XR, AI 기반 미디어아트 기획, 제작, 운영',
        '2026 제주현대미술관 「해와 달의 노래」, 「곶자왈」 전시',
        '2025 「바람의 상점」 로컬크리에이터 육성사업 최우수 선정',
        '2025 SXSW Sydney 아트코리아랩 한국관 대표기업',
        '2024 「XR 도채비」 지역특화 콘텐츠지원 최우수 선정'
      ]
    },
    {
      id: 'winops',
      name: '위놉스',
      project: '진행중',
      field: '영상, 애니, 실감형 콘텐츠',
      points: [
        '애니메이션, AR, VR, VFX 기반 뉴미디어 및 실감형 콘텐츠 제작',
        '애니메이션 「호텔 페니」, 「비밀의 바람숲」 제작',
        '2026 「호텔 페니」 해외진출 관련 체코 크루타트 업무협약',
        '2025 국가유산 미디어아트 「제주목 관아」 제작',
        '세계자연유산 「만장굴」, 김창열미술관 실감콘텐츠 제작'
      ]
    },
    {
      id: 'hyuple',
      name: '휴플',
      project: '진행중',
      field: '관광',
      points: [
        'AI 기반 로컬여행 플랫폼 「젠트립」 운영',
        'AI 여행추천 「젠톡」 및 관광약자 서비스 「나드리」 개발',
        '2023 신한금융그룹 신한퓨처스랩 9기 선정',
        '2022 한국관광공사 관광액셀러레이팅 선정',
        '2021 올해의 관광벤처 ESG 분야 우수상'
      ]
    },
    {
      id: 'grime',
      name: '그리메',
      project: '진행중',
      field: '영상, 캐릭터',
      points: [
        '2026 TV 애니메이션 「오묘한카페」 시즌1 제작',
        '웹툰 플랫폼 서비스 운영 예정',
        '「응까소나타」 MBC TV 방영',
        '2020 대원씨아이 「거신대전」 IP 활용 콘텐츠산업 확대 MOU 체결'
      ]
    },
    {
      id: 'k-company',
      name: '케이컴퍼니',
      project: '진행중',
      field: 'AI',
      points: [
        '생성형 AI 기반 영상 및 디지털 콘텐츠 제작',
        '2026 AI 단편영화 「알 수도, 모를 수도」 WAIFF Seoul 대상',
        '「알 수도, 모를 수도」 WAIFF Cannes 초청 상영',
        '공공기관 SNS, 영상, AI 홍보콘텐츠 제작'
      ]
    },
    {
      id: 'freeidea',
      name: '프리아이디어',
      project: '진행중',
      field: 'AI&관광, ESG',
      points: [
        'AIoT 스마트 어메니티 「오설러」 및 호텔 운영 SaaS 개발',
        'AI 기반 사용량, 재고, 탄소절감 데이터 관리',
        '2025 「오설러」 조달청 혁신제품 최종 통과',
        'TIPS R&D 및 초격차 프로젝트 1000+ DIPS 선정',
        '프랑스, 벨기에 등 유럽 수출계약 체결'
      ]
    }
  ];

  const risingIrCompanies = [
    {
      id: 'sai',
      name: '사이',
      project: '진행중',
      field: '식품(차, 티백 등)',
      points: ['제주 로컬 원료 블렌딩티 체험과 감정 기록을 결합해 기록 콘텐츠로 제공하는 프로그램']
    },
    {
      id: 'egg-basket',
      name: '계란바구니',
      project: '진행중',
      field: '콘텐츠',
      points: ['인터뷰 기반 콘텐츠 생성기록 서비스']
    },
    {
      id: 'romantic-earthian',
      name: '낭만지구인',
      project: '진행중',
      field: '콘텐츠',
      points: ['제주신화역사 기반 서귀포 원도심 살강길 메타로드']
    },
    {
      id: 'gyulbati',
      name: '귤바티',
      project: '진행중',
      field: '식품 / 콘텐츠',
      points: ['못난이귤로 재해석한 제주 전통 발효 음료']
    },
    {
      id: 'haewoo',
      name: '해우',
      project: '진행중',
      field: '콘텐츠 / 제조',
      points: ['머메이드다이빙 체험 교육 및 장비 제조']
    }
  ];

  const exhibitionCompanies = [
    { id: 'megazone-cloud', name: '메가존클라우드', field: '클라우드', note: '국내 최대 클라우드 매니지드 서비스 제공기업' },
    { id: 'com2us-n', name: '컴투스엔', field: 'AI', note: '콘텐츠 기획 및 제작, AI, VFX, XR 뉴미디어 등 통합 비즈니스 진행' },
    { id: 'wondershare', name: '원더쉐어', field: 'AI / 플랫폼', note: 'AI 기반 영상편집 플랫폼 「필모라」 등 콘텐츠 제작 플랫폼 제공' },
    { id: 'greenwood-exhibit', name: '그린우드', field: '애니메이션', note: '애니메이션 「신비할망」, 「프린세스 바리」 제작. KBS, 채널A, 대원, 대교 방영 및 라프텔, 티빙, 쿠팡 서비스. 2024 문화체육관광부 표창' },
    { id: 'inspire-exhibit', name: '인스피어', field: '영상 / 미디어아트', note: 'K-Heritage 데이터와 IP, XR·AI 기반 몰입형 미디어아트 공간 콘텐츠. 2026 지역문화산업연구센터 지원사업 선정' },
    { id: 'winops-exhibit', name: '위놉스', field: '영상, 애니, 실감형 콘텐츠', note: '애니메이션 「호텔 페니」, 「비밀의 바람 숲」과 AR·VR·VFX 기반 실감형 콘텐츠. 「호텔 페니」 체코 크루타트 업무협약 체결' },
    { id: 'hyuple-exhibit', name: '휴플', field: '관광 / 테크', note: '여행플랫폼 「젠트립」, AI 여행추천 「젠톡」, 무장애 관광 「나드리」. 한국관광공사 관광액셀러레이팅 선정, 문화체육관광부 관광벤처 ESG 분야 우수상' },
    { id: 'grime-exhibit', name: '그리메', field: '애니 / 캐릭터', note: '「오묘한카페」, 「거신대전-바람의 신주」. 자체 캐릭터 IP와 2D 애니메이션 라이선싱, 웹툰 사업 확장' },
    { id: 'k-company-exhibit', name: '케이컴퍼니', field: 'AI 콘텐츠', note: 'AI 단편영화 「알 수도, 모를 수도」 WAIFF Seoul 2026 대상. 생성형 AI 기반 영상, 디지털 콘텐츠 제작과 디지털 마케팅' },
    { id: 'freeidea-exhibit', name: '프리아이디어', field: 'AI&관광, ESG', note: 'AIoT 스마트 어메니티와 호텔 데이터 SaaS. 어메니티 운영, 재고 최적화와 탄소중립 ESG 호스피탈리티 테크' },
    { id: 'sai-exhibit', name: '사이', field: '식품', note: '제주 로컬 원료 블렌딩티 체험과 감정 기록을 결합해 기록 콘텐츠로 제공하는 프로그램' },
    { id: 'egg-basket-exhibit', name: '계란바구니', field: '콘텐츠', note: '인터뷰 기반 콘텐츠 생성 기록 서비스' },
    { id: 'romantic-earthian-exhibit', name: '낭만지구인', field: '콘텐츠', note: '제주신화역사 기반 서귀포 원도심 살강길 메타로드' },
    { id: 'gyulbati-exhibit', name: '귤바티', field: '콘텐츠 / 식품', note: '못난이귤로 재해석한 제주 전통 발효 음료' },
    { id: 'haewoo-exhibit', name: '해우', field: '콘텐츠 / 제조', note: '머메이드다이빙 체험 교육 및 장비 제조' },
    { id: 'jito-forest', name: '지토의 숲', field: '콘텐츠', note: '핸드워시, 굿즈 등' },
    { id: 'make-a-better', name: '주식회사 메이크어베러', field: '식품', note: '식품, 커피' },
    { id: 'daz-land', name: '다즈랜드', field: '콘텐츠', note: '굿즈, 도서, 디자인' },
    { id: 'the-green-box', name: '더그린박스', field: '콘텐츠', note: '굿즈, 업사이클 체험' },
    { id: 'jejuseyo', name: '제주세요', field: '식품', note: '깻잎청 등' },
    { id: 'jeju-perfume-museum', name: '제주퍼퓸뮤지엄', field: '제조', note: '향수, 방향제 등' },
    { id: 'jeju-citrus-lab', name: '제주시트러스랩', field: '제조', note: '화장품' },
    { id: 'nitem', name: '니텀', field: '식품', note: '커피대체음료' }
  ];

  const institutionOrgs = [
    { id: 'kb-investment', name: 'KB인베스트먼트', field: 'ICT·AI·로봇·바이오 초기·성장기업 투자', note: '초기 및 성장기업 투자 상담' },
    { id: 'daekyo-investment', name: '대교인베스트먼트', field: '애니메이션·캐릭터·OTT·드라마 콘텐츠 투자', note: '콘텐츠 IP 투자 상담' },
    { id: 'fast-ventures', name: '패스트벤처스', field: '혁신 스타트업 중심 초기단계 벤처투자', note: '초기 스타트업 투자 상담' },
    { id: 'danal-investment', name: '다날투자파트너스', field: 'AI·테크·콘텐츠 스타트업 초기투자, 성장지원', note: '초기투자 및 성장지원 상담' },
    { id: 'logan-ventures', name: '로간벤처스(유)', field: '문화/영상/콘텐츠 가치평가 및 메타버스플랫폼 지원', note: '문화콘텐츠 가치평가 및 사업화 상담' },
    { id: 'smartstudy-ventures', name: '스마트스터디벤처스', field: '캐릭터·콘텐츠 IP 사업화, 문화콘텐츠, 에듀테크 발굴', note: '콘텐츠 IP 사업화 상담' },
    { id: 'ynarcher', name: '와이앤아처', field: '글로벌 스타트업 엑셀러레이팅, 로컬 브랜드 콘텐츠 육성', note: '글로벌 진출 및 로컬 브랜드 육성 상담' },
    { id: 'smartrun', name: '스타트런', field: 'IR피칭·투자유치·창업컨설팅', note: 'IR피칭 및 투자유치 상담' },
    { id: 'nextchallenge', name: '재단법인 넥스트챌린지', field: '스타트업 엑셀러레이팅·투자유치·글로벌 진출', note: '투자유치 및 글로벌 진출 상담' },
    { id: 'gomao-ventures', name: '고마오벤처스', field: '임팩트·초기 스타트업 투자 및 스케일업', note: '임팩트 투자 및 스케일업 상담' },
    { id: 'newkids-investment', name: '뉴키즈인베스트먼트', field: '로컬·임팩트·기술 초기기업 투자·액셀러레이팅', note: '로컬 및 기술 초기기업 상담' },
    { id: 'spring-water', name: '스프링 워터', field: '액셀러레이팅, 투자연계', note: '액셀러레이팅 및 투자연계 상담' },
    { id: 'make064', name: '메이크064', field: '제주 로컬·F&B 초기투자·브랜딩·유통·수출', note: '로컬 브랜드 성장 상담' },
    { id: 'jeju-content-agency', name: '제주콘텐츠진흥원', field: '지역 특화 콘텐츠 제작 지원 상담 및 사업화 연계', note: '제작지원 및 사업화 상담' },
    { id: 'jeju-hrd', name: '제주지역인적자원개발위원회', field: '인력양성, 일자리지원 등', note: '인력양성 및 일자리 지원 상담' },
    { id: 'creative-economy', name: '창조경제혁신센터', field: '엑셀러레이팅, 투자연계, TIPS', note: '액셀러레이팅 및 TIPS 연계 상담' },
    { id: 'kb-financial', name: 'KB제주종합금융센터', field: '기업 융자·투자·사업협력', note: '기업 금융 및 사업협력 상담' },
    { id: 'kibo-busan-content-finance', name: '기술보증기금 부산문화콘텐츠금융센터', field: '콘텐츠 금융·보증·자금조달', note: '콘텐츠 금융 및 보증 상담' },
    { id: 'jeju-economic-trade-agency', name: '제주특별자치도경제통상진흥원', field: '도내 기업 글로벌 유통 및 마케팅 지원', note: '글로벌 유통 및 마케팅 상담' },
    { id: 'jeju-credit-guarantee-foundation', name: '제주특별자치도 신용보증재단', field: '도내 기업 보증ㆍ자금조달', note: '보증 및 자금조달 상담' },
    { id: 'cheju-halla-k-hightech-platform', name: '제주한라대학교 K-하이테크플랫폼사업단', field: '기업 재직자교육 및 역량강화 지원 컨설팅', note: '재직자교육 및 역량강화 상담' },
    { id: 'jeju-national-tech-commercialization', name: '제주대학교 산학협력단 기술사업화ㆍ창업지원센터', field: '기술사업화 및 창업지원 컨설팅', note: '기술사업화 및 창업지원 상담' },
    { id: 'jeju-creative-economy', name: '제주창조경제혁신센터', field: '콘텐츠 스타트업 상표권, 저작권 현장상담', note: '상표권 및 저작권 현장 상담' },
    { id: 'jeju-startup-onestop', name: '제주창조경제혁신센터 스타트업원스톱지원센터', field: '콘텐츠 스타트업 상표권, 저작권 현장상담', note: '상표권 및 저작권 현장 상담' },
    { id: 'jeju-ip-center', name: '제주지식재산센터', field: '변리사 3명 별도코너', note: '지식재산권 전문 상담' }
  ];

  // 원고 p9 기준. 와이앤아처·패스트벤처스는 VC·AC 목록에는 있지만
  // 비즈밋업 상담기관은 아니다.
  const NON_CONSULTATION = ['ynarcher', 'fast-ventures', 'danal-investment'];
  const consultationOrgs = institutionOrgs.filter((org) => !NON_CONSULTATION.includes(org.id));

  // 상담을 받지 않는 시간대와 그 사유. 화면에는 남되 선택할 수 없게 표시됩니다.
  // 운영 계획이 바뀌면 이 목록만 고치면 됩니다. 전 시간대를 열려면 빈 객체로 두세요.
  // 상담은 25분, 30분 간격으로 시작한다(남는 5분은 자리 정리). 10:00 시작,
  // 마지막 상담은 16:30~16:55로 원고의 10:00~17:00 안에 끝난다.
  // 점심(12:00·12:30)은 선택 불가.
  // 서버(jgcf_valid_slot)도 같은 규칙으로 검사하므로 바꿀 때 함께 바꾼다.
  const reservationBreaks = {
    '12:00': '점심시간',
    '12:30': '점심시간'
  };

  const CONSULTATION_MINUTES = 25;

  const reservationTimes = [
    '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30'
  ];

  /** '10:00' → '10:00 - 10:25'. 예약 값은 시작 시각 그대로 쓰고 표시만 범위로 한다. */
  function slotRange(time) {
    const [h, m] = time.split(':').map(Number);
    const end = h * 60 + m + CONSULTATION_MINUTES;
    return `${time} - ${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  }

  const homeIrImages = [
    image('assets/images/home/event-studio.jpg'),
    image('assets/images/home/event-creator.jpg'),
    image('assets/images/home/event-showcase.jpg'),
    image('assets/images/home/program-business.jpg'),
    image('assets/images/home/program-tour.jpg'),
    image('assets/images/home/event-conference.jpg'),
    image('assets/images/home/event-audience.jpg'),
    image('assets/images/home/event-meetup.jpg')
  ];

  const homeIrTones = [
    'var(--color-special-business)',
    'var(--color-special-jeju)',
    'var(--color-special-content)',
    'var(--color-special-creator)',
    'var(--color-special-global)'
  ];

  window.JGCF = {
    event: {
      titleKo: '2026 제주글로벌콘텐츠포럼 및 비즈니스 네트워킹',
      titleEn: 'JEJU GLOBAL CONTENT FORUM & BUSINESS NETWORKING',
      year: '2026',
      date: `2026. 9. 16. Wed ${eventTime}`,
      place: eventPlace,
      venue: eventVenueDetail,
      theme: 'CONNECT JEJU, CREATE GLOBAL',
      themeKo: '로컬 콘텐츠의 글로벌 경쟁력을 연결하다'
    },
    mainIrCompanies,
    risingIrCompanies,
    exhibitionCompanies,
    consultationOrgs,
    homeEvents: [
      {
        category: 'FIELD VISIT',
        title: 'IR Pitching Company Field Visit',
        date: `${eventDate} 09:30-13:30`,
        location: '인스피어',
        image: image('assets/images/home/event-studio.jpg')
      },
      {
        category: 'RISING IR',
        title: 'Rising IR Pitching',
        date: `${eventDate} 13:30-14:30`,
        location: '라이징 IR 5개 기업',
        image: image('assets/images/home/event-creator.jpg')
      },
      {
        category: 'OPENING',
        title: 'Opening Ceremony',
        date: `${eventDate} 14:30-14:45`,
        location: eventVenueDetail,
        image: image('assets/images/home/event-opening.jpg')
      },
      {
        category: 'FORUM',
        title: 'Global Content Forum',
        date: `${eventDate} 15:00-16:00`,
        location: 'DX/AX 전환 토크쇼',
        image: image('assets/images/home/event-conference.jpg')
      },
      {
        category: 'MAIN IR',
        title: 'Main IR Pitching',
        date: `${eventDate} 16:00-17:40`,
        location: '제주 콘텐츠 기업 8개사',
        image: image('assets/images/home/program-business.jpg')
      },
      {
        category: 'MOU',
        title: 'MOU Ceremony',
        date: `${eventDate} 17:40-18:00`,
        location: '협약 기업 MOU 체결',
        image: image('assets/images/home/event-audience.jpg')
      },
      {
        category: 'MEETUP',
        title: 'Business Meetup',
        date: `${eventDate} 10:00-18:00`,
        location: 'AC·VC 기업 상담소',
        image: image('assets/images/home/event-meetup.jpg')
      },
      {
        category: 'EXHIBITION',
        title: 'Corporate Exhibition Zone',
        date: `${eventDate} 10:00-18:00`,
        location: '전시존 참여기업 23개사',
        image: image('assets/images/home/event-showcase.jpg')
      }
    ],
    specialPrograms: mainIrCompanies.map((company, index) => ({
      region: ['Main IR', company.field],
      title: company.name,
      note: company.points?.[0] || company.project || '',
      href: 'program#main-ir-title',
      image: homeIrImages[index % homeIrImages.length],
      tone: homeIrTones[index % homeIrTones.length]
    })),
    homePartners: {
      groups: partnerGroups
    },
    speakers: [
      {
        id: 'wi-sung-gon',
        name: '위성곤',
        role: '제주특별자치도지사',
        org: '제주특별자치도',
        track: 'Forum',
        image: image('assets/images/speakers/speaker-wi-sung-gon.webp'),
        bio: '2026 제주글로벌콘텐츠포럼 글로벌 포럼 토론연사.'
      },
      {
        id: 'evi-sari',
        name: 'Evi Sari',
        role: '글로벌 LBE 부사장',
        org: 'WildBrain CPLG',
        track: 'LBE',
        image: image('assets/images/speakers/speaker-evi-sari.avif'),
        bio: '글로벌 IP 기반 공간 경험, 라이선싱, LBE 사업 전략을 총괄하며 Peanuts, Teletubbies, Dr. Seuss 등 글로벌 IP의 공간형 엔터테인먼트 사업을 전개한다.'
      },
      {
        id: 'kim-young-rok',
        name: '김영록',
        role: '대표',
        org: '넥스트챌린지',
        track: 'Startup',
        image: image('assets/images/speakers/speaker-kim-young-rok.avif'),
        bio: '글로벌 액셀러레이터 재단법인 넥스트챌린지 대표이자 벤처기업협회 부회장. 스타트업 액셀러레이팅과 글로벌 진출 전략을 다룬다.'
      },
      {
        id: 'cho-soo-hyun',
        name: '조수현',
        role: '대표',
        org: 'bauer lab',
        track: 'Immersive',
        image: image('assets/images/speakers/speaker-cho-soo-hyun.jpg'),
        bio: '공연, 전시, XR, 미디어아트 기반 이머시브 콘텐츠 기업 bauer lab 대표. 차세대 돔 LED 시어터 ORBYT 쇼룸과 글로벌 공연 콘텐츠 개발을 추진한다.'
      },
      {
        id: 'samuel-lorca',
        name: '사무엘로르카',
        role: '콘텐츠분과 조직위원',
        org: 'AI필름페스티벌',
        track: 'AI',
        image: image('assets/images/speakers/speaker-samuel-lorca.jpg'),
        bio: 'AI필름페스티벌 콘텐츠 분과 조직위원으로 파리 8대학과 뉴욕 브루클린대에서 영화를 전공했으며, 아트나인과 전주 영화제 프로그래머로 활동했다.'
      }
    ],
    media: [
      {
        title: 'DX/AX 전환에 따른 로컬 콘텐츠 산업의 대응방안',
        category: 'Forum Topic',
        image: image('assets/images/program/session-stage.jpg')
      },
      {
        title: '제주 콘텐츠 기업 8개사 메인 IR 피칭',
        category: 'Main IR',
        image: image('assets/images/home/program-business.jpg')
      },
      {
        title: 'AC·VC와 도내 기업을 잇는 비즈니스 밋업',
        category: 'Meetup',
        image: image('assets/images/meetup/meetup-room.jpg')
      },
      {
        title: '기업 전시존에서 만나는 제주 콘텐츠 비즈니스',
        category: 'Exhibition',
        image: image('assets/images/home/event-showcase.jpg')
      }
    ],
    schedule: [
      {
        id: 'networking',
        tab: '9/15 간담회',
        title: '도내 기업-AC·VC 네트워킹 간담회',
        date: '9/15(화)',
        sessions: [
          { time: '18:00 - 19:30', title: '도내 기업-AC·VC 네트워킹 간담회', meta: '행사 전날 9월 15일(화) / VC·AC, 도내 콘텐츠 기업', thumbnail: 'assets/images/home/event-networking.jpg' }
        ]
      },
      {
        id: 'field-visit',
        tab: '현장방문',
        title: 'IR 피칭기업 현장방문',
        sessions: [
          { time: '09:30 - 13:30', title: '기업탐방: 인스피어', meta: 'IR 피칭기업 현장방문 / VC·AC 참여' }
        ]
      },
      {
        id: 'rising-ir',
        tab: '라이징IR',
        title: '라이징 IR 피칭',
        sessions: [
          { time: '13:30 - 14:30', title: '제주도내 3년 미만 기업 5개사 피칭', meta: '사이, 계란바구니, 낭만지구인, 귤바티, 해우 / VC·AC 참여' }
        ]
      },
      {
        id: 'opening',
        tab: '개막식',
        title: '개막식',
        sessions: [
          { time: '14:30 - 14:45', title: '개막식', meta: '제주글로벌콘텐츠포럼 및 비즈니스 네트워킹 개막' },
          { time: '14:45 - 15:00', title: '무대 전환', meta: '글로벌 포럼 진행 준비' }
        ]
      },
      {
        id: 'global-forum',
        tab: '글로벌포럼',
        title: '글로벌 포럼',
        sessions: [
          { time: '15:00 - 16:00', title: 'DX/AX 전환에 따른 로컬 콘텐츠 산업(기업)의 대응방안', meta: '위성곤 제주특별자치도지사, Evi Sari 부사장, 김영록 대표, 조수현 대표, 사무엘로르카 조직위원' }
        ]
      },
      {
        id: 'main-ir',
        tab: '메인IR',
        title: '메인 IR 피칭',
        sessions: [
          { time: '16:00 - 17:40', title: '제주 콘텐츠 기업 8개사 메인 IR 피칭', meta: '해녀의 부엌, 그린우드, 인스피어, 위놉스, 휴플, 그리메, 케이컴퍼니, 프리아이디어' }
        ]
      },
      {
        id: 'mou',
        tab: 'MOU',
        title: 'MOU 협약',
        sessions: [
          { time: '17:40 - 18:00', title: '협약 기업 MOU 체결', meta: '참여 기업 및 기관 협약식' }
        ]
      }
    ],
    institutionOrgs,
    companies: consultationOrgs,
    reservationTimes,
    reservationBreaks,
    consultationMinutes: CONSULTATION_MINUTES,
    slotRange,
    partners: partnerGroups
  };
})();
