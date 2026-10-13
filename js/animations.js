/* =========================================================
   ANIMATIONS — Lenis + GSAP ScrollTrigger pipelines
========================================================= */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

gsap.registerPlugin(ScrollTrigger, Flip);

/* ---------------------------------------------------------
   LENIS SMOOTH SCROLL
--------------------------------------------------------- */
let lenis;
if (!prefersReduced && window.Lenis) {
  lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  });
  window.lenis = lenis;

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------------------------------------------------
   HERO → REEL TRANSITION (pin + scrub)
--------------------------------------------------------- */
if (!prefersReduced) {
  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero-section',
      start: 'bottom bottom',
      end: '+=100%',
      scrub: 0.8,
      pin: true,
    },
  });

  heroTl
    .to('#character-root', {
      scale: 0.28,
      y: () => -window.innerHeight * 0.42,
      x: () => -window.innerWidth * 0.38,
      opacity: 0.85,
      ease: 'power2.inOut',
    })
    .to('#first-video-container', {
      scaleY: 1,
      height: '100%',
      ease: 'power2.inOut',
    }, 0);
}

/* ---------------------------------------------------------
   HORIZONTAL VIDEO REEL
--------------------------------------------------------- */
const reelTrack = document.getElementById('reel-track');
const reelSection = document.getElementById('video-reel');
const reelProgress = document.getElementById('reel-progress');
const reelNext = document.getElementById('reel-next');
const cards = document.querySelectorAll('.video-card');

if (reelTrack && !prefersReduced) {
  const slideCount = cards.length;
  const totalScroll = () => reelTrack.offsetWidth - window.innerWidth;

  const reelTween = gsap.to(reelTrack, {
    x: () => -totalScroll(),
    ease: 'none',
    scrollTrigger: {
      trigger: '#video-reel',
      start: 'top top',
      end: () => `+=${totalScroll()}`,
      scrub: 1,
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: self => {
        const p = self.progress;
        const dash = 163.4;
        reelProgress.setAttribute('stroke-dashoffset', dash * (1 - p));

        // Theme ambient morph based on active card
        const idx = Math.min(slideCount - 1, Math.round(p * (slideCount - 1)));
        const card = cards[idx];
        if (card) {
          const accent = card.dataset.accent;
          document.documentElement.style.setProperty('--theme-ambient', hexToRgba(accent, 0.15));
        }
      },
    },
  });

  // Next button → jump one slide
  reelNext?.addEventListener('click', () => {
    const st = reelTween.scrollTrigger;
    if (!st) return;
    const step = 1 / (slideCount - 1);
    const target = Math.min(1, st.progress + step);
    const scrollY = st.start + (st.end - st.start) * target;
    if (window.lenis) window.lenis.scrollTo(scrollY, { duration: 1.2 });
    else window.scrollTo({ top: scrollY, behavior: 'smooth' });
  });
}

function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ---------------------------------------------------------
   VIDEO MODAL — FLIP expansion
--------------------------------------------------------- */
const modal = document.getElementById('video-modal');
const modalVideoSlot = document.getElementById('modal-video-slot');
const modalClose = document.getElementById('modal-close-btn');
const drawer = document.getElementById('production-drawer');
const drawerTitle = document.getElementById('drawer-title');
const drawerClient = document.getElementById('drawer-client');
const drawerDesc = document.getElementById('drawer-desc');

let activeCard = null;
let activeVideo = null;
let flipState = null;

cards.forEach(card => {
  card.addEventListener('click', () => {
    activeCard = card;
    const frame = card.querySelector('.video-card__frame');
    activeVideo = card.querySelector('.video-card__video');

    // Pause horizontal scroll
    if (window.lenis) window.lenis.stop();
    document.body.style.overflow = 'hidden';

    // Populate drawer
    drawerTitle.textContent = card.dataset.title || '—';
    drawerClient.textContent = `${card.dataset.client || ''} · ${card.dataset.year || ''}`;
    drawerDesc.textContent = card.dataset.description || '';

    // FLIP
    flipState = Flip.getState(frame);
    modalVideoSlot.innerHTML = '';
    modalVideoSlot.appendChild(frame);

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    Flip.from(flipState, {
      duration: 0.65,
      ease: 'power3.inOut',
      absolute: true,
      onComplete: () => {
        drawer.classList.add('is-open');
        // Audio fade in
        if (activeVideo) {
          activeVideo.muted = false;
          activeVideo.volume = 0;
          activeVideo.play().catch(() => {});
          gsap.to(activeVideo, { volume: 1, duration: 0.45, ease: 'linear' });
        }
      },
    });
  });
});

function closeModal() {
  if (!activeCard || !flipState) return;

  // Fade audio out
  if (activeVideo) {
    gsap.to(activeVideo, {
      volume: 0, duration: 0.2, ease: 'linear',
      onComplete: () => {
        activeVideo.muted = true;
        activeVideo.pause();
      },
    });
  }

  drawer.classList.remove('is-open');

  Flip.from(flipState, {
    duration: 0.6,
    ease: 'power3.inOut',
    absolute: true,
    onComplete: () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modalVideoSlot.innerHTML = '';

      const targetFrame = activeCard.querySelector('.video-card__frame');
      // Frame was moved back automatically by Flip absolute; ensure it lives in card
      const moved = document.querySelector('.video-card__frame');
      // If frame was displaced, reattach
      cards.forEach(c => {
        if (!c.querySelector('.video-card__frame')) {
          c.appendChild(targetFrame);
        }
      });

      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';

      activeCard = null;
      activeVideo = null;
      flipState = null;
    },
  });
}

modalClose?.addEventListener('click', closeModal);
modal?.querySelector('.modal__backdrop')?.addEventListener('click', closeModal);
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

/* ---------------------------------------------------------
   FILM STRIP WIPE (after reel)
--------------------------------------------------------- */
const filmstrip = document.getElementById('film-strip');
if (filmstrip && !prefersReduced) {
  ScrollTrigger.create({
    trigger: '#video-reel',
    start: 'bottom bottom',
    end: 'bottom top',
    onEnter: () => {
      gsap.fromTo(filmstrip,
        { yPercent: 100 },
        {
          yPercent: -100,
          duration: 0.9,
          ease: 'power4.inOut',
          onComplete: () => gsap.set(filmstrip, { yPercent: 100 }),
        }
      );
    },
  });
}

/* ---------------------------------------------------------
   PHOTO VAULT — Parallax columns
--------------------------------------------------------- */
if (!prefersReduced) {
  const items = document.querySelectorAll('.photo-item');
  items.forEach((item, i) => {
    const dir = i % 2 === 0 ? 1 : -1;
    gsap.fromTo(item,
      { y: 40 * dir },
      {
        y: -40 * dir,
        ease: 'none',
        scrollTrigger: {
          trigger: item,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  });
}

/* ---------------------------------------------------------
   BOOKING SECTION — Aperture + slot stagger
--------------------------------------------------------- */
if (!prefersReduced) {
  gsap.from('.slot-card', {
    y: 40,
    opacity: 0,
    stagger: 0.08,
    duration: 0.6,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#booking-section',
      start: 'top 70%',
    },
  });
}

/* ---------------------------------------------------------
   FOOTER — Typographic wall parallax
--------------------------------------------------------- */
if (!prefersReduced) {
  gsap.fromTo('.footer__wall',
    { xPercent: -5 },
    {
      xPercent: 5,
      ease: 'none',
      scrollTrigger: {
        trigger: '#footer-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2,
      },
    }
  );
}

/* ---------------------------------------------------------
   REFRESH AFTER LOAD
--------------------------------------------------------- */
window.addEventListener('load', () => ScrollTrigger.refresh());