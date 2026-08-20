(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    if (!reduceMotion && window.Lenis && window.gsap && window.ScrollTrigger) {
      const lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      window.JGCFLenis = lenis;
    }

    if (window.AOS) {
      AOS.init({
        duration: reduceMotion ? 0 : 700,
        easing: 'ease-out-cubic',
        once: true,
        offset: 90,
        disable: reduceMotion
      });
    }

    if (!window.gsap || reduceMotion) return;

    const heroItems = document.querySelectorAll('.hero-label, .hero-title, .hero-meta, .hero-actions');
    if (heroItems.length) {
      gsap.from(heroItems, {
        y: 34,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out'
      });
    }

    const heroParallax = document.querySelector('[data-hero-parallax]');
    if (heroParallax && window.ScrollTrigger) {
      gsap.fromTo(heroParallax, {
        y: -28
      }, {
        y: 28,
        ease: 'none',
        scrollTrigger: {
          trigger: '.home-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    }

    document.querySelectorAll('[data-gsap-rise]').forEach((item) => {
      gsap.from(item, {
        y: 48,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: item,
          start: 'top 82%'
        }
      });
    });

    document.querySelectorAll('.stat-number').forEach((number) => {
      const raw = number.dataset.count;
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      const obj = { value: 0 };
      gsap.to(obj, {
        value,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: number,
          start: 'top 84%'
        },
        onUpdate: () => {
          number.textContent = Math.round(obj.value).toLocaleString('ko-KR');
        }
      });
    });
  });
})();
