import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baseUrl = process.env.JGCF_QA_URL || 'http://127.0.0.1:4173';
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`
];

const executablePath = chromeCandidates.find(Boolean);
const qaDir = path.join(root, 'docs', 'qa');
await fs.mkdir(qaDir, { recursive: true });

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error('Chrome executable not found.');
}

function pageUrl(route) {
  return `${baseUrl}/${route.replace(/^\/+/, '')}`;
}

async function collectConsole(page, bucket) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      bucket.push({ type: 'console', text: message.text(), url: page.url() });
    }
  });
  page.on('pageerror', (error) => {
    bucket.push({ type: 'pageerror', text: error.message, url: page.url() });
  });
}

async function captureHome(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(pageUrl('index.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const file = path.join(qaDir, `pw-home-${viewport.width}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const state = await page.evaluate(() => ({
    innerWidth,
    innerHeight,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    desktopNavDisplay: getComputedStyle(document.querySelector('.desktop-nav')).display,
    menuToggleDisplay: getComputedStyle(document.querySelector('.menu-toggle')).display,
    headerHeight: getComputedStyle(document.querySelector('[data-header]')).height,
    heroTitle: getComputedStyle(document.querySelector('.hero-title')).fontSize,
    locationInfoHeight: Math.round(document.querySelector('.home-location-info')?.getBoundingClientRect().height || 0),
    locationMapHeight: Math.round(document.querySelector('.home-location-map')?.getBoundingClientRect().height || 0)
  }));
  return { viewport, file, state };
}

async function checkHomeRebuild(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl('index.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  await page.locator('[data-home-faq-list] .faq-item:nth-child(2) .faq-question').click();
  await page.waitForTimeout(200);

  return await page.evaluate(() => {
    const legacyHomeInfoClass = ['home', 'ne', 'ws'].join('-');
    const legacyDataPrefix = ['data', 'ne', 'ws'].join('-');
    const required = [
      '.home-hero',
      '.home-events',
      '.home-special',
      '.home-location',
      '.home-faq',
      '.home-partners',
      '.home-partner-groups',
      '.site-footer'
    ];
    const oldSections = [
      '.home-speakers',
      '.home-overview',
      '.home-mid',
      '.home-venue',
      '.home-organizers',
      '.home-companies',
      '.sns-band',
      '#media-dialog'
    ];
    const order = required
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)
      .map((node) => ({ selector: `.${node.classList[0]}`.replace('..', '.'), y: Math.round(node.getBoundingClientRect().top + scrollY) }));

    return {
      heroTitle: document.querySelector('.hero-title')?.textContent?.replace(/\s+/g, ' ').trim(),
      requiredPresent: required.every((selector) => document.querySelector(selector)),
      oldSectionsRemoved: oldSections.every((selector) => !document.querySelector(selector)),
      order,
      eventSlides: document.querySelectorAll('[data-home-events] .swiper-slide').length,
      specialSlides: document.querySelectorAll('[data-special-programs] .swiper-slide').length,
      specialTitles: [...document.querySelectorAll('[data-special-programs] .home-special-copy strong')]
        .map((node) => node.textContent.trim()),
      specialNotes: document.querySelectorAll('[data-special-programs] .home-special-copy small').length,
      homeLocationTitle: document.querySelector('#home-location-title')?.textContent?.replace(/\s+/g, ' ').trim(),
      homeLocationImage: document.querySelector('.home-location-visual img')?.getAttribute('src'),
      homeLocationMap: document.querySelector('.home-location-map iframe')?.getAttribute('src'),
      homeLocationButton: document.querySelector('.home-location-button')?.textContent?.replace(/\s+/g, ' ').trim(),
      homeLocationAddress: document.querySelector('.home-location-list')?.textContent?.replace(/\s+/g, ' ').trim(),
      partnerTitle: document.querySelector('#home-partners-title')?.textContent?.replace(/\s+/g, ' ').trim(),
      partnerGroups: document.querySelectorAll('.home-partner-group').length,
      partnerGroupTitles: [...document.querySelectorAll('.home-partner-group-head h3')].map((node) => node.textContent.trim()),
      partnerSubtitles: [...document.querySelectorAll('.home-partner-group-head p')].map((node) => node.textContent.trim()),
      partners: document.querySelectorAll('[data-home-partners] .home-partner-card').length,
      homeEventSwiper: Boolean(document.querySelector('.home-events-swiper')?.swiper),
      specialSwiper: Boolean(document.querySelector('.home-special-swiper')?.swiper),
      homeFaqTitle: document.querySelector('#home-faq-title span')?.textContent?.trim(),
      homeFaqItems: document.querySelectorAll('[data-home-faq-list] .faq-item').length,
      homeFaqOpenItems: document.querySelectorAll('[data-home-faq-list] .faq-item.is-open').length,
      homeFaqSecondOpen: document.querySelector('[data-home-faq-list] .faq-item:nth-child(2)')?.classList.contains('is-open'),
      legacyInfoNodes: document.querySelectorAll(`[class*="${legacyHomeInfoClass}"], [${legacyDataPrefix}-tabs], [${legacyDataPrefix}-list], [${legacyDataPrefix}-tab]`).length
    };
  });
}

async function checkMobileMenu(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl('index.html'), { waitUntil: 'networkidle' });
  await page.click('.menu-toggle');
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(qaDir, 'pw-mobile-menu-390.png'), fullPage: false });
  return await page.evaluate(() => ({
    open: document.querySelector('[data-header]').classList.contains('is-open'),
    noScroll: document.documentElement.classList.contains('no-scroll'),
    expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'),
    transform: getComputedStyle(document.querySelector('.mobile-menu')).transform
  }));
}

async function checkFaq(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl('faq.html'), { waitUntil: 'networkidle' });
  await page.click('.faq-item:nth-child(2) .faq-question');
  return await page.evaluate(() => ({
    items: document.querySelectorAll('.faq-item').length,
    openItems: document.querySelectorAll('.faq-item.is-open').length,
    secondOpen: document.querySelector('.faq-item:nth-child(2)').classList.contains('is-open')
  }));
}

async function checkRoutes(page) {
  const routes = [
    'index.html',
    'design-system.html',
    'theme.html',
    'about.html',
    'speakers.html',
    'program.html',
    'register.html',
    'venue.html',
    'partners.html',
    'faq.html',
    'meetup/index.html',
    'meetup/reserve.html',
    'meetup/complete.html',
    'meetup/confirm.html'
  ];
  const viewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 }
  ];
  const results = [];
  for (const route of routes) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(pageUrl(route), { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      results.push(await page.evaluate(({ route, viewport }) => ({
        route,
        viewport,
        title: document.title,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        header: !!document.querySelector('[data-header]'),
        footer: !!document.querySelector('.site-footer')
      }), { route, viewport }));
    }
  }
  return results;
}

async function checkProgramContent(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl('program.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return await page.evaluate(() => ({
    scheduleTabs: document.querySelectorAll('[data-schedule-tabs] a').length,
    mainIrCompanies: document.querySelectorAll('[data-main-ir-companies] .program-company-card').length,
    risingIrCompanies: document.querySelectorAll('[data-rising-ir-companies] .program-company-card').length,
    exhibitionCompanies: document.querySelectorAll('[data-exhibition-companies] .program-company-card').length
  }));
}

async function checkRegistration(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl('register.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('jgcf2026.eventApplications');
    localStorage.removeItem('jgcf2026.eventApplicationSequence');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.fill('input[name="companyName"]', 'QA 콘텐츠');
  await page.fill('input[name="companyManagerName"]', '참가 신청자');
  await page.fill('input[name="phone"]', '010-2222-3333');
  await page.check('input[name="privacy"]');
  await page.getByRole('button', { name: /신청 완료/ }).click();
  const resultText = await page.locator('[data-register-result]').innerText();
  return {
    completed: resultText.includes('JGCF-ATTEND-'),
    typeVisible: resultText.includes('기업'),
    applicantVisible: resultText.includes('참가 신청자')
  };
}

async function checkReservation(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const fixturePdf = path.join(qaDir, 'qa-company-profile.pdf');
  await fs.writeFile(fixturePdf, '%PDF-1.4\n% QA fixture\n');
  await page.goto(pageUrl('meetup/reserve.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('jgcf2026.reservations');
    localStorage.removeItem('jgcf2026.reservationSequence');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('input[name="companyId"]').first().check();
  await page.getByRole('button', { name: /다음/ }).click();
  await page.locator('input[name="time"]').first().check();
  await page.getByRole('button', { name: /다음/ }).click();
  await page.fill('input[name="applicantCompany"]', 'QA Studio');
  await page.fill('input[name="managerName"]', '테스트 신청자');
  await page.fill('input[name="phone"]', '010-1111-2222');
  await page.fill('input[name="email"]', 'qa@example.com');
  await page.setInputFiles('input[name="attachment"]', fixturePdf);
  await page.fill('textarea[name="inquiry"]', '원고 기준 비즈밋업 예약 플로우 확인');
  await page.check('input[name="privacy"]');
  await page.getByRole('button', { name: /다음/ }).click();
  await page.getByRole('button', { name: /예약 완료/ }).click();
  await page.waitForURL(/complete\.html/);
  const reservationNumber = await page.locator('.reservation-number').innerText();

  await page.goto(pageUrl('meetup/confirm.html'), { waitUntil: 'networkidle' });
  await page.fill('input[name="reservationNumber"]', reservationNumber);
  await page.fill('input[name="phone"]', '010-1111-2222');
  await page.getByRole('button', { name: /조회하기/ }).click();
  await page.getByRole('button', { name: /예약 취소/ }).click();
  await page.getByRole('button', { name: /취소 확정/ }).click();
  const resultText = await page.locator('[data-lookup-result]').innerText();
  return {
    reservationNumber,
    completed: reservationNumber.startsWith('JGCF-2026-'),
    cancelled: resultText.includes('예약 취소')
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: await findChrome(),
    headless: true
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  await collectConsole(page, consoleErrors);

  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ];

  const home = [];
  for (const viewport of viewports) {
    home.push(await captureHome(page, viewport));
  }

  const report = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    home,
    homeRebuild: await checkHomeRebuild(page),
    mobileMenu: await checkMobileMenu(page),
    faq: await checkFaq(page),
    routes: await checkRoutes(page),
    programContent: await checkProgramContent(page),
    registration: await checkRegistration(page),
    reservation: await checkReservation(page),
    consoleErrors
  };

  await fs.writeFile(path.join(qaDir, 'qa-report.json'), JSON.stringify(report, null, 2));
  await browser.close();

  const failed = [
    ...home.filter((item) => item.state.horizontalOverflow).map((item) => `Horizontal overflow at ${item.viewport.width}`),
    ...home.filter((item) => item.viewport.width <= 390 && (item.state.locationInfoHeight < 240 || item.state.locationMapHeight < 180)).map((item) => `Home location collapsed at ${item.viewport.width}`),
    report.homeRebuild.requiredPresent ? null : 'Home rebuild sections missing',
    report.homeRebuild.oldSectionsRemoved ? null : 'Old home sections still present',
    report.homeRebuild.heroTitle.replace(/\s/g, '') === 'CONNECTJEJU,CREATEGLOBAL' ? null : 'Hero title changed',
    report.homeRebuild.eventSlides >= 8 ? null : 'Event slides not rendered',
    report.homeRebuild.specialSlides >= 8 && report.homeRebuild.specialTitles.includes('해녀의 부엌') && report.homeRebuild.specialNotes >= 8 ? null : 'IR companies not rendered in special carousel',
    report.homeRebuild.homeLocationTitle === 'Venue 행사 장소 및 교통 안내' && report.homeRebuild.homeLocationImage?.includes('venue-bein-stage.png') && report.homeRebuild.homeLocationMap?.includes('google.com/maps/embed') && report.homeRebuild.homeLocationButton?.includes('구글맵') && report.homeRebuild.homeLocationAddress?.includes('제주시 신산로 82') ? null : 'Home location section failed',
    report.homeRebuild.partnerTitle === 'Partner & Sponsor' ? null : 'Partner title changed',
    report.homeRebuild.partnerGroups === 2 && report.homeRebuild.partnerGroupTitles.includes('Host/Organizer') && report.homeRebuild.partnerGroupTitles.includes('PARTNERS') && report.homeRebuild.partnerSubtitles.includes('주최/주관') && report.homeRebuild.partnerSubtitles.includes('협력기관') ? null : 'Partner grouped structure failed',
    report.homeRebuild.partners >= 9 ? null : 'Partner logos not rendered',
    report.homeRebuild.homeEventSwiper && report.homeRebuild.specialSwiper ? null : 'Required Swiper instances missing',
    report.homeRebuild.homeFaqTitle === '자주 묻는 질문' && report.homeRebuild.homeFaqItems >= 4 && report.homeRebuild.homeFaqOpenItems === 1 && report.homeRebuild.homeFaqSecondOpen && report.homeRebuild.legacyInfoNodes === 0 ? null : 'Home FAQ failed',
    report.mobileMenu.open ? null : 'Mobile menu did not open',
    report.mobileMenu.expanded === 'true' ? null : 'Mobile menu aria-expanded failed',
    report.faq.openItems === 1 && report.faq.secondOpen ? null : 'FAQ accordion failed',
    report.programContent.scheduleTabs >= 6 && report.programContent.mainIrCompanies >= 8 && report.programContent.risingIrCompanies >= 5 && report.programContent.exhibitionCompanies >= 27 ? null : 'Program manuscript content not rendered',
    report.registration.completed && report.registration.typeVisible && report.registration.applicantVisible ? null : 'Event registration flow failed',
    ...report.routes.filter((item) => item.horizontalOverflow).map((item) => `Horizontal overflow on ${item.route} at ${item.viewport.width}`),
    ...report.routes.filter((item) => !item.header || !item.footer).map((item) => `Missing shell on ${item.route} at ${item.viewport.width}`),
    report.reservation.completed && report.reservation.cancelled ? null : 'Reservation flow failed',
    consoleErrors.length === 0 ? null : `${consoleErrors.length} console errors`
  ].filter(Boolean);

  if (failed.length) {
    console.error(JSON.stringify({ failed, report }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(report, null, 2));
}

await main();
