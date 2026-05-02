import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  useInView,
} from 'framer-motion';

const CHAPTERS = [
  { id: 'open', label: 'Prologue' },
  { id: 'chaos', label: 'The Old Day' },
  { id: 'shift', label: 'A Quieter Way' },
  { id: 'calendar', label: 'Three Years Wide' },
  { id: 'numbers', label: 'What Changes' },
  { id: 'voices', label: 'Voices' },
  { id: 'end', label: 'Begin' },
];

export function StoryPage() {
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ container: scrollerRef });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        jumpTo(Math.min(active + 1, CHAPTERS.length - 1));
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        jumpTo(Math.max(active - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sections = CHAPTERS.map((c) => document.getElementById(`scene-${c.id}`));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = CHAPTERS.findIndex((c) => `scene-${c.id}` === visible.target.id);
          if (idx >= 0) setActive(idx);
        }
      },
      { root: el, threshold: [0.35, 0.6] },
    );
    sections.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, []);

  const jumpTo = (i: number) => {
    const section = document.getElementById(`scene-${CHAPTERS[i].id}`);
    section?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 antialiased">
      {/* Top progress line */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress, transformOrigin: '0% 50%' }}
        className="fixed left-0 right-0 top-0 z-50 h-[2px] bg-linear-to-r from-emerald-400 via-emerald-300 to-teal-200"
      />

      {/* Chapter navigation */}
      <nav
        aria-label="Chapters"
        className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 md:flex"
      >
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            onClick={() => jumpTo(i)}
            className="group flex items-center gap-3"
            aria-label={`Jump to ${c.label}`}
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 opacity-0 transition group-hover:opacity-100">
              {c.label}
            </span>
            <span
              className={[
                'block h-[2px] transition-all duration-300',
                active === i ? 'w-10 bg-emerald-300' : 'w-5 bg-slate-600 group-hover:bg-slate-400',
              ].join(' ')}
            />
          </button>
        ))}
      </nav>

      {/* Brand mark */}
      <div className="fixed left-6 top-5 z-40 flex items-center gap-2 text-[13px] tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        HUJUZATK · STORY
      </div>

      {/* Exit link */}
      <Link
        to="/"
        className="fixed right-6 top-5 z-40 text-[13px] text-slate-400 transition hover:text-slate-100"
      >
        ← Home
      </Link>

      {/* The scroll container */}
      <div
        ref={scrollerRef}
        className="h-full overflow-y-scroll overflow-x-hidden scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        <OpeningScene reduced={!!reduced} />
        <ChaosScene reduced={!!reduced} />
        <ShiftScene reduced={!!reduced} />
        <CalendarScene reduced={!!reduced} container={scrollerRef} />
        <NumbersScene reduced={!!reduced} />
        <VoicesScene reduced={!!reduced} />
        <EndingScene reduced={!!reduced} />
      </div>
    </div>
  );
}

/* --------------------------------- Scenes --------------------------------- */

function OpeningScene({ reduced }: { reduced: boolean }) {
  return (
    <section
      id="scene-open"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
    >
      <AuroraBackdrop reduced={reduced} />
      <div className="relative z-10 max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 text-[11px] uppercase tracking-[0.4em] text-emerald-300/80"
        >
          A short story about hotels, time, and control.
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl font-light leading-[1.05] tracking-tight md:text-7xl"
        >
          A day at the front desk,
          <br />
          <span className="italic text-emerald-200">rewritten.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.1 }}
          className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-slate-400"
        >
          Scroll to follow one property through two versions of the same Tuesday —
          one without Hujuzatk, one with it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="mt-16 flex flex-col items-center gap-2 text-slate-500"
        >
          <span className="text-[11px] uppercase tracking-[0.3em]">Scroll</span>
          <motion.span
            aria-hidden
            animate={reduced ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="block h-8 w-px bg-slate-600"
          />
        </motion.div>
      </div>
    </section>
  );
}

function ChaosScene({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const beats = [
    { time: '08:47', line: 'Room 204 is double-booked.', hint: 'Two couples. Same key.' },
    { time: '11:23', line: 'Invoice still waiting in a spreadsheet.', hint: 'Column K is wrong again.' },
    { time: '14:15', line: 'Next quarter? Nobody can tell.', hint: 'The calendar ends at November.' },
    { time: '19:02', line: 'Three phones ringing at once.', hint: 'Only two hands.' },
  ];

  return (
    <section
      id="scene-chaos"
      ref={ref}
      className="relative grid min-h-[380vh] grid-cols-1 md:grid-cols-12"
    >
      {/* Sticky visual */}
      <div className="sticky top-0 col-span-1 h-screen md:col-span-6">
        <div className="flex h-full items-center justify-center overflow-hidden px-6">
          <ChaosVisual reduced={reduced} />
        </div>
      </div>

      {/* Scrolling text beats */}
      <div className="col-span-1 md:col-span-6">
        {beats.map((b, i) => (
          <Beat key={i} {...b} index={i} total={beats.length} reduced={reduced} />
        ))}
      </div>
    </section>
  );
}

function Beat({
  time, line, hint, index, total, reduced,
}: { time: string; line: string; hint: string; index: number; total: number; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-35% 0px -35% 0px' });

  return (
    <div
      ref={ref}
      className="flex min-h-screen items-center px-8 md:px-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity: inView ? 1 : 0.25, y: inView ? 0 : 40 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md"
      >
        <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-emerald-300/70">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · {time}
        </div>
        <p className="text-3xl font-light leading-snug text-slate-100 md:text-4xl">
          {line}
        </p>
        <p className="mt-4 text-sm text-slate-500">{hint}</p>
      </motion.div>
    </div>
  );
}

function ShiftScene({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const fade = useTransform(scrollYProgress, [0, 0.45, 0.7, 1], [0, 1, 1, 0]);
  const lift = useTransform(scrollYProgress, [0, 0.5], [40, 0]);

  return (
    <section
      id="scene-shift"
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-emerald-950/60 to-slate-950" />
      <motion.div
        aria-hidden
        style={reduced ? undefined : { opacity: fade }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[60vh] w-[60vh] rounded-full bg-emerald-400/10 blur-3xl" />
      </motion.div>
      <motion.div
        style={reduced ? undefined : { opacity: fade, y: lift }}
        className="relative z-10 px-6 text-center"
      >
        <p className="mb-6 text-[11px] uppercase tracking-[0.4em] text-emerald-300/80">
          The morning we rewrote
        </p>
        <h2 className="mx-auto max-w-3xl text-4xl font-light leading-tight text-slate-50 md:text-6xl">
          There is a quieter way to
          <br />
          <span className="italic text-emerald-200">run a hotel.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-slate-400">
          One calendar. Three years wide. Every conflict caught before it lands on the desk.
        </p>
      </motion.div>
    </section>
  );
}

function CalendarScene({
  reduced, container,
}: { reduced: boolean; container: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container,
    offset: ['start start', 'end end'],
  });

  const scale = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0.92, 1, 1, 0.98]);
  const xShift = useTransform(scrollYProgress, [0, 1], [0, -80]);

  const notes = [
    { k: '3 years', v: 'visible at once, scrolled like a single sheet.' },
    { k: '1,095 days', v: 'virtualized — no lag even on a slow laptop.' },
    { k: 'Conflicts', v: 'flagged before a guest ever books the same key.' },
    { k: 'RTL & EN', v: 'the calendar mirrors without breaking a pixel.' },
  ];

  return (
    <section
      id="scene-calendar"
      ref={ref}
      className="relative grid min-h-[320vh] grid-cols-1 md:grid-cols-12"
    >
      <div className="sticky top-0 col-span-1 h-screen md:col-span-7">
        <div className="flex h-full items-center justify-center px-6 py-20">
          <motion.div
            style={reduced ? undefined : { scale, x: xShift }}
            className="w-full max-w-2xl"
          >
            <CalendarMock reduced={reduced} />
          </motion.div>
        </div>
      </div>

      <div className="col-span-1 md:col-span-5">
        <div className="flex min-h-screen items-center px-8 md:px-12">
          <div className="max-w-md">
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-emerald-300/70">
              The calendar
            </p>
            <h3 className="text-3xl font-light leading-tight md:text-4xl">
              A single surface for every night, this year and the next two.
            </h3>
          </div>
        </div>
        {notes.map((n, i) => (
          <NoteRow key={i} k={n.k} v={n.v} reduced={reduced} />
        ))}
      </div>
    </section>
  );
}

function NoteRow({ k, v, reduced }: { k: string; v: string; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-40% 0px -40% 0px' });
  return (
    <div ref={ref} className="flex min-h-[70vh] items-center px-8 md:px-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity: inView ? 1 : 0.2, y: inView ? 0 : 30 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-sm"
      >
        <div className="text-4xl font-light text-emerald-200 md:text-5xl">{k}</div>
        <div className="mt-3 text-base leading-relaxed text-slate-400">{v}</div>
      </motion.div>
    </div>
  );
}

function NumbersScene({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20% 0px -20% 0px' });
  const stats = [
    { value: 80, suffix: '%', label: 'fewer booking errors in the first month' },
    { value: 3, suffix: ' clicks', label: 'from calendar to printable PDF invoice' },
    { value: 0, suffix: ' ms', label: 'perceived latency on local reads' },
  ];
  return (
    <section
      id="scene-numbers"
      ref={ref}
      className="relative flex min-h-screen items-center justify-center px-6 py-32"
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-16 md:grid-cols-3 md:gap-8">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={reduced ? { opacity: 1, y: 0 } : { opacity: inView ? 1 : 0, y: inView ? 0 : 30 }}
            transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <div className="text-6xl font-extralight tracking-tight text-emerald-200 md:text-7xl">
              <Counter to={s.value} play={inView || reduced} />
              <span className="text-4xl text-emerald-300/80 md:text-5xl">{s.suffix}</span>
            </div>
            <div className="mx-auto mt-4 max-w-[22ch] text-sm leading-relaxed text-slate-400">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Counter({ to, play }: { to: number; play: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!play) return;
    if (to === 0) { setN(0); return; }
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, to]);
  return <>{n}</>;
}

function VoicesScene({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const y3 = useTransform(scrollYProgress, [0, 1], [30, -30]);

  const voices = [
    {
      quote:
        'We cut booking errors by eighty percent in the first month. The Arabic RTL is perfect — nothing feels translated.',
      author: 'Vista Company',
      role: 'Property Management · Saudi Arabia',
      y: y1,
    },
    {
      quote:
        'The five-year calendar changed how I plan. I can see next Ramadan without opening a second tab.',
      author: 'Muhammad Orfan',
      role: 'Booking Manager · Saudi Arabia',
      y: y2,
    },
    {
      quote:
        'Makkah peak season used to break every tool we tried. Hujuzatk did not blink.',
      author: 'Sada Makka Hotel',
      role: 'Hotel Management · Makkah',
      y: y3,
    },
  ];

  return (
    <section
      id="scene-voices"
      ref={ref}
      className="relative flex min-h-[140vh] flex-col items-center justify-center gap-5 px-6 py-32"
    >
      <div className="max-w-xl text-center">
        <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-emerald-300/70">
          In their words
        </p>
        <h3 className="text-3xl font-light leading-tight md:text-4xl">
          The quietest praise is the kind that talks about the work,
          <span className="italic text-emerald-200"> not the tool.</span>
        </h3>
      </div>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        {voices.map((v, i) => (
          <motion.figure
            key={i}
            style={reduced ? undefined : { y: v.y }}
            className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur-xs"
          >
            <svg width="22" height="18" viewBox="0 0 22 18" className="mb-5 text-emerald-300/60">
              <path
                fill="currentColor"
                d="M0 18V10.5C0 4.7 3.3.8 9 0l1 3.6C6 4.7 4 6.9 4 10h5v8H0zm12 0V10.5c0-5.8 3.3-9.7 9-10.5l1 3.6c-4 1.1-6 3.3-6 6.4h5v8h-9z"
              />
            </svg>
            <blockquote className="text-[15px] leading-relaxed text-slate-200">
              {v.quote}
            </blockquote>
            <figcaption className="mt-6">
              <div className="text-sm text-slate-100">{v.author}</div>
              <div className="mt-0.5 text-xs text-slate-500">{v.role}</div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

function EndingScene({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  return (
    <section
      id="scene-end"
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-32"
    >
      <div className="absolute inset-0 bg-linear-to-t from-emerald-950/40 to-slate-950" />
      <AuroraBackdrop reduced={reduced} soft />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity: inView ? 1 : 0, y: inView ? 0 : 30 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-2xl text-center"
      >
        <p className="mb-6 text-[11px] uppercase tracking-[0.4em] text-emerald-300/80">
          End of story · Beginning of yours
        </p>
        <h2 className="text-4xl font-light leading-tight md:text-6xl">
          Begin your
          <span className="italic text-emerald-200"> quieter </span>
          operation.
        </h2>
        <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-slate-400">
          Fourteen days free. No card required. Your calendar will be three years wide by Tuesday.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-8 py-3.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
          >
            Start free trial
            <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-slate-400 transition hover:text-slate-100"
          >
            Back to overview
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------------------- Visuals --------------------------------- */

function AuroraBackdrop({ reduced, soft }: { reduced: boolean; soft?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: soft ? 0.5 : 0.8 }}
        transition={{ duration: 1.6 }}
        className="absolute left-1/2 top-1/3 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: soft ? 0.3 : 0.6 }}
        transition={{ duration: 1.6, delay: 0.3 }}
        className="absolute bottom-10 right-10 h-[40vh] w-[40vh] rounded-full bg-teal-400/15 blur-3xl"
      />
      {!reduced && (
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-10 top-20 h-[30vh] w-[30vh] rounded-full bg-emerald-300/10 blur-3xl"
        />
      )}
    </div>
  );
}

function ChaosVisual({ reduced }: { reduced: boolean }) {
  const cards = [
    { label: 'Room 204', time: '13 Nov · 2 nts', tone: 'red' },
    { label: 'Room 204', time: '13 Nov · 1 nt', tone: 'red' },
    { label: 'Room 118', time: '14 Nov · 3 nts', tone: 'amber' },
    { label: 'Invoice #4412', time: 'DRAFT · XLS', tone: 'slate' },
    { label: 'Room 301', time: '??? · ???', tone: 'slate' },
  ];
  const toneMap: Record<string, string> = {
    red: 'border-red-500/40 bg-red-500/10 text-red-200',
    amber: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
    slate: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  };

  return (
    <div className="relative h-[520px] w-full max-w-md">
      {cards.map((c, i) => {
        const rot = (i - 2) * 5;
        const dx = (i - 2) * 18;
        const dy = i * 22;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, rotate: rot }}
            animate={{ opacity: 1, y: dy, rotate: rot, x: dx }}
            transition={{ duration: 0.7, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
            whileHover={reduced ? undefined : { rotate: rot + 2, y: dy - 4 }}
            className={[
              'absolute left-1/2 top-4 w-64 -translate-x-1/2 rounded-xl border px-5 py-4 backdrop-blur-xs',
              toneMap[c.tone],
            ].join(' ')}
            style={{ zIndex: i }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{c.label}</span>
              {c.tone === 'red' && (
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400" />
              )}
            </div>
            <div className="mt-2 font-mono text-[11px] opacity-80">{c.time}</div>
          </motion.div>
        );
      })}
      <div className="absolute bottom-0 left-0 right-0 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-slate-600">
        spreadsheet · sticky notes · memory
      </div>
    </div>
  );
}

function CalendarMock({ reduced }: { reduced: boolean }) {
  const rooms = ['101', '102', '118', '204', '205', '301'];
  const cols = 40;
  const palette = ['bg-emerald-400/70', 'bg-teal-400/60', 'bg-emerald-300/50', 'bg-cyan-400/60'];
  const bars = [
    { row: 0, start: 2, len: 4, color: palette[0] },
    { row: 0, start: 9, len: 6, color: palette[1] },
    { row: 0, start: 20, len: 3, color: palette[2] },
    { row: 1, start: 0, len: 5, color: palette[1] },
    { row: 1, start: 8, len: 7, color: palette[0] },
    { row: 1, start: 22, len: 5, color: palette[3] },
    { row: 2, start: 4, len: 3, color: palette[2] },
    { row: 2, start: 12, len: 9, color: palette[1] },
    { row: 2, start: 27, len: 4, color: palette[0] },
    { row: 3, start: 1, len: 6, color: palette[3] },
    { row: 3, start: 15, len: 5, color: palette[0] },
    { row: 3, start: 30, len: 6, color: palette[2] },
    { row: 4, start: 6, len: 8, color: palette[0] },
    { row: 4, start: 20, len: 4, color: palette[1] },
    { row: 5, start: 0, len: 3, color: palette[2] },
    { row: 5, start: 10, len: 6, color: palette[3] },
    { row: 5, start: 24, len: 7, color: palette[0] },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-[0_8px_40px_-12px_rgba(16,185,129,0.25)] backdrop-blur-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">2026 — 2030</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-700" />
          <span className="inline-block h-2 w-2 rounded-full bg-slate-700" />
          <span className="inline-block h-2 w-2 rounded-full bg-slate-700" />
        </div>
      </div>

      {/* Month strip */}
      <div className="grid border-b border-white/5" style={{ gridTemplateColumns: `56px repeat(${cols}, minmax(0,1fr))` }}>
        <div />
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={[
              'py-1.5 text-center font-mono text-[9px] text-slate-500',
              i % 7 === 0 ? 'border-l border-white/5' : '',
            ].join(' ')}
          >
            {i % 7 === 0 ? `W${Math.floor(i / 7) + 1}` : ''}
          </div>
        ))}
      </div>

      {/* Room rows */}
      {rooms.map((room, r) => (
        <div
          key={room}
          className="relative grid border-b border-white/5 last:border-b-0"
          style={{ gridTemplateColumns: `56px repeat(${cols}, minmax(0,1fr))` }}
        >
          <div className="flex items-center justify-end border-r border-white/5 pr-3 font-mono text-[11px] text-slate-500">
            {room}
          </div>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={[
                'h-9',
                c % 7 === 0 ? 'border-l border-white/5' : '',
                (r + c) % 13 === 0 ? 'bg-white/[0.015]' : '',
              ].join(' ')}
            />
          ))}
          {bars
            .filter((b) => b.row === r)
            .map((b, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0, opacity: 0 }}
                whileInView={reduced ? { scaleX: 1, opacity: 1 } : { scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                viewport={{ once: true, margin: '-20% 0px' }}
                className={[
                  'absolute top-1.5 h-6 origin-left rounded-md',
                  b.color,
                  'shadow-[0_2px_10px_-2px_rgba(16,185,129,0.4)]',
                ].join(' ')}
                style={{
                  left: `calc(56px + (100% - 56px) * ${b.start} / ${cols})`,
                  width: `calc((100% - 56px) * ${b.len} / ${cols} - 2px)`,
                }}
              />
            ))}
        </div>
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/5 px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
        <span>1,095 days visible</span>
        <span className="text-emerald-300/70">● virtualized</span>
      </div>
    </div>
  );
}
