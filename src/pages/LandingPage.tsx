import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, FileText, Globe, ChartPie, DeviceMobile, Database,
  ArrowRight, Buildings, Check, Star, ShieldCheck, Sparkle,
  List, X, CaretDown, ArrowsClockwise,
} from 'phosphor-react';
import { authService } from '../lib/authService';
import { trackCTA, trackWorkspaceSearch } from '../lib/analytics';
import { cn } from '../utils/cn';
import PromoPopup from '../components/PromoPopup';
import {
  isPromoActive, PROMO_DISMISS_KEY, PROMO_DISMISS_COOLDOWN_DAYS,
  PLAN_BASIC, PLAN_PRO, CURRENCY_SYMBOL,
} from '../lib/promoConfig';

type Lang = 'en' | 'ar' | 'tr';

const content = {
  en: {
    dir: 'ltr' as const,
    nav: { features: 'Features', pricing: 'Pricing', login: 'Log in', startTrial: 'Start Free Trial' },
    hero: {
      badge: 'The Next Gen PMS is here',
      headline: 'Booking Management',
      italic: 'Simplified.',
      sub: 'Scale your hotel, apartment business, or vacation rentals with our lightning-fast 5-year booking calendar, automated invoicing, and deep financial analytics.',
      placeholder: 'Enter your hotel or workspace name...',
      cta: 'Get Started',
      pills: ['14-Day Free Trial', 'No Credit Card', 'Instant Setup'],
    },
    features: {
      heading: 'Built for speed. Designed for growth.',
      sub: 'Everything we built focuses on one thing: making your booking management operation as invisible as possible so you can focus on your guests.',
      items: [
        { title: 'Infinite 5-Year Calendar', desc: 'Our proprietary virtualized grid lets you scroll through 5 years of bookings without a single stutter. Plan peak seasons years in advance.' },
        { title: 'Smart Invoicing', desc: 'Automated calculation of nights, discounts, and deposits. Generate clean, printable PDF invoices in English or Arabic instantly.' },
        { title: 'Native Arabic & RTL', desc: 'Not just a translation, but a complete localized experience. Perfect RTL layouts with OMR and regional date formats built-in.' },
        { title: 'Financial Intelligence', desc: 'Advanced reporting on Stay Date vs Creation Date. Visualize fill rates, revenue per room, and identify your most profitable channels.' },
        { title: 'Installable Mobile App', desc: 'Install Hujuzatk to your phone\'s home screen in one tap — works offline, sends push notifications, no App Store or Play Store download needed.' },
        { title: 'Auto-Sync External Bookings', desc: 'Nightly + on-demand iCal sync from Airbnb, Gathern, and Booking.com. New reservations appear in your calendar automatically — no copy-paste.' },
        { title: 'Enterprise Scaling', desc: 'Start locally with high-speed Dexie DB and upgrade to PostgreSQL (Supabase) in seconds. Your data, your control.' },
      ],
    },
    trust: {
      badge: 'Bank-Grade Security',
      heading: 'Your data is safe, private, and always yours.',
      sub: 'Hujuzatk uses multi-tenant isolation. This means every hotel\'s data is mathematically separated from others. No leaks, no performance crosstalk, just pure reliability.',
      uptime: 'Uptime SLA', latency: 'Latency Local',
      testimonialsHeading: 'Trusted by real property managers',
      testimonials: [
        {
          quote: 'Hujuzatk transformed the way we manage our properties. The 5-year calendar and Arabic RTL support made it perfect for our team. We cut booking errors by 80% in the first month.',
          author: 'Vista Company',
          role: 'Property Management — Saudi Arabia',
          phone: '+966 54 615 2888',
          initials: 'V',
        },
        {
          quote: 'As a booking manager handling multiple properties, I needed a tool that keeps up with my pace. Hujuzatk\'s speed and smart invoicing save me hours every week.',
          author: 'Muhammad Orfan',
          role: 'Booking Manager — Saudi Arabia',
          phone: '+966 54 763 3923',
          initials: 'M',
        },
        {
          quote: 'Running a hotel in Makkah means high traffic and zero margin for error. Hujuzatk handles our peak seasons flawlessly. The automated invoicing alone was worth the switch.',
          author: 'Sada Makka Hotel',
          role: 'Hotel Management — Makkah, Saudi Arabia',
          phone: '+966 56 527 3054',
          initials: 'S',
        },
      ],
    },
    pricing: {
      heading: 'Simple, honest pricing.',
      sub: 'Choose the plan that fits — both include a 14-day free trial.',
      perYear: '/Year',
      recommended: 'RECOMMENDED',
      save: 'SAVE 15%',
      was: 'Was',
      note: 'Cancel anytime. No lock-in contracts.',
      plans: [
        {
          id: 'basic',
          name: 'Basic',
          tagline: 'Perfect for small properties',
          features: ['Unlimited Bookings', 'Up to 50 Rooms', 'Full Reporting Suite', 'Multi-Language (AR/EN/TR)', 'Installable App', '5-Year Calendar'],
          cta: 'Start Free Trial',
          recommended: false,
        },
        {
          id: 'pro',
          name: 'Pro',
          tagline: 'Basic + automatic channel sync',
          features: ['Everything in Basic', 'Auto-Sync Airbnb', 'Auto-Sync Gathern', 'Auto-Sync Booking.com', 'Nightly automated sync', 'Priority WhatsApp support'],
          cta: 'Start Free Trial',
          recommended: true,
        },
      ],
      promo: {
        title: 'Year-End Promo',
        subtitle: 'Both plans discounted until end of 2026 — start now and lock in your rate.',
        placeholder: 'Enter your workspace name…',
        cta: 'Start my workspace',
      },
    },
    footer: {
      tagline: 'The world\'s most intuitive Booking Management System for modern hosts and professional property managers.',
      legal: 'Legal', support: 'Support', privacy: 'Privacy', terms: 'Terms',
      whatsapp: 'WhatsApp Support',
      rights: `© ${new Date().getFullYear()} Hujuzatk PMS. All rights reserved.`,
      location: 'Istanbul | Turkiye | International',
    },
    screenshots: {
      heading: 'Every tool you need. One screen away.',
      sub: 'From calendar to invoice in 3 clicks — designed for speed, clarity, and total control.',
      stats: { occ: 'Occupancy', rev: 'Revenue', bk: 'Bookings' },
      labels: {
        calendar: 'Booking Calendar',
        settings: 'Settings',
        reports: 'Financial Reports',
        list: 'Reservations List',
      },
      captions: {
        calendar: '5-year grid — scroll years in seconds',
        settings: 'Set Rooms and Local ',
        reports: 'Revenue, occupancy & fill-rate at a glance',
        list: 'Smart filters · search · status badges',
      },
    },
  },
  ar: {
    dir: 'rtl' as const,
    nav: { features: 'المميزات', pricing: 'الأسعار', login: 'دخول', startTrial: 'جرب مجانا' },
    hero: {
      badge: 'جيل جديد من إدارة الحجوزات',
      headline: 'إدارة الحجوزات',
      italic: 'أصبحت أبسط.',
      sub: 'وسّع نطاق فندقك أو شققك أو إيجاراتك السياحية مع تقويمنا الفائق السرعة لـ 5 سنوات، والفوترة التلقائية، والتحليلات المالية المتعمقة.',
      placeholder: 'أدخل اسم الفندق أو مساحة العمل...',
      cta: 'ابدأ الآن',
      pills: ['14 يوم مجاني', 'بدون بطاقة ائتمان', 'إعداد فوري'],
    },
    features: {
      heading: 'مبني للسرعة. مصمم للنمو.',
      sub: 'كل ما بنيناه يركز على شيء واحد: جعل إدارة عقاراتك غير مرئية قدر الإمكان حتى تتمكن من التركيز على ضيوفك.',
      items: [
        { title: 'تقويم 5 سنوات لا نهائي', desc: 'شبكتنا المُحسَّنة تتيح لك التمرير خلال 5 سنوات من الحجوزات دون أي تأخير. خطط لمواسم الذروة سنوات مسبقاً.' },
        { title: 'فوترة ذكية', desc: 'حساب تلقائي للليالي والخصومات والعربون. أنشئ فواتير نظيفة وقابلة للطباعة باللغة العربية أو الإنجليزية فوراً.' },
        { title: 'دعم كامل للعربية وRTL', desc: 'ليس مجرد ترجمة، بل تجربة محلية كاملة. تخطيطات RTL مثالية مع تنسيقات تواريخ إقليمية وOMR مدمجة.' },
        { title: 'ذكاء مالي', desc: 'تقارير متقدمة حسب تاريخ الإقامة أو تاريخ الإنشاء. تصور معدلات الإشغال والإيرادات لكل غرفة.' },
        { title: 'تطبيق جوال قابل للتثبيت', desc: 'ثبّت حجوزاتك على شاشتك الرئيسية بنقرة واحدة — يعمل بدون إنترنت، ويرسل إشعارات، بدون الحاجة لتحميل من App Store أو Play Store.' },
        { title: 'مزامنة تلقائية للحجوزات الخارجية', desc: 'مزامنة ليلية وعند الطلب لتقويم Airbnb وجاذبين وBooking.com. الحجوزات الجديدة تظهر تلقائياً في تقويمك — دون أي نسخ ولصق.' },
        { title: 'قابلية توسع المؤسسات', desc: 'ابدأ محلياً مع Dexie DB عالية السرعة وانتقل إلى PostgreSQL في ثوانٍ. بياناتك، تحكمك.' },
      ],
    },
    trust: {
      badge: 'أمان على مستوى البنوك',
      heading: 'بياناتك آمنة وخاصة وملكك دائماً.',
      sub: 'حجوزاتك يستخدم العزل متعدد المستأجرين. هذا يعني أن بيانات كل فندق مفصولة رياضياً عن غيره. لا تسريبات، لا تداخل في الأداء، فقط موثوقية خالصة.',
      uptime: 'ضمان وقت التشغيل', latency: 'زمن الاستجابة المحلي',
      testimonialsHeading: 'موثوق من قبل مديري عقارات حقيقيين',
      testimonials: [
        {
          quote: 'حجوزاتك غيّر طريقة إدارتنا للعقارات بالكامل. تقويم 5 سنوات ودعم اللغة العربية جعله مثالياً لفريقنا. قلّصنا أخطاء الحجز بنسبة 80% في الشهر الأول.',
          author: 'شركة فيستا',
          role: 'إدارة عقارات — المملكة العربية السعودية',
          phone: '+966 54 615 2888',
          initials: 'ف',
        },
        {
          quote: 'كمدير حجوزات أتعامل مع عقارات متعددة، كنت بحاجة لأداة تواكب وتيرتي. سرعة حجوزاتك والفوترة الذكية توفر لي ساعات كل أسبوع.',
          author: 'محمد عرفان',
          role: 'مدير حجوزات — المملكة العربية السعودية',
          phone: '+966 54 763 3923',
          initials: 'م',
        },
        {
          quote: 'إدارة فندق في مكة المكرمة تعني ضغطاً عالياً وهامش خطأ صفري. حجوزاتك يتعامل مع مواسم الذروة بكفاءة تامة. الفوترة التلقائية وحدها كانت تستحق التحول.',
          author: 'فندق صدى مكة',
          role: 'إدارة فندقية — مكة المكرمة، المملكة العربية السعودية',
          phone: '+966 56 527 3054',
          initials: 'ص',
        },
      ],
    },
    pricing: {
      heading: 'أسعار بسيطة وصريحة.',
      sub: 'اختر الخطة المناسبة — كلاهما يشمل تجربة مجانية لمدة 14 يوم.',
      perYear: '/سنة',
      recommended: 'موصى به',
      save: 'خصم 15%',
      was: 'كان',
      note: 'إلغاء في أي وقت. لا عقود ملزمة.',
      plans: [
        {
          id: 'basic',
          name: 'أساسي',
          tagline: 'مثالي للعقارات الصغيرة',
          features: ['حجوزات غير محدودة', 'حتى 50 غرفة', 'مجموعة تقارير كاملة', 'متعدد اللغات (AR/EN/TR)', 'تطبيق قابل للتثبيت', 'تقويم 5 سنوات'],
          cta: 'ابدأ التجربة المجانية',
          recommended: false,
        },
        {
          id: 'pro',
          name: 'المحترف',
          tagline: 'الأساسي + مزامنة القنوات التلقائية',
          features: ['كل ما في الأساسي', 'مزامنة Airbnb تلقائية', 'مزامنة جاذبين تلقائية', 'مزامنة Booking.com تلقائية', 'مزامنة ليلية مجدولة', 'دعم واتساب أولوية'],
          cta: 'ابدأ التجربة المجانية',
          recommended: true,
        },
      ],
      promo: {
        title: 'عرض نهاية العام',
        subtitle: 'الخطتان مخفضتان حتى نهاية 2026 — اشترك الآن واحجز سعرك.',
        placeholder: 'أدخل اسم مساحة العمل…',
        cta: 'ابدأ مساحة عملي',
      },
    },
    footer: {
      tagline: 'نظام إدارة الحجوزات الأكثر سهولة في العالم للمضيفين المعاصرين ومديري الحجوزات المحترفين.',
      legal: 'قانوني', support: 'الدعم', privacy: 'الخصوصية', terms: 'الشروط',
      whatsapp: 'دعم واتساب',
      rights: `© ${new Date().getFullYear()} حجوزاتك PMS. جميع الحقوق محفوظة.`,
      location: 'إسطنبول | تركيا | دولي',
    },
    screenshots: {
      heading: 'كل الأدوات التي تحتاجها. في شاشة واحدة.',
      sub: 'من التقويم إلى الفاتورة في 3 نقرات — مصمم للسرعة والوضوح والتحكم الكامل.',
      stats: { occ: 'الإشغال', rev: 'الإيرادات', bk: 'الحجوزات' },
      labels: {
        calendar: 'تقويم الحجوزات',
        settings: 'اعدادات',
        reports: 'التقارير المالية',
        list: 'قائمة الحجوزات',
      },
      captions: {
        calendar: 'شبكة 5 سنوات — تصفح السنوات في ثوانٍ',
        settings: 'ضبط الإعدادات الضرورية',
        reports: 'الإيرادات والإشغال ومعدل الإشغال في لمحة',
        list: 'فلاتر ذكية · بحث · شارات الحالة',
      },
    },
  },
  tr: {
    dir: 'ltr' as const,
    nav: { features: 'Özellikler', pricing: 'Fiyatlar', login: 'Giriş Yap', startTrial: 'Ücretsiz Dene' },
    hero: {
      badge: 'Yeni Nesil PMS Burada',
      headline: 'Rezervasyon Yönetimi',
      italic: 'Basitleştirildi.',
      sub: 'Otel, apart veya kiralık tatil mülklerinizi ultra hızlı 5 yıllık takvim, otomatik faturalama ve finansal analizlerle büyütün.',
      placeholder: 'Otel veya çalışma alanı adınızı girin...',
      cta: 'Başla',
      pills: ['14 Gün Ücretsiz', 'Kredi Kartı Gerekmez', 'Anında Kurulum'],
    },
    features: {
      heading: 'Hız için inşa edildi. Büyüme için tasarlandı.',
      sub: 'Her şey tek bir amaca odaklanıyor: mülk yönetiminizi olabildiğince görünmez kılmak, böylece misafirlerinize odaklanabilirsiniz.',
      items: [
        { title: 'Sonsuz 5 Yıllık Takvim', desc: 'Özel sanallaştırılmış ızgaramız, 5 yıllık rezervasyonları takılmadan kaydırmanızı sağlar. Yoğun sezonları yıllar öncesinden planlayın.' },
        { title: 'Akıllı Faturalama', desc: 'Gece, indirim ve depozito otomatik hesaplanır. İngilizce veya Türkçe temiz, yazdırılabilir PDF faturalar anında oluşturun.' },
        { title: 'Çoklu Dil Desteği', desc: 'İngilizce, Arapça ve Türkçe tam destek. RTL düzenleri ve bölgesel tarih formatları dahil.' },
        { title: 'Finansal Zeka', desc: 'Konaklama ve oluşturma tarihine göre gelişmiş raporlama. Doluluk oranları, oda başına gelir ve en kârlı kanalları görselleştirin.' },
        { title: 'Telefona Kurulabilir', desc: "Hujuzatk'ı tek dokunuşla ana ekrana ekleyin — çevrimdışı çalışır, bildirim gönderir, App Store veya Play Store indirmeye gerek yok." },
        { title: 'Harici Rezervasyonları Otomatik Senkronize Et', desc: "Airbnb, Gathern ve Booking.com'dan gecelik ve talep üzerine iCal senkronizasyonu. Yeni rezervasyonlar otomatik olarak takviminizde belirir — kopyala-yapıştır yok." },
        { title: 'Kurumsal Ölçeklendirme', desc: 'Yerel yüksek hızlı Dexie DB ile başlayın, saniyeler içinde PostgreSQL\'e geçin. Verileriniz, kontrolünüz.' },
      ],
    },
    trust: {
      badge: 'Banka Düzeyinde Güvenlik',
      heading: 'Verileriniz güvende, gizli ve her zaman sizin.',
      sub: 'Hujuzatk çok kiracılı izolasyon kullanır. Her otelin verileri matematiksel olarak diğerlerinden ayrılır. Sızıntı yok, performans çakışması yok, sadece güvenilirlik.',
      uptime: 'Çalışma Süresi SLA', latency: 'Yerel Gecikme',
      testimonialsHeading: 'Gerçek mülk yöneticileri tarafından güveniliyor',
      testimonials: [
        {
          quote: 'Hujuzatk mülk yönetimimizi tamamen dönüştürdü. 5 yıllık takvim ve Arapça RTL desteği ekibimiz için mükemmel oldu. İlk ayda rezervasyon hatalarını %80 azalttık.',
          author: 'Vista Company',
          role: 'Mülk Yönetimi — Suudi Arabistan',
          phone: '+966 54 615 2888',
          initials: 'V',
        },
        {
          quote: 'Birden fazla mülkü yöneten bir rezervasyon müdürü olarak, hızıma ayak uyduran bir araca ihtiyacım vardı. Hujuzatk\'ın hızı ve akıllı faturalaması bana her hafta saatler kazandırıyor.',
          author: 'Muhammad Orfan',
          role: 'Rezervasyon Müdürü — Suudi Arabistan',
          phone: '+966 54 763 3923',
          initials: 'M',
        },
        {
          quote: 'Mekke\'de otel yönetmek yüksek trafik ve sıfır hata payı demektir. Hujuzatk yoğun sezonlarımızı kusursuz yönetiyor. Otomatik faturalama tek başına geçişe değerdi.',
          author: 'Sada Makka Hotel',
          role: 'Otel Yönetimi — Mekke, Suudi Arabistan',
          phone: '+966 56 527 3054',
          initials: 'S',
        },
      ],
    },
    pricing: {
      heading: 'Basit, dürüst fiyatlandırma.',
      sub: 'Size uygun planı seçin — her ikisi de 14 günlük ücretsiz deneme içerir.',
      perYear: '/Yıl',
      recommended: 'ÖNERİLEN',
      save: '%15 İNDİRİM',
      was: 'Eski',
      note: 'İstediğiniz zaman iptal edin. Sözleşme yok.',
      plans: [
        {
          id: 'basic',
          name: 'Temel',
          tagline: 'Küçük mülkler için ideal',
          features: ['Sınırsız Rezervasyon', '50\'ye Kadar Oda', 'Tam Raporlama', 'Çoklu Dil (AR/EN/TR)', 'Kurulabilir Uygulama', '5 Yıllık Takvim'],
          cta: 'Ücretsiz Denemeye Başla',
          recommended: false,
        },
        {
          id: 'pro',
          name: 'Pro',
          tagline: 'Temel + otomatik kanal senkronu',
          features: ['Temel\'deki her şey', 'Airbnb Otomatik Senkron', 'Gathern Otomatik Senkron', 'Booking.com Otomatik Senkron', 'Gecelik otomatik senkron', 'Öncelikli WhatsApp desteği'],
          cta: 'Ücretsiz Denemeye Başla',
          recommended: true,
        },
      ],
      promo: {
        title: 'Yıl Sonu Kampanyası',
        subtitle: '2026 yılı sonuna kadar her iki plan da indirimli — hemen başlayın, fiyatınızı kilitleyin.',
        placeholder: 'Çalışma alanı adını girin…',
        cta: 'Çalışma alanımı başlat',
      },
    },
    footer: {
      tagline: 'Modern ev sahipleri ve profesyonel mülk yöneticileri için dünyanın en sezgisel Rezervasyon Yönetim Sistemi.',
      legal: 'Yasal', support: 'Destek', privacy: 'Gizlilik', terms: 'Şartlar',
      whatsapp: 'WhatsApp Destek',
      rights: `© ${new Date().getFullYear()} Hujuzatk PMS. Tüm hakları saklıdır.`,
      location: 'İstanbul | Türkiye | Uluslararası',
    },
    screenshots: {
      heading: 'İhtiyacınız olan her araç. Tek ekran uzağınızda.',
      sub: 'Takvimden faturaya 3 tıklamada — hız, netlik ve tam kontrol için tasarlandı.',
      stats: { occ: 'Doluluk', rev: 'Gelir', bk: 'Rezervasyon' },
      labels: {
        calendar: 'Rezervasyon Takvimi',
        settings: 'Ayarlar',
        reports: 'Finansal Raporlar',
        list: 'Rezervasyon Listesi',
      },
      captions: {
        calendar: '5 yıllık ızgara — saniyeler içinde yılları kaydırın',
        settings: 'Oda ve yerel ayarları yapılandırın',
        reports: 'Gelir, doluluk ve doluluk oranı bir bakışta',
        list: 'Akıllı filtreler · arama · durum rozetleri',
      },
    },
  },
};

// Order matches features.items array: Calendar, Invoicing, Arabic+RTL, Financial, Installable, AutoSync, Enterprise
const FEATURE_ICONS = [Calendar, FileText, Globe, ChartPie, DeviceMobile, ArrowsClockwise, Database];

// -------- SEO helpers --------

function setMetaName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setMetaProp(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setLinkRel(rel: string, href: string, extra?: Record<string, string>) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
  if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
}
function setJsonLD(id: string, data: object) {
  let el = document.querySelector<HTMLScriptElement>(`script[data-ld="${id}"]`);
  if (!el) { el = document.createElement('script'); el.setAttribute('type', 'application/ld+json'); el.setAttribute('data-ld', id); document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
}

function applySEO(lang: Lang) {
  const isAr = lang === 'ar';

  const title = isAr
    ? 'حجوزاتك PMS – نظام إدارة الفنادق والحجوزات | برنامج الحجوزات العربي'
    : 'Hujuzatk PMS – Hotel & Property Management System | Free 14-Day Trial';

  const description = isAr
    ? 'حجوزاتك هو نظام إدارة الفنادق والحجوزات الأحدث جيلاً. تقويم حجوزات 5 سنوات، فوترة تلقائية، تحليلات مالية متعمقة، دعم عربي كامل RTL. جرّب مجاناً 14 يوم بدون بطاقة ائتمان.'
    : 'Hujuzatk is the next-gen Hotel & Property Management System for hotels, apartments, and vacation rentals. 5-year calendar, automated PDF invoicing, financial analytics, native Arabic RTL. Start free 14-day trial.';

  const keywords = isAr
    ? 'نظام إدارة الفنادق, برنامج إدارة الحجوزات, نظام الحجوزات الفندقية, PMS عربي, نظام إدارة الشقق الفندقية, برنامج حجز الغرف, نظام إدارة الإيجارات, برنامج فندقي عمان, نظام PMS الخليج, إدارة الحجوزات بالعربية, برنامج فواتير فندقية, نظام إشغال الفنادق, برنامج حجوزات سياحية, إدارة الفنادق السعودية, نظام فندقي الإمارات, برنامج إدارة الشقق المفروشة'
    : 'hotel management software, property management system, PMS software, hotel booking software, vacation rental management, apartment management system, hotel reservation system, Arabic hotel PMS, hotel software Oman, property management UAE, Saudi Arabia hotel software, Middle East PMS, hospitality management software, hotel invoicing software, 5-year booking calendar, occupancy tracking software, room booking system, hotel analytics software, PWA hotel app';

  document.title = title;
  document.documentElement.lang = lang;
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';

  setMetaName('description', description);
  setMetaName('keywords', keywords);
  setMetaName('author', 'Hujuzatk');
  setMetaName('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

  // Open Graph
  setMetaProp('og:title', title);
  setMetaProp('og:description', description);
  setMetaProp('og:locale', isAr ? 'ar_AR' : 'en_US');
  setMetaProp('og:locale:alternate', isAr ? 'en_US' : 'ar_AR');
  setMetaProp('og:type', 'website');
  setMetaProp('og:url', 'https://hujuzatk.com');
  setMetaProp('og:site_name', 'Hujuzatk PMS');
  setMetaProp('og:image', 'https://hujuzatk.com/og-image.png');
  setMetaProp('og:image:width', '1200');
  setMetaProp('og:image:height', '630');
  setMetaProp('og:image:alt', isAr ? 'حجوزاتك – لوحة تحكم إدارة الفندق' : 'Hujuzatk PMS – Hotel Management Dashboard');

  // Twitter
  setMetaName('twitter:card', 'summary_large_image');
  setMetaName('twitter:title', title);
  setMetaName('twitter:description', description);
  setMetaName('twitter:image', 'https://hujuzatk.com/og-image.png');
  setMetaName('twitter:site', '@hujuzatk');

  // Canonical & hreflang
  setLinkRel('canonical', 'https://hujuzatk.com');

  // JSON-LD: SoftwareApplication
  setJsonLD('software', {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Hujuzatk PMS',
    alternateName: 'حجوزاتك - نظام إدارة الحجوزات',
    url: 'https://hujuzatk.com',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Hotel Management Software',
    operatingSystem: 'Web, Android, iOS (PWA)',
    inLanguage: ['en', 'ar'],
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '35',
      highPrice: '65',
      priceCurrency: 'USD',
      offerCount: '2',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
      description: isAr
        ? 'الخطة الأساسية 35$/سنة، الخطة المحترفة 65$/سنة مع مزامنة Airbnb وجاذبين وBooking.com. تجربة مجانية 14 يوم.'
        : 'Basic $35/year, Pro $65/year with Airbnb + Gathern + Booking.com channel sync. 14-day free trial included.',
    },
    featureList: isAr
      ? ['تقويم حجوزات 5 سنوات', 'فوترة PDF تلقائية', 'دعم العربية RTL', 'تحليلات مالية', 'تطبيق جوال قابل للتثبيت', 'تكامل قنوات (Airbnb / جاذبين / Booking.com)', 'إدارة متعددة المستأجرين', 'دعم متعدد العملات', 'إدارة الضيوف', 'تتبع الإشغال']
      : ['5-Year Booking Calendar', 'Automated PDF Invoicing', 'Arabic RTL Support', 'Financial Analytics', 'Installable Mobile Web App', 'Channel Integrations (Airbnb / Gathern / Booking.com)', 'Multi-tenant Architecture', 'Multi-currency Support', 'Guest Management', 'Occupancy Tracking'],
    screenshot: 'https://hujuzatk.com/og-image.png',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '28',
      bestRating: '5',
      worstRating: '1',
    },
    review: {
      '@type': 'Review',
      author: { '@type': 'Organization', name: isAr ? 'فندق صدى مكة' : 'Sada Makka Hotel' },
      reviewBody: isAr
        ? 'إدارة فندق في مكة المكرمة تعني ضغطاً عالياً وهامش خطأ صفري. حجوزاتك يتعامل مع مواسم الذروة بكفاءة تامة. الفوترة التلقائية وحدها كانت تستحق التحول.'
        : 'Running a hotel in Makkah means high traffic and zero margin for error. Hujuzatk handles our peak seasons flawlessly. The automated invoicing alone was worth the switch.',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
    },
  });

  // JSON-LD: FAQPage
  setJsonLD('faq', {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: isAr
      ? [
          { '@type': 'Question', name: 'ما هو نظام حجوزاتك PMS؟', acceptedAnswer: { '@type': 'Answer', text: 'حجوزاتك هو نظام إدارة الحجوزات والفنادق المبني على السحابة، مصمم للفنادق والشقق والإيجارات السياحية. يتميز بتقويم حجوزات لـ5 سنوات، وفوترة تلقائية، وتحليلات مالية، ودعم كامل للغة العربية والإنجليزية.' } },
          { '@type': 'Question', name: 'هل حجوزاتك يدعم اللغة العربية؟', acceptedAnswer: { '@type': 'Answer', text: 'نعم، يدعم حجوزاتك اللغة العربية بشكل كامل مع تخطيط RTL أصيل، وتنسيقات التواريخ العربية، وعملة OMR، وواجهة كاملة من اليمين إلى اليسار.' } },
          { '@type': 'Question', name: 'كم تكلفة حجوزاتك؟', acceptedAnswer: { '@type': 'Answer', text: 'نقدم خطتين: الأساسية 35$/سنة (عرض نهاية 2026، بدلاً من 40$)، والمحترفة 65$/سنة مع مزامنة تلقائية لـ Airbnb وجاذبين وBooking.com (عرض 58$ حتى نهاية 2026). تتوفر تجربة مجانية لمدة 14 يوماً بدون بطاقة ائتمان.' } },
          { '@type': 'Question', name: 'هل حجوزاتك متاح كتطبيق جوال؟', acceptedAnswer: { '@type': 'Answer', text: 'نعم. يتم تثبيت حجوزاتك على الشاشة الرئيسية لهاتفك بنقرة واحدة من المتصفح، ويعمل دون إنترنت، ويرسل إشعارات — دون الحاجة للتحميل من App Store أو Play Store.' } },
          { '@type': 'Question', name: 'ما الفرق بين نظام PMS السحابي والمحلي في حجوزاتك؟', acceptedAnswer: { '@type': 'Answer', text: 'حجوزاتك يدعم كلا الخيارين: التخزين المحلي عالي السرعة باستخدام Dexie DB للعمل دون إنترنت، والترقية إلى PostgreSQL السحابي عبر Supabase لمزامنة البيانات عبر الأجهزة.' } },
        ]
      : [
          { '@type': 'Question', name: 'What is Hujuzatk PMS?', acceptedAnswer: { '@type': 'Answer', text: 'Hujuzatk is a cloud-based Hotel and Property Management System (PMS) for hotels, apartments, and vacation rentals. It features a 5-year booking calendar, automated PDF invoicing, financial analytics, and native Arabic and English support.' } },
          { '@type': 'Question', name: 'Does Hujuzatk support Arabic?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Hujuzatk has native Arabic RTL support including Arabic date formats, OMR currency, and a complete right-to-left layout throughout the entire application.' } },
          { '@type': 'Question', name: 'How much does Hujuzatk cost?', acceptedAnswer: { '@type': 'Answer', text: 'Two plans: Basic at $35/year (year-end 2026 promo, normally $40) and Pro at $58/year with automatic Airbnb, Gathern, and Booking.com channel sync (year-end 2026 promo, normally $65). A 14-day free trial is included — no credit card required.' } },
          { '@type': 'Question', name: 'Is Hujuzatk available as a mobile app?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Hujuzatk installs to your phone\'s home screen from the browser in one tap — works offline, sends push notifications, no App Store or Play Store download needed.' } },
          { '@type': 'Question', name: 'What is the difference between local and cloud PMS in Hujuzatk?', acceptedAnswer: { '@type': 'Answer', text: 'Hujuzatk supports both: a high-speed local Dexie DB for offline-first operation, and a PostgreSQL cloud upgrade via Supabase for cross-device data sync.' } },
        ],
  });
}

// -------- detectLang --------

function detectLang(): Lang {
  const stored = localStorage.getItem('landing-lang');
  if (stored === 'en' || stored === 'ar' || stored === 'tr') return stored;
  if (navigator.language?.startsWith('ar')) return 'ar';
  if (navigator.language?.startsWith('tr')) return 'tr';
  return 'en';
}

export function LandingPage() {
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState('');
  const [lang, setLang] = useState<Lang>(detectLang);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; email: string; slug: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    authService.getCurrentUser().then((s) => {
      if (s) {
        const slug = encodeURIComponent((s.tenant.name || 'workspace').replace(/\s+/g, '-'));
        setLoggedInUser({ name: s.tenant.name || s.tenant.email, email: s.tenant.email, slug });
      }
    }).finally(() => setSessionResolved(true));
  }, []);

  // Promo popup — fires 10s after session hydration if:
  // (a) user is not logged in, (b) promo still active, (c) no recent dismissal
  useEffect(() => {
    if (!sessionResolved || loggedInUser || !isPromoActive()) return;
    try {
      const dismissedAt = localStorage.getItem(PROMO_DISMISS_KEY);
      if (dismissedAt) {
        const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / 86400000;
        if (daysSince < PROMO_DISMISS_COOLDOWN_DAYS) return;
      }
    } catch {}
    const timer = setTimeout(() => setShowPromo(true), 10_000);
    return () => clearTimeout(timer);
  }, [sessionResolved, loggedInUser]);

  const handlePromoStart = async (ws: string) => {
    setShowPromo(false);
    trackCTA('promo_start_workspace', 'popup');
    const name = ws.trim();
    if (!name) { navigate('/user?tab=register'); return; }
    const slug = name.replace(/\s+/g, '-');
    try {
      const exists = await authService.checkWorkspaceExists(slug);
      if (exists) navigate(`/${slug}`);
      else navigate(`/user?workspace=${encodeURIComponent(name)}&tab=register`);
    } catch {
      navigate(`/user?workspace=${encodeURIComponent(name)}&tab=register`);
    }
  };

  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
    localStorage.setItem('landing-lang', next);
  };
  const setLangTo = (l: Lang) => {
    setLang(l);
    localStorage.setItem('landing-lang', l);
  };

  const c = content[lang];

  const handleOpenWorkspace = async () => {
    if (!workspaceName.trim()) {
      trackCTA('get_started_empty', 'hero');
      navigate('/user?tab=register');
      return;
    }
    trackWorkspaceSearch(workspaceName.trim());
    const slug = workspaceName.trim().replace(/\s+/g, '-');
    try {
      const exists = await authService.checkWorkspaceExists(slug);
      if (exists) {
        navigate(`/${slug}`);
      } else {
        navigate(`/user?workspace=${encodeURIComponent(workspaceName)}&tab=register`);
      }
    } catch {
      navigate(`/user?workspace=${encodeURIComponent(workspaceName)}&tab=register`);
    }
  };

  useEffect(() => { applySEO(lang); }, [lang]);

  return (
    <div className={cn('min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900')} dir={c.dir}>
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl">
              <img src="/logo.svg" alt="Logo" style={{ width: 40, height: 40 }} />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">Hujuzatk</span>
          </div>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">{c.nav.features}</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">{c.nav.pricing}</a>
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative flex items-center">
              <Globe size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <select
                value={lang}
                onChange={(e) => setLangTo(e.target.value as Lang)}
                className="appearance-none pl-8 pr-6 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white cursor-pointer outline-none"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="tr">Türkçe</option>
              </select>
              <CaretDown size={10} weight="bold" className="absolute right-2 text-slate-400 pointer-events-none" />
            </div>
            {loggedInUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-black">
                    {loggedInUser.name[0]?.toUpperCase() || 'U'}
                  </div>
                  {loggedInUser.name}
                  <CaretDown size={12} weight="bold" className={cn('transition-transform', userMenuOpen && 'rotate-180')} />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 min-w-[200px]">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="font-bold text-sm text-slate-900">{loggedInUser.name}</div>
                        <div className="text-xs text-slate-400">{loggedInUser.email}</div>
                      </div>
                      <button
                        onClick={() => { navigate(`/${loggedInUser.slug}`); setUserMenuOpen(false); }}
                        className="w-full px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors text-left flex items-center gap-2"
                      >
                        <Sparkle size={16} weight="fill" />
                        {{ ar: 'لوحة التحكم', tr: 'Panele Git', en: 'Go to Dashboard' }[lang]}
                      </button>
                      <button
                        onClick={async () => {
                          await authService.logout();
                          setLoggedInUser(null);
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
                      >
                        {{ ar: 'تسجيل الخروج', tr: 'Çıkış', en: 'Logout' }[lang]}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => navigate('/user')} className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors">
                  {c.nav.login}
                </button>
                <button
                  onClick={() => { trackCTA('start_trial', 'nav'); navigate('/user?tab=register'); }}
                  className="group flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-600 active:scale-95"
                >
                  {c.nav.startTrial}
                  <ArrowRight size={16} className={cn('transition-transform group-hover:translate-x-1', lang === 'ar' && 'rotate-180')} />
                </button>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <List size={22} />}
          </button>
        </nav>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-1" dir={c.dir}>
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              {c.nav.features}
            </a>
            <a
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              {c.nav.pricing}
            </a>
            <div className="my-1 border-t border-slate-100" />
            {loggedInUser ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
                    {loggedInUser.name[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{loggedInUser.name}</div>
                    <div className="text-xs text-slate-400">{loggedInUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => { navigate(`/${loggedInUser.slug}`); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors text-start w-full"
                >
                  <Sparkle size={16} weight="fill" />
                  {{ ar: 'لوحة التحكم', tr: 'Panele Git', en: 'Go to Dashboard' }[lang]}
                </button>
                <button
                  onClick={async () => { await authService.logout(); setLoggedInUser(null); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-start w-full"
                >
                  {{ ar: 'تسجيل الخروج', tr: 'Çıkış', en: 'Logout' }[lang]}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate('/user'); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-start"
                >
                  {c.nav.login}
                </button>
              </>
            )}
            <Link
              to="/privacy"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {c.footer.privacy}
            </Link>
            <Link
              to="/terms"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {c.footer.terms}
            </Link>
            <div className="my-1 border-t border-slate-100" />
            <div className="relative flex items-center px-4 py-2">
              <Globe size={16} className="absolute left-7 text-slate-400 pointer-events-none" />
              <select
                value={lang}
                onChange={(e) => { setLangTo(e.target.value as Lang); setMenuOpen(false); }}
                className="appearance-none pl-10 pr-8 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 bg-white w-full cursor-pointer outline-none"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="tr">Türkçe</option>
              </select>
              <CaretDown size={12} weight="bold" className="absolute right-7 text-slate-400 pointer-events-none" />
            </div>
            {!loggedInUser && (
              <button
                onClick={() => { trackCTA('start_trial', 'mobile_menu'); navigate('/user?tab=register'); setMenuOpen(false); }}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white transition-all hover:bg-emerald-700 active:scale-95"
              >
                {c.nav.startTrial}
                <ArrowRight size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
              </button>
            )}
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-400 rounded-full blur-[100px]" />
          </div>
          <div className="container mx-auto px-6 text-center">
            <div className="mx-auto mb-8 flex max-w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/50 px-4 py-1.5 text-sm font-bold text-emerald-700 backdrop-blur-xs">
              <Sparkle size={16} weight="fill" />
              <span>{c.hero.badge}</span>
            </div>
            <h1 className="mx-auto max-w-5xl text-5xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-7xl lg:text-8xl">
              {c.hero.headline} <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent italic">{c.hero.italic}</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-600 sm:text-xl">{c.hero.sub}</p>
            <div className="mx-auto mt-12 max-w-2xl">
              <div className="group relative flex flex-col gap-3 rounded-[2rem] bg-white p-3 shadow-2xl shadow-slate-200 ring-1 ring-slate-200 sm:flex-row">
                <div className="relative flex-grow">
                  <div className={cn('absolute inset-y-0 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors', lang === 'ar' ? 'right-5' : 'left-5')}>
                    <Buildings size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder={c.hero.placeholder}
                    className={cn('w-full h-14 rounded-[1.5rem] border-0 bg-slate-50 text-lg font-semibold text-slate-900 ring-0 focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400', lang === 'ar' ? 'pr-14 pl-6' : 'pl-14 pr-6')}
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenWorkspace()}
                  />
                </div>
                <button
                  onClick={handleOpenWorkspace}
                  className="h-14 flex items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-600 px-10 text-lg font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-200 active:scale-95"
                >
                  {c.hero.cta} <ArrowRight size={20} weight="bold" className={lang === 'ar' ? 'rotate-180' : ''} />
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
                {c.hero.pills.map((p, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <Check size={18} weight="bold" className="text-emerald-500" /> {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Screenshots showcase */}
        <section className="bg-slate-900 py-24 lg:py-32 overflow-hidden">
          <div className="container mx-auto px-6">
            {/* Heading */}
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-white sm:text-5xl">{c.screenshots.heading}</h2>
              <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">{c.screenshots.sub}</p>
            </div>

            {/* Uniform 4-col grid — 1 col mobile */}
            <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-5">
              {[
                { src: '/screenshots/calendar.png', label: c.screenshots.labels.calendar, caption: c.screenshots.captions.calendar, dot: 'bg-emerald-500' },
                { src: '/screenshots/list.png',     label: c.screenshots.labels.list,     caption: c.screenshots.captions.list,     dot: 'bg-teal-500' },
                { src: '/screenshots/reports.png',  label: c.screenshots.labels.reports,  caption: c.screenshots.captions.reports,  dot: 'bg-amber-500' },
                { src: '/screenshots/settings.png', label: c.screenshots.labels.settings, caption: c.screenshots.captions.settings, dot: 'bg-blue-500' },
              ].map((s) => (
                <div key={s.src} className="group flex flex-col">
                  {/* macOS browser frame */}
                  <div className="rounded-xl overflow-hidden shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.7)]">
                    {/* Title bar */}
                    <div className="bg-[#2a2a2e]/90 backdrop-blur-xs px-3 py-2 flex items-center gap-3 border-b border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_4px_#ff5f57aa]" />
                        <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_4px_#febc2eaa]" />
                        <div className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_4px_#28c840aa]" />
                      </div>
                      <div className="flex-1 bg-[#3a3a3e]/70 rounded-md h-4 flex items-center justify-center">
                        <span className="text-[9px] text-slate-500 font-medium tracking-tight">hujuzatk.com</span>
                      </div>
                    </div>
                    {/* Screenshot */}
                    <img src={s.src} alt={s.label} className="w-full block" loading="lazy" />
                  </div>
                  <div className="mt-3 flex items-start gap-2 px-1">
                    <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', s.dot)} />
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{s.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.caption}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-white py-32 relative overflow-hidden">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-emerald-50 rounded-full blur-[100px] -z-10" />
          <div className="container mx-auto px-6">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{c.features.heading}</h2>
              <p className="mt-6 text-xl leading-relaxed text-slate-600">{c.features.sub}</p>
            </div>
            <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {c.features.items.map((feature, i) => {
                const Icon = FEATURE_ICONS[i];
                return (
                  <div key={i} className="group flex flex-col items-start transition-all">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl mb-6 shadow-sm', i % 2 === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
                      <Icon size={24} weight="duotone" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900">{feature.title}</h3>
                    <p className="mt-4 text-lg leading-relaxed text-slate-500">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="bg-slate-900 py-32 text-white">
          <div className="container mx-auto px-6">
            {/* Security stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-24">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-400 mb-8">
                  <ShieldCheck size={18} weight="fill" /> {c.trust.badge}
                </div>
                <h2 className="text-4xl font-black leading-tight sm:text-6xl">{c.trust.heading}</h2>
                <p className="mt-8 text-xl text-slate-400 leading-relaxed">{c.trust.sub}</p>
                <div className="mt-12 flex gap-12">
                  <div>
                    <p className="text-4xl font-black text-white">99.9%</p>
                    <p className="mt-1 text-slate-500 uppercase text-xs font-bold tracking-widest">{c.trust.uptime}</p>
                  </div>
                  <div>
                    <p className="text-4xl font-black text-white">0ms</p>
                    <p className="mt-1 text-slate-500 uppercase text-xs font-bold tracking-widest">{c.trust.latency}</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block" />
            </div>

            {/* Testimonials */}
            <div>
              <p className="text-center text-sm font-bold uppercase tracking-widest text-emerald-400 mb-12">{c.trust.testimonialsHeading}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {c.trust.testimonials.map((t, i) => (
                  <div key={i} className="rounded-2xl bg-slate-800 border border-slate-700 p-8 flex flex-col gap-6 hover:border-emerald-500/40 transition-colors">
                    <div className="flex gap-1 text-emerald-400">
                      {[...Array(5)].map((_, j) => <Star key={j} size={16} weight="fill" />)}
                    </div>
                    <p className="text-base leading-relaxed text-slate-300 italic flex-1">"{t.quote}"</p>
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                      <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                        {t.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{t.author}</p>
                        <p className="text-xs text-slate-500 truncate">{t.role}</p>
                        <p className="text-xs text-emerald-500 mt-0.5">{t.phone}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing — two plans */}
        <section id="pricing" className="py-32 bg-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-black text-slate-900 sm:text-6xl">{c.pricing.heading}</h2>
            <p className="mt-6 text-xl text-slate-500 max-w-2xl mx-auto">{c.pricing.sub}</p>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {c.pricing.plans.map((plan) => {
                const planData = plan.id === 'pro' ? PLAN_PRO : PLAN_BASIC;
                const promoOn = isPromoActive();
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative rounded-[2.5rem] border p-2 bg-white shadow-xl transition-all',
                      plan.recommended ? 'border-emerald-400 ring-2 ring-emerald-500' : 'border-slate-200'
                    )}
                  >
                    {plan.recommended && (
                      <div className={cn(
                        'absolute -top-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full',
                        c.dir === 'rtl' ? 'right-6' : 'left-6'
                      )}>
                        {c.pricing.recommended}
                      </div>
                    )}
                    <div className="rounded-[2rem] bg-slate-50 p-10 text-start">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600">{plan.name}</p>
                          <p className="text-sm text-slate-500 mt-1">{plan.tagline}</p>
                        </div>
                        {promoOn && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full whitespace-nowrap">
                            {c.pricing.save}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 my-6" dir="ltr">
                        {promoOn && (
                          <span className="text-lg text-slate-400 line-through font-bold">
                            {c.pricing.was} {CURRENCY_SYMBOL}{planData.oldPrice}
                          </span>
                        )}
                        <span className="text-6xl font-black text-slate-900">
                          {CURRENCY_SYMBOL}{promoOn ? planData.newPrice : planData.oldPrice}
                        </span>
                        <span className="text-lg font-bold text-slate-400">{c.pricing.perYear}</span>
                      </div>
                      <ul className="space-y-3">
                        {plan.features.map((li, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Check size={12} weight="bold" />
                            </div>
                            <span>{li}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => { trackCTA(`start_trial_${plan.id}`, 'pricing'); navigate(`/user?tab=register&plan=${plan.id}`); }}
                        className={cn(
                          'mt-8 w-full rounded-2xl py-4 text-base font-black transition-all active:scale-[0.98]',
                          plan.recommended
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        )}
                      >
                        {plan.cta}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-8 text-sm font-medium text-slate-400">{c.pricing.note}</p>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl">
                  <img src="/logo.svg" alt="Logo" style={{ width: 40, height: 40 }} />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">Hujuzatk</span>
              </div>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">{c.footer.tagline}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-sm font-bold uppercase tracking-widest">
              <div className="flex flex-col gap-4">
                <span className="text-slate-900">{c.footer.legal}</span>
                <Link to="/privacy" className="text-slate-400 hover:text-emerald-600 transition-colors">{c.footer.privacy}</Link>
                <Link to="/terms" className="text-slate-400 hover:text-emerald-600 transition-colors">{c.footer.terms}</Link>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-slate-900">{c.footer.support}</span>
                <a
                  href="https://wa.me/905523205496"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full text-sm font-black transition-all shadow-lg shadow-emerald-200 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.634 1.432h.006c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  {c.footer.whatsapp}
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-200 pt-12 flex flex-col md:flex-row justify-between text-sm font-medium text-slate-400 items-center gap-6">
            <p>{c.footer.rights}</p>
            <div className="flex items-center gap-4">
              <Globe size={16} />
              <span>{c.footer.location}</span>
            </div>
          </div>
        </div>
      </footer>

      {showPromo && !loggedInUser && (
        <PromoPopup
          lang={lang}
          strings={{
            title: c.pricing.promo.title,
            subtitle: c.pricing.promo.subtitle,
            placeholder: c.pricing.promo.placeholder,
            cta: c.pricing.promo.cta,
            perYear: c.pricing.perYear,
            was: c.pricing.was,
            save: c.pricing.save,
            recommended: c.pricing.recommended,
            basic: { id: 'basic', name: c.pricing.plans[0].name, tagline: c.pricing.plans[0].tagline, recommended: false },
            pro:   { id: 'pro',   name: c.pricing.plans[1].name, tagline: c.pricing.plans[1].tagline, recommended: true  },
          }}
          onStart={handlePromoStart}
        />
      )}
    </div>
  );
}

export function PrivacyPolicy() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const isAr = lang === 'ar';

  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
    localStorage.setItem('landing-lang', next);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-900">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
          <button onClick={cycleLang} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Globe size={14} /> {{ en: 'العربية', ar: 'Türkçe', tr: 'English' }[lang]}
          </button>
        </div>
        <p className="mb-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">{isAr ? `آخر تحديث: ${new Date().toLocaleDateString('ar')}` : `Last updated: ${new Date().toLocaleDateString()}`}</p>
        <section className="space-y-6 text-slate-700 leading-relaxed">
          {isAr ? (
            <>
              <p>في حجوزاتك، نأخذ خصوصيتك بجدية. تصف هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها.</p>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">١. جمع البيانات</h2>
                <p>نجمع المعلومات التي تقدمها مباشرة عند إنشاء حساب، مثل اسمك وبريدك الإلكتروني وتفاصيل العقار. جميع بيانات الحجز مخزنة بأمان ومعزولة لكل مستأجر.</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">٢. استخدام البيانات</h2>
                <p>تُستخدم بياناتك فقط لتقديم خدمة حجوزاتك وتحسينها. لا نبيع معلوماتك الشخصية أو بيانات حجزك لأطراف ثالثة.</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">٣. الأمان</h2>
                <p>نطبق معايير أمان عالية المستوى لحماية بياناتك. للمستخدمين السحابيين، البيانات مشفرة في السكون وأثناء النقل.</p>
              </div>
            </>
          ) : (
            <>
              <p>At Hujuzatk, we take your privacy seriously. This policy describes how we collect, use, and protect your data.</p>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">1. Data Collection</h2>
                <p>We collect information you provide directly to us when you create an account, such as your name, email address, and property details. All booking data is stored securely and is isolated per tenant.</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">2. Data Usage</h2>
                <p>Your data is used solely to provide and improve the Hujuzatk service. We do not sell your personal information or booking data to third parties.</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">3. Security</h2>
                <p>We implement industry-standard security measures to protect your data. For PostgreSQL cloud users, data is encrypted at rest and in transit via Supabase/PostgreSQL protocols.</p>
              </div>
            </>
          )}
        </section>
        <div className="mt-12 pt-8 border-t border-slate-100">
          <Link to="/" className="text-emerald-600 font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2">
            {isAr ? '→ العودة للرئيسية' : '← Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TermsOfService() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const isAr = lang === 'ar';

  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
    localStorage.setItem('landing-lang', next);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-900">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">{isAr ? 'شروط الخدمة' : 'Terms of Service'}</h1>
          <button onClick={cycleLang} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Globe size={14} /> {{ en: 'العربية', ar: 'Türkçe', tr: 'English' }[lang]}
          </button>
        </div>
        <p className="mb-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">{isAr ? `آخر تحديث: ${new Date().toLocaleDateString('ar')}` : `Last updated: ${new Date().toLocaleDateString()}`}</p>
        <section className="space-y-6 text-slate-700 leading-relaxed">
          {isAr ? (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">١. قبول الشروط</h2>
                <p>بالوصول إلى حجوزاتك، توافق على الالتزام بهذه الشروط. خدمتنا مقدمة "كما هي" و"كما هو متاح".</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">٢. الاشتراك والتجارب</h2>
                <p>تحصل الحسابات الجديدة على فترة تجريبية مجانية لمدة 14 يومًا. بعد التجربة، يتطلب الاستمرار في الوصول اشتراكًا فعّالًا يديره مسؤول النظام.</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">٣. مسؤولية المستخدم</h2>
                <p>المستخدمون مسؤولون عن الحفاظ على سرية بيانات تسجيل الدخول وعن جميع الأنشطة التي تتم تحت مساحة عملهم.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">1. Acceptance of Terms</h2>
                <p>By accessing Hujuzatk, you agree to be bound by these terms. Our service is provided "as is" and "as available".</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">2. Subscription & Trials</h2>
                <p>New accounts receive a 14-day free trial. After the trial, continued access requires an active subscription managed by the system administrator.</p>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-2">3. User Responsibility</h2>
                <p>Users are responsible for maintaining the confidentiality of their login credentials and for all activities that occur under their workspace.</p>
              </div>
            </>
          )}
        </section>
        <div className="mt-12 pt-8 border-t border-slate-100">
          <Link to="/" className="text-emerald-600 font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2">
            {isAr ? '→ العودة للرئيسية' : '← Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
