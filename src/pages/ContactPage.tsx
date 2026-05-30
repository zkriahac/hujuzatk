import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, EnvelopeSimple, MapPin } from 'phosphor-react';

type Lang = 'en' | 'ar' | 'tr';

const detectLang = (): Lang => {
  const stored = localStorage.getItem('landing-lang');
  if (stored === 'en' || stored === 'ar' || stored === 'tr') return stored;
  if (navigator.language?.startsWith('ar')) return 'ar';
  if (navigator.language?.startsWith('tr')) return 'tr';
  return 'en';
};

const COPY = {
  en: {
    dir: 'ltr' as const,
    back: '← Back',
    title: 'Contact Hujuzatk',
    sub: 'Reach the team. We answer every message — usually within a few hours during business hours (UTC+3).',
    methods: [
      { icon: 'wa', head: 'WhatsApp', body: 'The fastest way. Drop a message any time — we reply during business hours.', value: '+90 552 320 5496', href: 'https://wa.me/905523205496' },
      { icon: 'email', head: 'Email', body: 'For longer questions, billing, or anything you\'d rather put in writing.', value: 'zkriahagmohamad@gmail.com', href: 'mailto:zkriahagmohamad@gmail.com' },
      { icon: 'where', head: 'Where we are', body: 'We\'re a small remote team. The product is built and supported from Istanbul, Türkiye.' },
    ],
    note: 'Need to demo the product before signing up? Send a WhatsApp — we\'ll walk through it on a quick call.',
  },
  ar: {
    dir: 'rtl' as const,
    back: '→ رجوع',
    title: 'تواصل مع حجوزاتك',
    sub: 'تواصل مع الفريق. نرد على كل رسالة — عادةً خلال ساعات قليلة في أوقات العمل (UTC+3).',
    methods: [
      { icon: 'wa', head: 'واتساب', body: 'الطريقة الأسرع. اترك رسالة في أي وقت — نرد خلال ساعات العمل.', value: '+90 552 320 5496', href: 'https://wa.me/905523205496' },
      { icon: 'email', head: 'البريد الإلكتروني', body: 'للأسئلة الأطول، أمور الفوترة، أو أي شيء تفضل كتابته.', value: 'zkriahagmohamad@gmail.com', href: 'mailto:zkriahagmohamad@gmail.com' },
      { icon: 'where', head: 'أين نحن', body: 'فريق صغير نعمل عن بُعد. المنتج مبني ومدعوم من إسطنبول، تركيا.' },
    ],
    note: 'تريد عرضاً للمنتج قبل التسجيل؟ ارسل رسالة واتساب — سنشرحه في مكالمة سريعة.',
  },
  tr: {
    dir: 'ltr' as const,
    back: '← Geri',
    title: 'Hujuzatk ile İletişim',
    sub: 'Ekibe ulaşın. Her mesaja cevap veriyoruz — genellikle iş saatlerinde birkaç saat içinde (UTC+3).',
    methods: [
      { icon: 'wa', head: 'WhatsApp', body: 'En hızlı yol. İstediğiniz zaman mesaj bırakın — iş saatlerinde cevap veririz.', value: '+90 552 320 5496', href: 'https://wa.me/905523205496' },
      { icon: 'email', head: 'E-posta', body: 'Daha uzun sorular, faturalandırma veya yazılı bırakmak istediğiniz herhangi bir şey için.', value: 'zkriahagmohamad@gmail.com', href: 'mailto:zkriahagmohamad@gmail.com' },
      { icon: 'where', head: 'Neredeyiz', body: 'Küçük bir uzak ekibiz. Ürün İstanbul, Türkiye\'den geliştiriliyor ve destekleniyor.' },
    ],
    note: 'Kayıt olmadan önce ürünü demo etmek mi istiyorsunuz? WhatsApp\'tan yazın — hızlı bir görüşmede gezdirelim.',
  },
};

// Simple WhatsApp icon SVG (avoid pulling another icon package)
const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor">
    <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.872 2.722.872.4 0 1.117-.058 1.43-.301.388-.302.673-.953.673-1.444 0-.156-.043-.301-.072-.444-.115-.422-1.917-1.234-2.018-1.205zM16.117 27.71c-2.063 0-4.083-.587-5.832-1.66l-.418-.25-4.318 1.131 1.158-4.21-.272-.434C5.234 20.4 4.578 18.214 4.578 16c0-6.357 5.182-11.54 11.54-11.54 6.36 0 11.54 5.183 11.54 11.54-.013 6.357-5.197 11.71-11.54 11.71zm0-25.117c-7.4 0-13.41 6.014-13.41 13.41 0 2.379.625 4.683 1.81 6.736l-1.93 7.057 7.213-1.886a13.39 13.39 0 0 0 6.347 1.622h.012c7.4 0 13.426-6.013 13.426-13.41 0-3.59-1.396-6.957-3.94-9.495a13.45 13.45 0 0 0-9.527-3.943z" />
  </svg>
);

export default function ContactPage() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const c = COPY[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    document.title = lang === 'ar' ? 'تواصل مع حجوزاتك — Hujuzatk' : 'Contact Hujuzatk — Hujuzatk PMS';
    document.documentElement.lang = lang;
    document.documentElement.dir = c.dir;
  }, [lang, c.dir]);

  // Self-referencing canonical so /contact isn't folded into the homepage
  // (it otherwise inherits index.html's homepage canonical).
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevHref = link?.getAttribute('href') ?? null;
    if (link) link.setAttribute('href', 'https://hujuzatk.com/contact');
    return () => { if (link && prevHref !== null) link.setAttribute('href', prevHref); };
  }, []);

  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
    localStorage.setItem('landing-lang', next);
  };

  const iconOf = (kind: string) =>
    kind === 'wa' ? <WhatsAppIcon size={20} />
    : kind === 'email' ? <EnvelopeSimple size={20} weight="duotone" />
    : <MapPin size={20} weight="duotone" />;

  return (
    <div dir={c.dir} style={{
      background: 'var(--bg)', minHeight: '100vh',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
    }}>
      {/* Top bar */}
      <div className="max-w-[920px] mx-auto flex items-center justify-between" style={{ padding: '24px' }}>
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-sm" style={{ color: 'var(--ink-700)' }}>
          {c.back}
        </Link>
        <button
          onClick={cycleLang}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-slate-50"
          style={{ borderRadius: 999, border: '1px solid var(--border)', color: 'var(--ink-700)', background: '#fff' }}
        >
          <Globe size={13} weight="bold" />
          { { en: 'EN', ar: 'العربية', tr: 'TR' }[lang] }
        </button>
      </div>

      {/* Hero */}
      <section className="max-w-[760px] mx-auto text-center" style={{ padding: '32px 24px 48px' }}>
        <span className="eyebrow inline-block" style={{ marginBottom: 16 }}>{c.title}</span>
        <h1 className="h-display" style={{
          fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
          margin: '0 0 18px', color: 'var(--ink-900)',
        }}>
          {c.title}
        </h1>
        <p style={{ fontSize: 18, color: 'var(--ink-500)', lineHeight: 1.6 }}>{c.sub}</p>
      </section>

      {/* Methods */}
      <section className="max-w-[760px] mx-auto" style={{ padding: '0 24px 24px' }}>
        <div className="space-y-4">
          {c.methods.map((m, i) => {
            const isLink = !!m.href;
            const Component: any = isLink ? 'a' : 'div';
            const props: any = isLink ? { href: m.href, target: '_blank', rel: 'noopener noreferrer' } : {};
            return (
              <Component
                key={i}
                {...props}
                className={isLink ? 'block transition-all hover:-translate-y-0.5' : 'block'}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: 24,
                  boxShadow: 'var(--sh-sm)',
                  textDecoration: 'none',
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="grid place-items-center shrink-0" style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: m.icon === 'wa' ? 'rgba(37,211,102,0.12)' : 'var(--brand-green-tint)',
                    color: m.icon === 'wa' ? '#128c7e' : 'var(--brand-green-deep)',
                  }}>
                    {iconOf(m.icon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-black" style={{ fontSize: 17, color: 'var(--ink-900)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                      {m.head}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.65, margin: '0 0 8px' }}>
                      {m.body}
                    </p>
                    {m.value && (
                      <p className="font-mono font-bold" style={{ fontSize: 13, color: 'var(--brand-green-deep)', margin: 0 }} dir="ltr">
                        {m.value}
                      </p>
                    )}
                  </div>
                </div>
              </Component>
            );
          })}
        </div>
      </section>

      {/* Note */}
      <section className="max-w-[760px] mx-auto" style={{ padding: '0 24px 80px' }}>
        <p className="text-center" style={{ fontSize: 14, color: 'var(--ink-300)', fontStyle: 'italic' }}>
          {c.note}
        </p>
      </section>
    </div>
  );
}
