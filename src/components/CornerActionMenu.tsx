/**
 * CornerActionMenu — a single trigger button that fans out child action items in a
 * 90° quarter-arc when opened. Designed for corner placement (top-left in LTR,
 * top-right in RTL), so the arc opens INTO the calendar area.
 *
 * Pure CSS transitions — no framer-motion or other animation libs.
 */
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'phosphor-react';
import { cn } from '../utils/cn';

export interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  /** Disable the item (e.g. while an async action is running, or zoom limit hit) */
  disabled?: boolean;
  /** When true, spin the icon (in-progress feedback) */
  spin?: boolean;
  /** Skip rendering this item (e.g. "jump to today" only when far from today) */
  hidden?: boolean;
  /** Optional tone — emerald (primary), default slate */
  tone?: 'emerald' | 'slate';
}

interface Props {
  items: ActionItem[];
  isRtl?: boolean;
  /** Distance in px from trigger center to item center */
  radius?: number;
  /** Item size (px) */
  itemSize?: number;
  className?: string;
}

export default function CornerActionMenu({
  items,
  isRtl = false,
  radius = 75,
  itemSize = 40,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Filter hidden items so the arc spacing stays clean
  const visible = items.filter((i) => !i.hidden);

  // Direction multiplier — fan toward calendar interior
  // LTR (top-left corner): items go down-right (positive x, positive y)
  // RTL (top-right corner): items go down-left (negative x, positive y)
  const dirX = isRtl ? -1 : 1;

  return (
    <div ref={ref} className={cn('relative', className)} style={{ width: itemSize, height: itemSize }}>
      {/* Trigger — Plus icon swaps to X when open. Active-press uses a quick scale
          (95%) for tactile feedback; hover only changes color (no scale, so the click
          target doesn't move under the cursor). */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className={cn(
          'relative z-30 grid place-items-center rounded-full text-white shadow-lg active:scale-95 transition-colors',
          open ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700',
        )}
        style={{ width: itemSize, height: itemSize }}
      >
        {open ? <X size={20} weight="bold" /> : <Plus size={20} weight="bold" />}
      </button>

      {/* Action items — absolutely positioned, animated to their arc target.
          Full 90° quarter-arc with the FIRST item at the start (0°, horizontal toward
          the calendar interior) and the LAST item at the end (90°, straight down).
          Remaining items spread evenly between. */}
      {visible.map((item, i) => {
        const startDeg = 0;
        const endDeg = 90;
        const t = visible.length === 1 ? 0.5 : i / (visible.length - 1);
        const deg = startDeg + (endDeg - startDeg) * t;
        const rad = (deg * Math.PI) / 180;
        const dx = dirX * radius * Math.cos(rad);
        const dy = radius * Math.sin(rad);

        // Stagger timing — opening cascade outward, closing cascade inward
        const openDelay = i * 35;
        const closeDelay = (visible.length - i - 1) * 25;

        return (
          <button
            key={i}
            type="button"
            onClick={async () => {
              setOpen(false);
              await item.onClick();
            }}
            disabled={item.disabled}
            title={item.label}
            aria-label={item.label}
            className={cn(
              // Hover feedback uses background + shadow (no scale!) — scale on hover combined
              // with the slow open/close transition made the button visually drift away from
              // the cursor for ~350ms, so users lost the click target.
              'absolute top-0 grid place-items-center rounded-full bg-white border shadow-md text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg',
              isRtl ? 'right-0' : 'left-0',
              item.tone === 'emerald'
                ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                : 'border-slate-300 hover:bg-slate-50',
              !open && 'pointer-events-none',
            )}
            style={{
              width: itemSize,
              height: itemSize,
              transform: open
                ? `translate(${dx}px, ${dy}px) scale(1)`
                : 'translate(0, 0) scale(0.4)',
              opacity: open ? 1 : 0,
              // Only transition the transform/opacity used by open/close — hover feedback
              // (box-shadow, background-color) animates instantly via CSS defaults.
              transitionProperty: 'transform, opacity',
              transitionDuration: '350ms',
              transitionTimingFunction: 'cubic-bezier(.2,.7,.2,1.2)',
              transitionDelay: `${open ? openDelay : closeDelay}ms`,
              willChange: 'transform, opacity',
            }}
          >
            <span className={cn('inline-flex', item.spin && 'animate-spin')}>{item.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
