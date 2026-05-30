import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Buildings, Heart, ChartLineUp, ShieldCheck } from 'phosphor-react';

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
    title: 'About Hujuzatk',
    sub: 'A booking management system built for the way modern hosts in the MENA region actually work.',
    sections: [
      { Icon: Buildings, head: 'What we are', body: 'Hujuzatk is a Property Management System (PMS) for hotels, vacation rentals, chalets, and serviced apartments. Calendar, invoicing, channel sync, financial reports, and expenses — in one fast app, on web and mobile.' },
      { Icon: Heart, head: 'Why we built it', body: 'Existing PMS tools were either built for chain hotels (too heavy and expensive) or designed for Western markets (no Arabic, no Hijri dates, no integration with Gathern). We started Hujuzatk to give independent property managers in Saudi Arabia, the Gulf, and beyond a tool that just fits.' },
      { Icon: Globe, head: 'Who uses it', body: 'Chalet owners in Riyadh, guesthouse operators in Makkah, serviced-apartment chains in Istanbul, vacation-rental hosts across the GCC. Anyone who needs to know which rooms are booked, who paid what, and what the channel calendar says — without spreadsheets.' },
      { Icon: ChartLineUp, head: 'How we charge', body: 'Yearly subscription, four plans: Trial (free, 14 days, 3 rooms), Basic ($40/yr, 10 rooms), Pro ($90/yr, 30 rooms + channel sync), Enterprise ($140/yr, unlimited). No per-booking fees, no commission, no surprises.' },
      { Icon: ShieldCheck, head: 'Our principles', body: 'Speed first — calendar must be instant. Privacy first — your guest data is yours, never sold. Localization first — Arabic isn\'t an afterthought. Honesty first — pricing on the website, no salesperson required.' },
    ],
    cta: 'Try it free for 14 days',
  },
  ar: {
    dir: 'rtl' as const,
    back: '→ رجوع',
    title: 'عن حجوزاتك',
    sub: 'نظام إدارة الحجوزات المصمم للطريقة التي يعمل بها مديرو العقارات الحديثون في الشرق الأوسط فعلياً.',
    sections: [
      { Icon: Buildings, head: 'ما نحن', body: 'حجوزاتك هو نظام إدارة عقارات (PMS) للفنادق والإيجارات السياحية والشاليهات والشقق المخدومة. التقويم، الفوترة، مزامنة القنوات، التقارير المالية، والمصروفات — في تطبيق واحد سريع، على الويب والجوال.' },
      { Icon: Heart, head: 'لماذا بنيناه', body: 'الأدوات الموجودة إما مصممة للسلاسل الفندقية (ثقيلة ومكلفة) أو للأسواق الغربية (بدون عربية، بدون تواريخ هجرية، بدون تكامل مع جاذبين). بدأنا حجوزاتك لنعطي مديري العقارات المستقلين في السعودية والخليج وما بعدها أداة تناسبهم.' },
      { Icon: Globe, head: 'من يستخدمه', body: 'ملاك الشاليهات في الرياض، مشغلو الاستراحات في مكة، سلاسل الشقق المخدومة في إسطنبول، مضيفو الإيجارات السياحية في الخليج. أي شخص يحتاج معرفة الغرف المحجوزة، ومن دفع كم، وماذا يقول تقويم القناة — بدون جداول إكسل.' },
      { Icon: ChartLineUp, head: 'كيف نتقاضى', body: 'اشتراك سنوي، أربع خطط: تجريبي (مجاني، 14 يوم، 3 غرف)، أساسي (40$/سنة، 10 غرف)، محترف (90$/سنة، 30 غرفة + مزامنة)، مؤسسات (140$/سنة، غرف غير محدودة). لا رسوم لكل حجز، لا عمولة، لا مفاجآت.' },
      { Icon: ShieldCheck, head: 'مبادئنا', body: 'السرعة أولاً — التقويم يجب أن يكون فورياً. الخصوصية أولاً — بيانات ضيوفك ملكك، لا تُباع. التوطين أولاً — العربية ليست فكرة لاحقة. الصدق أولاً — الأسعار على الموقع، بدون مندوب مبيعات.' },
    ],
    cta: 'جرب مجاناً لمدة 14 يوم',
  },
  tr: {
    dir: 'ltr' as const,
    back: '← Geri',
    title: 'Hujuzatk Hakkında',
    sub: 'Modern MENA bölgesi ev sahiplerinin gerçekten çalıştığı şekilde tasarlanmış bir rezervasyon yönetim sistemi.',
    sections: [
      { Icon: Buildings, head: 'Ne yapıyoruz', body: 'Hujuzatk; oteller, tatil kiralamaları, şaleler ve hizmet daireleri için bir Mülk Yönetim Sistemidir (PMS). Takvim, faturalandırma, kanal senkronizasyonu, finansal raporlar ve giderler — web ve mobilde tek bir hızlı uygulamada.' },
      { Icon: Heart, head: 'Neden kurduk', body: 'Mevcut araçlar ya zincir oteller için tasarlanmış (ağır ve pahalı) ya da Batı pazarları için (Arapça yok, Hicri tarih yok, Gathern entegrasyonu yok). Suudi Arabistan, Körfez ve ötesindeki bağımsız mülk yöneticilerine uygun bir araç vermek için Hujuzatk\'ı başlattık.' },
      { Icon: Globe, head: 'Kim kullanıyor', body: 'Riyad\'daki şale sahipleri, Mekke\'deki pansiyon işletmecileri, İstanbul\'daki hizmet daireleri zincirleri, Körfez\'deki tatil kiralama ev sahipleri. Hangi odaların rezerve olduğunu, kimin ne kadar ödediğini ve kanal takviminin ne dediğini bilmesi gereken herkes — elektronik tablolar olmadan.' },
      { Icon: ChartLineUp, head: 'Fiyatlandırma', body: 'Yıllık abonelik, dört plan: Deneme (ücretsiz, 14 gün, 3 oda), Temel (40$/yıl, 10 oda), Pro (90$/yıl, 30 oda + kanal senkronizasyonu), Kurumsal (140$/yıl, sınırsız). Rezervasyon başına ücret yok, komisyon yok, sürpriz yok.' },
      { Icon: ShieldCheck, head: 'İlkelerimiz', body: 'Önce hız — takvim anında olmalı. Önce gizlilik — misafir verileriniz size ait, asla satılmaz. Önce yerelleştirme — Arapça sonradan eklenmiş bir özellik değil. Önce dürüstlük — fiyatlar sitede, satış temsilcisi gerekmez.' },
    ],
    cta: '14 gün ücretsiz dene',
  },
};

export default function AboutPage() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const c = COPY[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    document.title = lang === 'ar' ? 'عن حجوزاتك — Hujuzatk' : 'About Hujuzatk — Hujuzatk PMS';
    document.documentElement.lang = lang;
    document.documentElement.dir = c.dir;
  }, [lang, c.dir]);

  // Point at the authoritative static /about/ page (this SPA route normally
  // hard-redirects there) so the canonical never lingers as the homepage.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevHref = link?.getAttribute('href') ?? null;
    if (link) link.setAttribute('href', 'https://hujuzatk.com/about/');
    return () => { if (link && prevHref !== null) link.setAttribute('href', prevHref); };
  }, []);

  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
    localStorage.setItem('landing-lang', next);
  };

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

      {/* Sections */}
      <section className="max-w-[760px] mx-auto" style={{ padding: '0 24px 60px' }}>
        <div className="space-y-5">
          {c.sections.map(({ Icon, head, body }, i) => (
            <div key={i} style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 24,
              boxShadow: 'var(--sh-sm)',
            }}>
              <div className="flex items-start gap-4">
                <div className="grid place-items-center shrink-0" style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--brand-green-tint)', color: 'var(--brand-green-deep)',
                }}>
                  <Icon size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-black" style={{ fontSize: 17, color: 'var(--ink-900)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                    {head}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.65, margin: 0 }}>
                    {body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[760px] mx-auto" style={{ padding: '0 24px 80px' }}>
        <Link
          to="/user?tab=register"
          className="block text-center font-bold transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--brand-green)', color: '#fff',
            padding: '16px 30px', fontSize: 15,
            borderRadius: 999,
            boxShadow: '0 8px 20px -8px rgba(14,159,110,.6)',
          }}
        >
          {c.cta}
        </Link>
      </section>
    </div>
  );
}
