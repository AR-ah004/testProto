/* =========================================================
   MAIN — Full site logic
   Sections:
     0  Setup
     1  Character
     2  Hero → Reel
     3  Horizontal reel
     4  Video modal (shared by reel + feed)
     5  Photo vault
     6  Booking calendar
     7  Media feed (9:16 vertical)
     8  Footer
     9  Dev FPS meter
========================================================= */

const WA_NUMBER = '819012345678'; // WhatsApp Business number (country code, no +)

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 768;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

gsap.registerPlugin(ScrollTrigger, Flip);

/* ---------- 0. SETUP ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new Lenis({ duration: 1.2, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToY = (target, d = 1.4) =>
  lenis
    ? lenis.scrollTo(target, { duration: d })
    : (typeof target === 'number'
        ? scrollTo({ top: target, behavior: 'smooth' })
        : target?.scrollIntoView({ behavior: 'smooth' }));

$$('[data-scroll-to]').forEach(b =>
  b.addEventListener('click', () => scrollToY($('#' + b.dataset.scrollTo)))
);

const navToggle = $('#nav-toggle');
const navMobile = $('#nav-mobile');
navToggle?.addEventListener('click', () => {
  navMobile.classList.toggle('is-open');
  navToggle.textContent = navMobile.classList.contains('is-open') ? 'Close' : 'Menu';
});

const nav = $('#nav');
addEventListener('scroll', () => {
  nav?.classList.toggle('is-scrolled', scrollY > 40);
}, { passive: true });

const flash = $('#flash-overlay');
const doFlash = (peak = 0.9) =>
  flash && gsap.fromTo(flash, { opacity: peak }, { opacity: 0, duration: 0.1, ease: 'none' });

/* ---------- 1. CHARACTER ---------- */
const root   = $('#character-root');
const head   = $('#character-head');
const rig    = $('#camera-rig');
const eyes   = $$('.eye-sclera');
const pupils = $$('.eye-pupil-group');
const target = { x: innerWidth / 2, y: innerHeight / 2 };
let saccadeTimer;

const pupilTo = pupils.map(p => ({
  x: gsap.quickTo(p, 'x', { duration: 0.25, ease: 'power3.out' }),
  y: gsap.quickTo(p, 'y', { duration: 0.25, ease: 'power3.out' }),
}));
const headRX = head && gsap.quickTo(head, 'rotationX', { duration: 0.12, ease: 'power2.out' });
const headRY = head && gsap.quickTo(head, 'rotationY', { duration: 0.12, ease: 'power2.out' });
const camX   = rig && gsap.quickTo(rig, 'x', { duration: 0.5, ease: 'power3.out' });
const camY   = rig && gsap.quickTo(rig, 'y', { duration: 0.5, ease: 'power3.out' });
if (head) gsap.set(head, { transformPerspective: 1000 });
if (eyes.length || pupils.length) gsap.set([...eyes, ...pupils], { transformOrigin: '50% 50%' });

const setTarget = (x, y) => { target.x = x; target.y = y; clearInterval(saccadeTimer); };
const recenter = () => { target.x = innerWidth / 2; target.y = innerHeight / 2; };

addEventListener('mousemove', e => setTarget(e.clientX, e.clientY), { passive: true });
addEventListener('touchmove', e => e.touches[0] && setTarget(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
addEventListener('touchend', () => {
  recenter();
  saccadeTimer = setInterval(() => {
    target.x = innerWidth / 2 + gsap.utils.random(-120, 120);
    target.y = innerHeight / 2 + gsap.utils.random(-80, 80);
  }, 1400);
});

if (!reduced && root) {
  gsap.ticker.add(() => {
    const max = isMobile() ? 6 : 11;
    pupils.forEach((p, i) => {
      const eye = eyes[i];
      if (!eye) return;
      const r = eye.getBoundingClientRect();
      const dx = target.x - (r.left + r.width / 2);
      const dy = target.y - (r.top + r.height / 2);
      const a = Math.atan2(dy, dx);
      const d = Math.min(Math.hypot(dx, dy), max);
      const k = 44 / r.width;
      pupilTo[i].x(Math.cos(a) * d * k);
      pupilTo[i].y(Math.sin(a) * d * k);
    });
    const nx = target.x / innerWidth - 0.5;
    const ny = target.y / innerHeight - 0.5;
    headRY && headRY(clamp(nx * 24, -12, 12));
    headRX && headRX(clamp(-ny * 24, -12, 12));
    if (rig) { camX(-nx * 14); camY(-ny * 10); }
  });

  gsap.timeline({ repeat: -1, repeatDelay: 3.8 })
    .to([...eyes, ...pupils], { scaleY: 0.08, duration: 0.04 })
    .to([...eyes, ...pupils], { scaleY: 1, duration: 0.06 }, '>+0.12');

  addEventListener('click', e => {
    if (e.target.closest('.media-card, .modal, .booking-drawer, .player-controls, .video-card')) return;
    doFlash();
    const wink = [eyes[1], pupils[1]].filter(Boolean);
    if (wink.length) {
      gsap.timeline()
        .to(wink, { scaleY: 0.05, duration: 0.07 })
        .to(wink, { scaleY: 1, duration: 0.12 }, '>+0.2');
    }
  });
}

/* ---------- 2. HERO → REEL ---------- */
if (!reduced && root) {
  gsap.timeline({
    scrollTrigger: {
      trigger: '#hero-section',
      start: 'top top',
      end: '+=100%',
      scrub: 0.8,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  }).to(root, {
    scale: 0.28,
    x: () => -innerWidth * 0.38,
    y: () => -innerHeight * 0.4,
    opacity: 0.85,
    ease: 'power2.inOut',
  });
}

/* ---------- 3. HORIZONTAL REEL ---------- */
const track     = $('#reel-track');
const reelCards = $$('.video-card');
const n         = reelCards.length;
const ring      = $('#reel-progress');
const nextBtn   = $('#reel-next');
let active = -1, reelST;

if (track && n > 1) {
  track.style.width = n * 100 + 'vw';

  const setActive = i => {
    active = i;
    reelCards.forEach((c, j) => {
      const v = $('video', c);
      if (!v || c.dataset.open) return;
      j === i ? v.play().catch(() => {}) : v.pause();
    });
    gsap.to('.reel', { '--amb': rgba(reelCards[i].dataset.accent || '#e5a93b', 0.2), duration: 0.9 });
  };

  const reelTween = gsap.to(track, {
    xPercent: -100 * (n - 1) / n,
    ease: 'none',
    scrollTrigger: {
      trigger: '#video-reel',
      start: 'top top',
      end: () => '+=' + (n - 1) * innerHeight,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      snap: {
        snapTo: 1 / (n - 1),
        duration: 0.7,
        ease: 'back.out(1.2)',
      },
      onCreate: s => { reelST = s; },
      onUpdate: s => {
        const pos = s.progress * (n - 1);
        reelCards.forEach((c, i) => {
          const o = clamp(pos - i, 0, 1);
          gsap.set(c, {
            scale: 1 - 0.08 * o,
            filter: o ? `blur(${10 * o}px)` : 'none',
            x: -o * innerWidth * 0.12,
          });
        });
        const i = Math.round(pos);
        if (i !== active) setActive(i);
      },
    },
  });

  setActive(0);

  gsap.ticker.add(() => {
    const v = $('video', reelCards[active] || reelCards[0]);
    if (v && v.duration) {
      ring?.setAttribute('stroke-dashoffset', 163.4 * (1 - v.currentTime / v.duration));
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (!reelST) return;
    const i = Math.min(n - 1, Math.round(reelST.progress * (n - 1)) + 1);
    scrollToY(reelST.start + (reelST.end - reelST.start) * (i / (n - 1)), 1.2);
  });
}

/* ---------- 4. VIDEO MODAL ---------- */
const modal        = $('#video-modal');
const modalSlot    = $('#modal-video-slot');
const modalClose   = $('#modal-close-btn');
const drawer       = $('#production-drawer');
const drawerTitle  = $('#drawer-title');
const drawerClient = $('#drawer-client');
const drawerDesc   = $('#drawer-desc');
const drawerTags   = $('#drawer-tags');
const drawerCta    = $('#drawer-cta');
const playerCtrl   = $('#player-controls');
const playerSeek   = $('#player-seek');
const playerTime   = $('#player-time');

let modalState = null;

function openModalFor(card) {
  if (modalState) return;

  const frame = $('.media-card__frame, .video-card__frame', card);
  if (!frame) return;
  const video = $('video', frame);
  const isImage = !video;

  modalState = { card, frame, video, isImage };
  card.dataset.open = '1';

  drawerTitle.textContent  = card.dataset.title  || '—';
  drawerClient.textContent = [card.dataset.client, card.dataset.year].filter(Boolean).join(' · ') || '—';
  drawerDesc.textContent   = card.dataset.description || '—';

  if (drawerTags) {
    drawerTags.innerHTML = '';
    (card.dataset.tags || '').split('|').filter(Boolean).forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t.trim();
      drawerTags.appendChild(span);
    });
  }

  lenis?.stop();
  document.body.style.overflow = 'hidden';

  const st = Flip.getState(frame);
  modalSlot.innerHTML = '';
  modalSlot.appendChild(frame);
  modal?.classList.add('is-open');
  modal?.setAttribute('aria-hidden', 'false');
  gsap.fromTo('.modal__backdrop', { opacity: 0 }, { opacity: 1, duration: 0.4 });

  Flip.from(st, {
    duration: 0.65,
    ease: 'power3.inOut',
    absolute: true,
    onComplete: () => {
      drawer?.classList.add('is-open');

      if (video) {
        playerCtrl?.removeAttribute('hidden');
        playerCtrl?.classList.add('is-visible');
        video.muted = false;
        video.volume = 0;
        video.play().catch(() => {});
        gsap.to(video, { volume: 1, duration: 0.45, ease: 'linear' });
        attachPlayerControls(video);
      } else {
        playerCtrl?.setAttribute('hidden', '');
        playerCtrl?.classList.remove('is-visible');
      }
    },
  });
}

function closeModal() {
  if (!modalState) return;
  const { card, frame, video } = modalState;
  modalState = null;

  if (video) {
    gsap.to(video, {
      volume: 0, duration: 0.2, ease: 'linear',
      onComplete: () => { video.muted = true; video.pause(); },
    });
    detachPlayerControls();
  }

  drawer?.classList.remove('is-open');
  playerCtrl?.classList.remove('is-visible');

  const st = Flip.getState(frame);
  card.appendChild(frame);
  Flip.from(st, {
    duration: 0.6,
    ease: 'power3.inOut',
    absolute: true,
    onComplete: () => {
      modal?.classList.remove('is-open');
      modal?.setAttribute('aria-hidden', 'true');
      modalSlot.innerHTML = '';
      delete card.dataset.open;
      lenis?.start();
      document.body.style.overflow = '';
      ScrollTrigger.refresh();
      card.focus?.();
    },
  });
}

modalClose?.addEventListener('click', closeModal);
$$('[data-modal-close]').forEach(el => el.addEventListener('click', closeModal));
addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeModal();
});

// Reel cards open modal
reelCards.forEach(card => {
  $('.video-card__frame', card)?.addEventListener('click', () => openModalFor(card));
});

drawerCta?.addEventListener('click', () => {
  closeModal();
  setTimeout(() => scrollToY($('#booking-section'), 1.4), 700);
});

/* ---------- 4a. Player controls ---------- */
let playerCleanup = null;

function attachPlayerControls(video) {
  detachPlayerControls();

  const btnPlay = $('[data-action="play"]', playerCtrl);
  const btnMute = $('[data-action="mute"]', playerCtrl);
  const btnFs   = $('[data-action="fullscreen"]', playerCtrl);

  const fmt = t => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const sync = () => {
    if (playerSeek && video.duration) {
      playerSeek.value = (video.currentTime / video.duration) * 100;
    }
    if (playerTime) {
      playerTime.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
    }
    if (btnPlay) btnPlay.textContent = video.paused ? '▶' : '❚❚';
    if (btnMute) btnMute.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
  };

  const onPlay = sync, onPause = sync, onTime = sync, onVol = sync, onMeta = sync;
  video.addEventListener('play', onPlay);
  video.addEventListener('pause', onPause);
  video.addEventListener('timeupdate', onTime);
  video.addEventListener('volumechange', onVol);
  video.addEventListener('loadedmetadata', onMeta);

  const onPlayClick = () => video.paused ? video.play() : video.pause();
  const onMuteClick = () => { video.muted = !video.muted; };
  const onSeekInput = () => {
    if (video.duration) video.currentTime = (playerSeek.value / 100) * video.duration;
  };
  const onFsClick = () => {
    if (!document.fullscreenElement) modalSlot?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  btnPlay?.addEventListener('click', onPlayClick);
  btnMute?.addEventListener('click', onMuteClick);
  btnFs?.addEventListener('click', onFsClick);
  playerSeek?.addEventListener('input', onSeekInput);

  let hideTimer;
  const show = () => {
    playerCtrl?.classList.add('is-visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!video.paused) playerCtrl?.classList.remove('is-visible');
    }, 2000);
  };
  const moveHandler = () => show();
  modalSlot?.addEventListener('mousemove', moveHandler);

  sync();
  show();

  playerCleanup = () => {
    video.removeEventListener('play', onPlay);
    video.removeEventListener('pause', onPause);
    video.removeEventListener('timeupdate', onTime);
    video.removeEventListener('volumechange', onVol);
    video.removeEventListener('loadedmetadata', onMeta);
    btnPlay?.removeEventListener('click', onPlayClick);
    btnMute?.removeEventListener('click', onMuteClick);
    btnFs?.removeEventListener('click', onFsClick);
    playerSeek?.removeEventListener('input', onSeekInput);
    modalSlot?.removeEventListener('mousemove', moveHandler);
    clearTimeout(hideTimer);
  };
}
function detachPlayerControls() {
  if (playerCleanup) { playerCleanup(); playerCleanup = null; }
}

/* ---------- 5. PHOTO VAULT ---------- */
const photos   = $$('.photo-item');
const slider   = $('#tabs-slider');
const tabsPill = $('.tabs__pill');

const moveSlider = (tab, instant) => {
  if (!tab || !slider || !tabsPill) return;
  const pillRect = tabsPill.getBoundingClientRect();
  const tabRect  = tab.getBoundingClientRect();
  gsap.to(slider, {
    x: tabRect.left - pillRect.left - 6,
    width: tabRect.width,
    duration: instant ? 0 : 0.5,
    ease: 'power3.out',
  });
};
moveSlider($('.tab.is-active'), true);
addEventListener('resize', () => moveSlider($('.tab.is-active'), true));

photos.forEach(p => {
  const f = $('.photo-item__frame', p);
  p.addEventListener('mouseenter', () => gsap.to(f, { scale: 1.025, duration: 0.4, ease: 'power3.out' }));
  p.addEventListener('mouseleave', () => gsap.to(f, { scale: 1, duration: 0.4, ease: 'power3.out' }));
});

$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  if (tab.classList.contains('is-active')) return;
  $$('.tab').forEach(t => t.classList.remove('is-active'));
  tab.classList.add('is-active');
  moveSlider(tab);

  const cat = tab.dataset.category;
  const out = photos.filter(p => !p.classList.contains('is-hidden'));
  const frames = list => list.map(p => $('.photo-item__frame', p));

  gsap.to(frames(out), {
    y: 60, rotation: 3, opacity: 0,
    duration: 0.3, stagger: 0.04, ease: 'power2.in', overwrite: true,
    onComplete: () => {
      photos.forEach(p => p.classList.toggle('is-hidden', cat !== 'All' && p.dataset.category !== cat));
      const inc = photos.filter(p => !p.classList.contains('is-hidden'));
      gsap.fromTo(frames(inc),
        { y: -60, rotation: -3, opacity: 0 },
        { y: 0, rotation: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', overwrite: true }
      );
      ScrollTrigger.refresh();
    },
  });
}));

ScrollTrigger.matchMedia({
  '(min-width: 768px)': () => {
    photos.forEach((p, i) => {
      gsap.fromTo(p,
        { y: i % 2 ? 50 : -30 },
        {
          y: i % 2 ? -50 : 30,
          ease: 'none',
          scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: 1, invalidateOnRefresh: true },
        }
      );
    });
  },
});

/* ---------- 6. BOOKING CALENDAR ---------- */
const aperture = $('#aperture-wrap');
if (aperture) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { aperture.classList.add('is-open'); io.unobserve(aperture); }
    });
  }, { threshold: 0.25 });
  io.observe(aperture);
}

const TIME_SLOT_TEMPLATES = [
  { id: 'sunrise',   name: 'Sunrise Golden Hour',   time: '06:00 – 08:30', ambient: '#f59e0b' },
  { id: 'midday',    name: 'Midday Studio Session', time: '11:00 – 13:30', ambient: '#e2e8f0' },
  { id: 'afternoon', name: 'Afternoon Outdoor Run', time: '15:00 – 17:30', ambient: '#06b6d4' },
  { id: 'dusk',      name: 'Dusk Cinematic',        time: '18:00 – 20:00', ambient: '#ec4899' },
];
const availability = {};
const blockedDates = new Set([]);

const seededRandom = seed => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};
const dateKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function getDayPlan(date) {
  const key = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
  if (availability[key]) return availability[key];

  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  const todayZero = new Date(); todayZero.setHours(0, 0, 0, 0);
  const isPast = date < todayZero;
  const isBlocked = blockedDates.has(key);

  if (isWeekend || isPast || isBlocked) {
    availability[key] = { closed: true, slots: [] };
    return availability[key];
  }

  const seed = date.getFullYear() * 1000 + (date.getMonth() + 1) * 40 + date.getDate();
  if (seededRandom(seed) < 0.15) {
    availability[key] = { closed: false, fullyBooked: true, slots: [] };
    return availability[key];
  }

  const slotCount = 1 + Math.floor(seededRandom(seed + 7) * 4);
  const slots = TIME_SLOT_TEMPLATES.slice(0, slotCount).map((tpl, i) => {
    const seats = 1 + Math.floor(seededRandom(seed + i * 13) * 3);
    return { ...tpl, seats };
  });

  availability[key] = { closed: false, fullyBooked: false, slots };
  return availability[key];
}

const calGrid      = $('#cal-grid');
const calMonth     = $('#cal-month');
const calYear      = $('#cal-year');
const calPrev      = $('#cal-prev');
const calNext      = $('#cal-next');
const tsEmpty      = $('#timeslots-empty');
const tsList       = $('#timeslots-list');
const tsGrid       = $('#ts-grid');
const tsDate       = $('#ts-date');
const tsCount      = $('#ts-count');
const summaryValue = $('#summary-value');
const chipDate     = $('#chip-date');
const chipSlot     = $('#chip-slot');
const bDrawer      = $('#booking-drawer');
const bClose       = $('#booking-close');
const bForm        = $('#booking-form');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let selectedDate = null;
let selectedSlot = null;

function renderCalendar() {
  if (!calGrid) return;
  calMonth.textContent = MONTHS[viewMonth];
  calYear.textContent  = String(viewYear);
  calGrid.innerHTML = '';

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < firstDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'day is-empty';
    calGrid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const key = dateKey(viewYear, viewMonth, d);
    const plan = getDayPlan(dateObj);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day';
    btn.dataset.date = key;
    btn.setAttribute('role', 'gridcell');

    const numEl = document.createElement('span');
    numEl.className = 'day__num';
    numEl.textContent = String(d);
    btn.appendChild(numEl);

    let dayState = 'open';
    if (plan.closed) dayState = 'off';
    else if (plan.fullyBooked) dayState = 'full';
    else {
      const totalSeats = plan.slots.reduce((s, x) => s + x.seats, 0);
      dayState = totalSeats <= 3 ? 'low' : 'open';
    }

    if (dayState !== 'off') {
      const dot = document.createElement('span');
      dot.className = `day__dot day__dot--${dayState}`;
      btn.appendChild(dot);
    }

    if (dayState === 'off' || dayState === 'full') {
      btn.classList.add('is-disabled');
      btn.disabled = true;
    }

    if (key === todayKey) btn.classList.add('is-today');

    if (selectedDate && selectedDate.y === viewYear && selectedDate.m === viewMonth && selectedDate.d === d) {
      btn.classList.add('is-selected');
    }

    btn.addEventListener('click', () => handleDateSelect(dateObj, dayState));
    calGrid.appendChild(btn);
  }

  const atCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  if (calPrev) calPrev.disabled = atCurrentMonth;
}

function handleDateSelect(dateObj, dayState) {
  if (dayState === 'off' || dayState === 'full') return;
  selectedDate = { y: dateObj.getFullYear(), m: dateObj.getMonth(), d: dateObj.getDate() };
  selectedSlot = null;
  renderCalendar();
  renderTimeSlots(dateObj);
  updateSummary();
}

function renderTimeSlots(dateObj) {
  const key = dateKey(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const plan = availability[key];

  const label = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (tsDate) tsDate.textContent = label;

  if (!plan || plan.closed || plan.fullyBooked || plan.slots.length === 0) {
    if (tsEmpty) tsEmpty.hidden = false;
    if (tsList) tsList.hidden = true;
    const p = tsEmpty?.querySelector('p');
    if (p) {
      p.innerHTML = plan?.fullyBooked
        ? 'This date is fully booked.<br />Try another day.'
        : 'Select a date to view<br />available time windows.';
    }
    return;
  }

  if (tsEmpty) tsEmpty.hidden = true;
  if (tsList) tsList.hidden = false;
  if (tsCount) tsCount.textContent = `${plan.slots.length} window${plan.slots.length > 1 ? 's' : ''}`;
  if (tsGrid) tsGrid.innerHTML = '';

  plan.slots.forEach(slot => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ts-slot';
    el.dataset.slotId = slot.id;
    el.style.setProperty('--slot-ambient', slot.ambient);

    if (slot.seats === 0) { el.classList.add('is-full'); el.disabled = true; }

    el.innerHTML = `
      <span class="ts-slot__seats">${slot.seats} seat${slot.seats > 1 ? 's' : ''}</span>
      <span class="ts-slot__time">${slot.time}</span>
      <span class="ts-slot__name">${slot.name}</span>
    `;

    el.addEventListener('click', () => handleSlotSelect(slot, el));
    tsGrid?.appendChild(el);
  });
}

function handleSlotSelect(slot, el) {
  tsGrid?.querySelectorAll('.ts-slot').forEach(s => s.classList.remove('is-selected'));
  el.classList.add('is-selected');

  selectedSlot = slot;
  updateSummary();

  document.documentElement.style.setProperty('--theme-ambient', rgba(slot.ambient, 0.14));

  const dateLabel = new Date(selectedDate.y, selectedDate.m, selectedDate.d)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (chipDate) chipDate.textContent = dateLabel;
  if (chipSlot) chipSlot.textContent = `${slot.name} · ${slot.time}`;

  bDrawer?.classList.add('is-open');
  bDrawer?.setAttribute('aria-hidden', 'false');
}

function updateSummary() {
  if (!summaryValue) return;
  if (!selectedDate) { summaryValue.textContent = 'No date selected'; return; }
  const dateLabel = new Date(selectedDate.y, selectedDate.m, selectedDate.d)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  summaryValue.textContent = selectedSlot
    ? `${dateLabel} · ${selectedSlot.time} · ${selectedSlot.name}`
    : `${dateLabel} — pick a time window`;
}

calPrev?.addEventListener('click', () => {
  viewMonth -= 1;
  if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
  renderCalendar();
});
calNext?.addEventListener('click', () => {
  viewMonth += 1;
  if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
  renderCalendar();
});

renderCalendar();
updateSummary();

bClose?.addEventListener('click', () => {
  bDrawer?.classList.remove('is-open');
  bDrawer?.setAttribute('aria-hidden', 'true');
});

bForm?.addEventListener('submit', e => {
  e.preventDefault();
  if (!selectedDate || !selectedSlot) { alert('Please choose a date and a time window.'); return; }

  const data = new FormData(bForm);
  const name  = data.get('name')  || '';
  const phone = data.get('phone') || '';
  const email = data.get('email') || '';
  const scope = data.get('scope') || '';

  const dateLabel = new Date(selectedDate.y, selectedDate.m, selectedDate.d)
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (flash && !reduced) {
    flash.style.transition = 'none';
    flash.style.opacity = '0.95';
    requestAnimationFrame(() => {
      flash.style.transition = 'opacity 0.18s ease';
      flash.style.opacity = '0';
    });
  }

  const message = encodeURIComponent(
    `Hi, I'd like to book a session.\n\n` +
    `Date: ${dateLabel}\n` +
    `Time: ${selectedSlot.time}\n` +
    `Session: ${selectedSlot.name}\n\n` +
    `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nNotes: ${scope}`
  );

  setTimeout(() => {
    window.open(`https://wa.me/${WA_NUMBER}?text=${message}`, '_blank');
  }, 300);
});

/* ---------- 7. MEDIA FEED (9:16 vertical) ---------- */
const mediaFeedGrid = $('#media-feed-grid');

const mediaItems = [
  { type: 'video', src: 'reel-1.mp4',                 poster: 'images/neon-drift.jpg',     title: 'Neon Drift',     client: 'Porsche Asia',     year: '2024', tags: 'Sony FX3|Kowa 40mm|S-Log3',  description: 'A late-night drift sequence shot across Osaka industrial district.' },
  { type: 'video', src: 'videos/silent-atelier.mp4',  poster: 'images/silent-atelier.jpg', title: 'Silent Atelier', client: 'Maison Couture',   year: '2024', tags: 'ARRI Alexa Mini|Cooke S7/i', description: 'A meditation on craft inside a Milanese couture house.' },
  { type: 'video', src: 'videos/tide-ritual.mp4',     poster: 'images/tide-ritual.jpg',    title: 'Tide Ritual',    client: 'Nomad Swimwear',   year: '2023', tags: 'RED Komodo|Sigma 35mm',      description: 'Dawn swimmers off the coast of Lisbon.' },
  { type: 'video', src: 'videos/static-bloom.mp4',    poster: 'images/static-bloom.jpg',   title: 'Static Bloom',   client: 'Sony Music Japan', year: '2023', tags: 'Sony FX6|Helios 44-2',       description: 'A music video shot entirely on vintage Soviet glass.' },

  { type: 'image', src: 'images/p1.jpg', title: 'Morning Ritual',  client: 'Lifestyle',  year: '2024', tags: '85mm|f/1.4',  description: 'Natural light portrait.' },
  { type: 'image', src: 'images/p2.jpg', title: 'Studio Portrait', client: 'Editorial',  year: '2024', tags: '50mm|f/2.0',  description: 'Editorial studio session.' },
  { type: 'image', src: 'images/p3.jpg', title: 'Product Still',   client: 'Commercial', year: '2023', tags: '100mm|f/8',   description: 'Product still life.' },
  { type: 'image', src: 'images/p4.jpg', title: 'Track at Dusk',   client: 'Automotive', year: '2023', tags: '35mm|f/2.8',  description: 'Automotive at dusk.' },
  { type: 'image', src: 'images/p5.jpg', title: 'Coastal Walk',    client: 'Lifestyle',  year: '2023', tags: '28mm|f/4',    description: 'Coastal walk.' },
  { type: 'image', src: 'images/p6.jpg', title: 'Backstage',       client: 'Editorial',  year: '2023', tags: '50mm|f/1.8',  description: 'Backstage moments.' },
  { type: 'image', src: 'images/p7.jpg', title: 'Timepiece',       client: 'Commercial', year: '2023', tags: '100mm|f/11',  description: 'Macro timepiece.' },
  { type: 'image', src: 'images/p8.jpg', title: 'Headlight',       client: 'Automotive', year: '2023', tags: '85mm|f/1.8',  description: 'Headlight macro.' },
];

function buildMediaCard(item) {
  const card = document.createElement('article');
  card.className = 'media-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Open ${item.title}`);

  card.dataset.type        = item.type;
  card.dataset.src         = item.src;
  card.dataset.title       = item.title;
  card.dataset.client      = item.client || '';
  card.dataset.year        = item.year   || '';
  card.dataset.tags        = item.tags   || '';
  card.dataset.description = item.description || '';

  const frame = document.createElement('div');
  frame.className = 'media-card__frame';

  if (item.type === 'video') {
    const video = document.createElement('video');
    video.muted       = true;
    video.loop        = true;
    video.playsInline = true;
    video.preload     = 'metadata';
    video.src         = item.src;
    if (item.poster) video.poster = item.poster;
    frame.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src      = item.src;
    img.alt      = item.title;
    img.loading  = 'lazy';
    img.decoding = 'async';
    img.width    = 720;
    img.height   = 1280;
    frame.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'media-card__meta';
  const clientLine = document.createElement('span');
  clientLine.className = 'media-card__client';
  clientLine.textContent = [item.client, item.year].filter(Boolean).join(' · ');
  const titleEl = document.createElement('h3');
  titleEl.className = 'media-card__title';
  titleEl.textContent = item.title;
  meta.appendChild(clientLine);
  meta.appendChild(titleEl);

  card.appendChild(frame);
  card.appendChild(meta);

  if (item.type === 'video') {
    const badge = document.createElement('span');
    badge.className = 'media-card__badge';
    badge.textContent = '▶ Video';
    card.appendChild(badge);
  }

  card.addEventListener('click', () => openModalFor(card));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModalFor(card); }
  });

  if (item.type === 'video') {
    if (!reduced && matchMedia('(hover: hover)').matches) {
      card.addEventListener('mouseenter', () => {
        const v = $('video', card);
        if (v && !card.dataset.open) v.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => {
        const v = $('video', card);
        if (v) { v.pause(); v.currentTime = 0; }
      });
    } else {
      const v = $('video', card);
      if (v) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (card.dataset.open) return;
            if (e.isIntersecting && e.intersectionRatio >= 0.5) v.play().catch(() => {});
            else v.pause();
          });
        }, { threshold: [0, 0.5, 1] });
        io.observe(card);
      }
    }
  }

  return card;
}

function initMediaFeed() {
  if (!mediaFeedGrid) return;
  mediaFeedGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  mediaItems.forEach(item => frag.appendChild(buildMediaCard(item)));
  mediaFeedGrid.appendChild(frag);

  if (!reduced) {
    gsap.from('.media-card', {
      y: 40,
      opacity: 0,
      stagger: 0.05,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: mediaFeedGrid,
        start: 'top 85%',
        once: true,
      },
    });
  }
}
initMediaFeed();

/* ---------- 8. FOOTER ---------- */
if (!reduced) {
  gsap.fromTo('.footer__wall',
    { xPercent: -6 },
    {
      xPercent: 6,
      ease: 'none',
      scrollTrigger: {
        trigger: '#footer-section',
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    }
  );
}

const copyBtn = $('#copy-email');
copyBtn?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(copyBtn.dataset.email); } catch (_) { return; }
  copyBtn.classList.add('is-copied');
  setTimeout(() => copyBtn.classList.remove('is-copied'), 1600);
});

$$('.dial').forEach(d => {
  d.addEventListener('mouseenter', () => gsap.to(d, { rotate: 45, duration: 0.4, ease: 'back.out(2)' }));
  d.addEventListener('mouseleave', () => gsap.to(d, { rotate: 0, duration: 0.4, ease: 'power2.out' }));
});

$('#back-to-top')?.addEventListener('click', () => {
  scrollToY(0, 1.8);
  recenter();
  if (head) gsap.to(head, { rotationX: 0, rotationY: 0, duration: 0.8 });
  if (rig)  gsap.to(rig,  { x: 0, y: 0, duration: 0.8 });
});

/* ---------- 9. DEV FPS METER ---------- */
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  let last = performance.now(), frames = 0;
  const meter = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) {
      console.log(`[FPS] ${frames}`);
      frames = 0; last = now;
    }
    requestAnimationFrame(meter);
  };
  requestAnimationFrame(meter);
}

addEventListener('load', () => ScrollTrigger.refresh());