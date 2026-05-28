import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, FileText, Globe, ChartBar, DeviceMobile, Receipt, CaretDown,
  ArrowRight, Check, Sparkle, List, X, Play, Pause,
  ArrowsClockwise, Wallet,
} from 'phosphor-react';
import { authService } from '../lib/authService';
import { trackCTA, trackWorkspaceSearch, trackLanguageChange } from '../lib/analytics';
import { cn } from '../utils/cn';
import PromoPopup from '../components/PromoPopup';
import {
  isPromoActive, PROMO_DISMISS_KEY, PROMO_DISMISS_COOLDOWN_DAYS,
  CURRENCY_SYMBOL,
} from '../lib/promoConfig';

type Lang = 'en' | 'ar' | 'tr';

// =====================================================================
// i18n content
// =====================================================================
const content = {
  en: {
    dir: 'ltr' as const,
    nav: { features: 'Features', pricing: 'Pricing', login: 'Sign in', signup: 'Start free' },
    hero: {
      eyebrow: 'Built for chalet, apartment and guesthouse owners in Saudi Arabia and the Gulf',
      title1: 'Run your properties',
      mark: 'from one calendar',
      subtitle: 'Track bookings, send Arabic invoices, log expenses, and see real revenue per room — on any phone. Sync Airbnb, Booking.com and Gathern when you\'re ready.',
      cta: 'Start free — no card needed',
      cta2: 'Watch 60-second tour',
      trust: 'For chalets, apartments, guesthouses and serviced rentals across Saudi Arabia and the Gulf',
    },
    logos: { intro: 'Integrates with major platforms', items: ['Airbnb', 'Booking.com', 'Gathern'] },
    features: {
      eyebrow: 'Powerful features',
      title: 'Everything you need in one place',
      subtitle: 'From calendar management to financial intelligence, Hujuzatk brings every property tool into one fast app.',
    },
    f: [
      { tag: '01', title: 'Infinite 3-year calendar', desc: 'Our optimized grid lets you scroll through 3 years of bookings with zero lag. Plan peak seasons years ahead.', color: 'green' },
      { tag: '02', title: 'Smart invoicing', desc: 'Automatic calculation of nights, discounts, and deposits. Generate clean printable invoices in Arabic or English instantly.', color: 'amber' },
      { tag: '03', title: 'Full Arabic & RTL support', desc: 'Not just a translation — a fully localized experience. Pixel-perfect RTL layouts with regional date formats and currencies built in.', color: 'blue' },
      { tag: '04', title: 'Financial intelligence', desc: 'Advanced reports by stay date or booking date. Visualize occupancy rates and revenue per room at a glance.', color: 'green' },
      { tag: '06', title: 'Installable mobile app', desc: 'Pin Hujuzatk to your home screen with one tap — works offline, sends push notifications, no App Store or Play Store needed.', color: 'purple' },
      { tag: '07', title: 'Automatic channel sync', desc: 'Nightly and on-demand sync for Airbnb, Gathern, and Booking.com calendars. New bookings appear automatically — no copy-paste.', color: 'coral' },
      { tag: '05', title: 'Expense tracking', desc: 'Log property expenses by room or category — maintenance, cleaning, utilities. Monthly and yearly reports reveal your true margin.', color: 'amber' },
    ],
    badges: {
      cal:    { title: '3-year calendar', sub: 'Scroll instantly, no lag' },
      inv:    { title: 'Smart invoicing', sub: '5 nights × SAR 250 = SAR 1,250' },
      sync:   { title: 'Airbnb sync', sub: 'Synced 12s ago' },
      rev:    { title: 'Monthly revenue', big: 'SAR 28,450', delta: '↑ 18% vs last month' },
      rtl:    { title: 'Arabic & RTL', sub: 'Truly localized' },
      install:{ title: 'Add to home screen', sub: 'No app store needed' },
    },
    testimonial: {
      quote: 'I used to spend hours copying bookings between Airbnb and my spreadsheet. With Hujuzatk, sync is automatic — I save 10+ hours every week.',
      name: 'Ahmed Al-Abdali',
      role: 'Owner of 8 chalets — Riyadh',
    },
    pricing: {
      eyebrow: 'Simple pricing',
      title: 'A plan for every size of business',
      subtitle: 'Every plan starts with 14 days free. No credit card needed.',
      perYear: '/yr',
      was: 'was',
      save: '15% OFF',
      recommended: 'MOST POPULAR',
      note: 'Cancel anytime. No long-term contracts.',
      promo: {
        title: 'Launch pricing',
        subtitle: 'Early-customer rates. Start your trial today and secure this price.',
      },
      plans: [
        {
          id: 'basic', name: 'Basic', price: 40, oldPrice: 50,
          tagline: 'Perfect for small properties — no channel sync',
          features: ['10 Rooms', 'Full Reporting Suite', 'Expense Tracking', 'Multi-Language (AR/EN/TR)', 'Installable App', '3-Year Calendar'],
          cta: 'Start Free Trial', recommended: false,
        },
        {
          id: 'pro', name: 'Pro', price: 90, oldPrice: 100,
          tagline: 'Basic + automatic channel sync',
          features: ['30 Rooms', 'Auto-Sync Airbnb', 'Auto-Sync Gathern', 'Auto-Sync Booking.com', 'Nightly automated sync', 'Priority support'],
          cta: 'Start Free Trial', recommended: true,
        },
        {
          id: 'enterprise', name: 'Enterprise', price: 140, oldPrice: 150,
          tagline: 'Unlimited rooms + dedicated support',
          features: ['Unlimited Rooms', 'All Pro features', 'Dedicated WhatsApp support', 'Custom onboarding', 'SLA-backed uptime'],
          cta: 'Contact Sales', recommended: false,
        },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions, answered',
      items: [
        { q: 'What happens when my 14-day trial ends?', a: 'We email you 2 days before. If you don\'t pick a plan, your account pauses — your data stays safe and you can resume anytime.' },
        { q: 'Do I need a credit card to start?', a: 'No. Start your trial with just your email. Add billing only when you decide to continue.' },
        { q: 'Can I import my existing bookings?', a: 'Yes. Upload a CSV or paste your current bookings — we\'ll match rooms automatically. Pro users can also sync Airbnb, Booking.com and Gathern in one click.' },
        { q: 'What if I don\'t use Airbnb or Booking.com?', a: 'That\'s most of our customers. Use Hujuzatk for direct bookings, WhatsApp leads and walk-ins — channel sync is there when you want it, on the Pro plan.' },
        { q: 'Where is my data stored — is it safe?', a: 'Your data lives on secure servers with encryption at rest and in transit. We never sell or share it. You can export everything anytime.' },
        { q: 'Can I cancel anytime?', a: 'Yes. One click in your account settings — no calls, no questions. We don\'t do long-term contracts.' },
      ],
    },
    cta: {
      title: 'Ready to simplify your bookings?',
      desc: 'Start a 14-day free trial. No credit card required.',
      button: 'Get started',
      button2: 'Talk to us',
    },
    footer: {
      tagline: 'The world\'s most intuitive Booking Management System for modern hosts and professional property managers.',
      product: 'Product', company: 'Company', legal: 'Legal', support: 'Support',
      productLinks: ['Features', 'Pricing', 'Integrations', 'Mobile app'],
      companyLinks: ['About', 'Story', 'Contact'],
      legalLinks: ['Privacy', 'Terms'],
      whatsapp: 'WhatsApp Support',
      rights: `© ${new Date().getFullYear()} Hujuzatk PMS. All rights reserved.`,
      location: 'Istanbul · Türkiye · Worldwide',
    },
    video: { playing: 'playing', step: (i: number, n: number) => `Step ${i} / ${n}` },
    workspaceCheck: 'Have a workspace? Enter its name:',
    workspacePh: 'your-workspace',
    open: 'Open',
  },

  ar: {
    dir: 'rtl' as const,
    nav: { features: 'المميزات', pricing: 'الأسعار', login: 'تسجيل الدخول', signup: 'ابدأ مجاناً' },
    hero: {
      eyebrow: 'مصمَّم لملّاك الشاليهات والشقق والاستراحات في السعودية والخليج',
      title1: 'أدر عقاراتك',
      mark: 'من تقويم واحد',
      subtitle: 'تابع الحجوزات، أصدر فواتير عربية، سجّل المصروفات، واطّلع على إيرادات كل غرفة — من أي هاتف. اربط Airbnb وBooking.com وجاذبين عند الحاجة.',
      cta: 'ابدأ مجاناً — بدون بطاقة',
      cta2: 'شاهد جولة 60 ثانية',
      trust: 'لإدارة الشاليهات والشقق والاستراحات والوحدات المخدومة في السعودية والخليج',
    },
    logos: { intro: 'نتكامل مع المنصات الكبرى', items: ['Airbnb', 'Booking.com', 'جاذبين'] },
    features: {
      eyebrow: 'مميزات قوية',
      title: 'كل ما تحتاجه في مكان واحد',
      subtitle: 'من إدارة التقويم إلى التحليلات المالية، حجوزاتك تجمع كل أدوات إدارة العقار في تطبيق واحد سريع.',
    },
    f: [
      { tag: '٠١', title: 'تقويم 3 سنوات لا نهائي', desc: 'شبكتنا المُحسَّنة تتيح لك التمرير خلال 3 سنوات من الحجوزات دون أي تأخير. خطط لمواسم الذروة سنوات مسبقاً.', color: 'green' },
      { tag: '٠٢', title: 'فوترة ذكية', desc: 'حساب تلقائي للليالي والخصومات والعربون. أنشئ فواتير نظيفة وقابلة للطباعة باللغة العربية أو الإنجليزية فوراً.', color: 'amber' },
      { tag: '٠٣', title: 'دعم كامل للعربية وRTL', desc: 'ليس مجرد ترجمة، بل تجربة محلية كاملة. تخطيطات RTL مثالية مع تنسيقات تواريخ إقليمية وعملات مدمجة.', color: 'blue' },
      { tag: '٠٤', title: 'ذكاء مالي', desc: 'تقارير متقدمة حسب تاريخ الإقامة أو تاريخ الإنشاء. تصور معدلات الإشغال والإيرادات لكل غرفة.', color: 'green' },
      { tag: '٠٦', title: 'تطبيق جوال قابل للتثبيت', desc: 'ثبّت حجوزاتك على شاشتك الرئيسية بنقرة واحدة — يعمل بدون إنترنت، ويرسل إشعارات، بدون الحاجة لتحميل من المتاجر.', color: 'purple' },
      { tag: '٠٧', title: 'مزامنة تلقائية للقنوات', desc: 'مزامنة ليلية وعند الطلب لتقويم Airbnb وجاذبين وBooking.com. الحجوزات الجديدة تظهر تلقائياً — دون أي نسخ ولصق.', color: 'coral' },
      { tag: '٠٥', title: 'تتبع المصروفات', desc: 'سجّل نفقات العقار حسب الغرفة أو الفئة — صيانة، تنظيف، مرافق. تقارير شهرية وسنوية تكشف هامش الربح الحقيقي.', color: 'amber' },
    ],
    badges: {
      cal:    { title: 'تقويم 3 سنوات', sub: 'تمرير فوري بدون تأخير' },
      inv:    { title: 'فوترة ذكية', sub: '5 ليالٍ × ﷼ 250 = ﷼ 1,250' },
      sync:   { title: 'مزامنة Airbnb', sub: 'متزامن منذ 12 ث' },
      rev:    { title: 'إيرادات الشهر', big: '﷼ 28,450', delta: '↑ 18% عن الشهر السابق' },
      rtl:    { title: 'عربية و RTL', sub: 'تجربة محلية كاملة' },
      install:{ title: 'ثبّت على الشاشة', sub: 'بدون متجر تطبيقات' },
    },
    testimonial: {
      quote: 'كنت أقضي ساعات أنسخ الحجوزات بين Airbnb وجدولي. مع حجوزاتك، تتم المزامنة تلقائياً — وفّرت أكثر من 10 ساعات أسبوعياً.',
      name: 'أحمد العبدلي',
      role: 'مالك 8 شاليهات — الرياض',
    },
    pricing: {
      eyebrow: 'أسعار بسيطة',
      title: 'خطة لكل حجم نشاط',
      subtitle: 'كل خطة تبدأ بـ 14 يوماً مجاناً. بدون بطاقة ائتمان.',
      perYear: '/سنة',
      was: 'كان',
      save: 'خصم 15%',
      recommended: 'الأكثر شعبية',
      note: 'إلغاء في أي وقت. لا عقود ملزمة.',
      promo: {
        title: 'أسعار الإطلاق',
        subtitle: 'سعر العملاء الأوائل. ابدأ تجربتك اليوم واحجز هذا السعر.',
      },
      plans: [
        {
          id: 'basic', name: 'أساسي', price: 40, oldPrice: 50,
          tagline: 'مثالي للعقارات الصغيرة — بدون مزامنة القنوات',
          features: ['10 غرف', 'مجموعة تقارير كاملة', 'تتبع المصروفات', 'متعدد اللغات (AR/EN/TR)', 'تطبيق قابل للتثبيت', 'تقويم 3 سنوات'],
          cta: 'ابدأ التجربة المجانية', recommended: false,
        },
        {
          id: 'pro', name: 'المحترف', price: 90, oldPrice: 100,
          tagline: 'الأساسي + مزامنة القنوات التلقائية',
          features: ['30 غرفة', 'مزامنة Airbnb تلقائية', 'مزامنة جاذبين تلقائية', 'مزامنة Booking.com تلقائية', 'مزامنة ليلية مجدولة', 'دعم أولوية'],
          cta: 'ابدأ التجربة المجانية', recommended: true,
        },
        {
          id: 'enterprise', name: 'مؤسسات', price: 140, oldPrice: 150,
          tagline: 'غرف غير محدودة + دعم مخصص',
          features: ['غرف غير محدودة', 'كل ميزات المحترف', 'دعم واتساب مخصص', 'إعداد مخصص', 'ضمان الأداء'],
          cta: 'تواصل مع المبيعات', recommended: false,
        },
      ],
    },
    faq: {
      eyebrow: 'الأسئلة الشائعة',
      title: 'إجابات على أكثر الأسئلة',
      items: [
        { q: 'ماذا يحدث بعد انتهاء فترة التجربة 14 يوماً؟', a: 'نرسل لك بريداً قبل يومين. إذا لم تختر خطة، يتوقف حسابك مؤقتاً — بياناتك تبقى آمنة ويمكنك الاستئناف في أي وقت.' },
        { q: 'هل أحتاج بطاقة ائتمان للبدء؟', a: 'لا. ابدأ تجربتك بإيميلك فقط. أضف بيانات الدفع عندما تقرر الاستمرار.' },
        { q: 'هل يمكنني استيراد حجوزاتي الحالية؟', a: 'نعم. ارفع ملف CSV أو ألصق حجوزاتك الحالية — نطابق الغرف تلقائياً. مستخدمو خطة المحترف يربطون Airbnb و Booking.com وجاذبين بنقرة واحدة.' },
        { q: 'ماذا لو كنت لا أستخدم Airbnb أو Booking.com؟', a: 'هذا حال معظم عملائنا. استخدم حجوزاتك للحجوزات المباشرة وواتساب والزبائن الحضوريين — مزامنة القنوات متاحة عند الحاجة في خطة المحترف.' },
        { q: 'أين تُحفظ بياناتي — هل هي آمنة؟', a: 'بياناتك على خوادم آمنة بتشفير كامل أثناء النقل والتخزين. لا نبيعها أو نشاركها أبداً. يمكنك تصدير كل شيء في أي وقت.' },
        { q: 'هل يمكنني الإلغاء في أي وقت؟', a: 'نعم. نقرة واحدة من إعدادات حسابك — بدون مكالمات أو أسئلة. لا توجد عقود ملزمة.' },
      ],
    },
    cta: {
      title: 'جاهز لتبسيط حجوزاتك؟',
      desc: 'ابدأ تجربة 14 يوم مجاناً. لا حاجة لبطاقة ائتمان.',
      button: 'ابدأ الآن',
      button2: 'تحدث معنا',
    },
    footer: {
      tagline: 'نظام إدارة الحجوزات الأكثر سهولة في العالم للمضيفين المعاصرين ومديري الحجوزات المحترفين.',
      product: 'المنتج', company: 'الشركة', legal: 'قانوني', support: 'الدعم',
      productLinks: ['المميزات', 'الأسعار', 'تكاملات', 'تطبيق الجوال'],
      companyLinks: ['من نحن', 'قصتنا', 'تواصل'],
      legalLinks: ['الخصوصية', 'الشروط'],
      whatsapp: 'دعم واتساب',
      rights: `© ${new Date().getFullYear()} حجوزاتك PMS. جميع الحقوق محفوظة.`,
      location: 'إسطنبول · تركيا · دولي',
    },
    video: { playing: 'تشغيل', step: (i: number, n: number) => `الخطوة ${i} / ${n}` },
    workspaceCheck: 'لديك مساحة عمل؟ أدخل اسمها:',
    workspacePh: 'مساحة-العمل',
    open: 'فتح',
  },

  tr: {
    dir: 'ltr' as const,
    nav: { features: 'Özellikler', pricing: 'Fiyatlar', login: 'Giriş Yap', signup: 'Ücretsiz Başla' },
    hero: {
      eyebrow: 'Körfez bölgesindeki şale, daire ve pansiyon sahipleri için tasarlandı',
      title1: 'Mülklerinizi',
      mark: 'tek takvimden yönetin',
      subtitle: 'Rezervasyonları takip edin, Arapça faturalar gönderin, giderleri kaydedin ve oda başına gerçek geliri görün — her telefonda. Hazır olduğunuzda Airbnb, Booking.com ve Gathern\'i senkronize edin.',
      cta: 'Ücretsiz başla — kart gerekmez',
      cta2: '60 saniyelik turu izle',
      trust: 'Suudi Arabistan ve Körfez bölgesindeki şale, daire, pansiyon ve hizmet kiraları için',
    },
    logos: { intro: 'Büyük platformlarla entegre çalışır', items: ['Airbnb', 'Booking.com', 'Gathern'] },
    features: {
      eyebrow: 'Güçlü özellikler',
      title: 'İhtiyacınız olan her şey tek yerde',
      subtitle: 'Takvim yönetiminden finansal zekaya kadar, Hujuzatk her mülk aracını tek bir hızlı uygulamaya getiriyor.',
    },
    f: [
      { tag: '01', title: 'Sonsuz 3 yıllık takvim', desc: 'Optimize edilmiş ızgaramız 3 yıllık rezervasyonları sıfır gecikmeyle kaydırmanıza olanak tanır. Yoğun sezonları yıllar öncesinden planlayın.', color: 'green' },
      { tag: '02', title: 'Akıllı faturalandırma', desc: 'Geceler, indirimler ve depozitolar otomatik hesaplanır. Arapça veya İngilizce temiz yazdırılabilir faturalar anında oluşturun.', color: 'amber' },
      { tag: '03', title: 'Tam Arapça ve RTL desteği', desc: 'Sadece çeviri değil — tamamen yerelleştirilmiş bir deneyim. Bölgesel tarih biçimleri ve para birimleriyle piksel mükemmel RTL düzenleri.', color: 'blue' },
      { tag: '04', title: 'Finansal zeka', desc: 'Konaklama tarihine veya rezervasyon tarihine göre gelişmiş raporlar. Doluluk oranlarını ve oda başına geliri bir bakışta görselleştirin.', color: 'green' },
      { tag: '06', title: 'Kurulabilir mobil uygulama', desc: 'Hujuzatk\'ı tek dokunuşla ana ekrana sabitleyin — çevrimdışı çalışır, bildirim gönderir, App Store veya Play Store gerekmez.', color: 'purple' },
      { tag: '07', title: 'Otomatik kanal senkronizasyonu', desc: 'Airbnb, Gathern ve Booking.com takvimleri için gecelik ve isteğe bağlı senkronizasyon. Yeni rezervasyonlar otomatik olarak görünür.', color: 'coral' },
      { tag: '05', title: 'Gider takibi', desc: 'Mülk giderlerini odaya veya kategoriye göre kaydedin — bakım, temizlik, faturalar. Aylık ve yıllık raporlar gerçek marjınızı ortaya çıkarır.', color: 'amber' },
    ],
    badges: {
      cal:    { title: '3 yıllık takvim', sub: 'Anında kaydırma' },
      inv:    { title: 'Akıllı faturalandırma', sub: '5 gece × ₺ 250 = ₺ 1,250' },
      sync:   { title: 'Airbnb senkron', sub: '12 sn önce senkronize' },
      rev:    { title: 'Aylık gelir', big: '₺ 28,450', delta: '↑ %18 geçen aya göre' },
      rtl:    { title: 'Arapça & RTL', sub: 'Gerçekten yerelleştirilmiş' },
      install:{ title: 'Ana ekrana ekle', sub: 'Uygulama mağazası gerekmez' },
    },
    testimonial: {
      quote: 'Airbnb ile elektronik tabloyu eşitlemek için saatler harcardım. Hujuzatk ile senkronizasyon otomatik — haftada 10+ saat tasarruf ediyorum.',
      name: 'Ahmed Al-Abdali',
      role: '8 şale sahibi — Riyad',
    },
    pricing: {
      eyebrow: 'Basit fiyatlandırma',
      title: 'Her işletme boyutuna uygun bir plan',
      subtitle: 'Her plan 14 gün ücretsiz başlar. Kart gerekmez.',
      perYear: '/yıl',
      was: 'Eski',
      save: '%15 İNDİRİM',
      recommended: 'EN POPÜLER',
      note: 'İstediğiniz zaman iptal edin. Uzun vadeli sözleşmeler yok.',
      promo: {
        title: 'Lansman fiyatları',
        subtitle: 'İlk müşteri fiyatlandırması. Denemenize bugün başlayın ve bu fiyatı sabitleyin.',
      },
      plans: [
        {
          id: 'basic', name: 'Temel', price: 40, oldPrice: 50,
          tagline: 'Küçük mülkler için ideal — kanal senkronu yok',
          features: ['10 Oda', 'Tam Raporlama', 'Gider Takibi', 'Çoklu Dil (AR/EN/TR)', 'Kurulabilir Uygulama', '3 Yıllık Takvim'],
          cta: 'Ücretsiz Denemeye Başla', recommended: false,
        },
        {
          id: 'pro', name: 'Pro', price: 90, oldPrice: 100,
          tagline: 'Temel + otomatik kanal senkronu',
          features: ['30 Oda', 'Airbnb Otomatik Senkron', 'Gathern Otomatik Senkron', 'Booking.com Otomatik Senkron', 'Gecelik otomatik senkron', 'Öncelikli destek'],
          cta: 'Ücretsiz Denemeye Başla', recommended: true,
        },
        {
          id: 'enterprise', name: 'Kurumsal', price: 140, oldPrice: 150,
          tagline: 'Sınırsız oda + özel destek',
          features: ['Sınırsız Oda', 'Tüm Pro özellikleri', 'Özel WhatsApp desteği', 'Özel kurulum', 'SLA destekli çalışma süresi'],
          cta: 'Satışla İletişime Geç', recommended: false,
        },
      ],
    },
    faq: {
      eyebrow: 'SSS',
      title: 'Sıkça sorulan sorular',
      items: [
        { q: '14 günlük denemem bittiğinde ne olur?', a: 'Bitmesinden 2 gün önce e-posta gönderiyoruz. Plan seçmezseniz hesabınız duraklatılır — verileriniz güvende kalır ve istediğiniz zaman devam edebilirsiniz.' },
        { q: 'Başlamak için kredi kartı gerekli mi?', a: 'Hayır. Sadece e-postanızla denemenize başlayın. Ödeme bilgilerini devam etmeye karar verdiğinizde eklersiniz.' },
        { q: 'Mevcut rezervasyonlarımı içe aktarabilir miyim?', a: 'Evet. CSV yükleyin veya mevcut rezervasyonlarınızı yapıştırın — odaları otomatik eşleştiririz. Pro kullanıcılar Airbnb, Booking.com ve Gathern\'i tek tıkla senkronize edebilir.' },
        { q: 'Airbnb veya Booking.com kullanmıyorsam?', a: 'Müşterilerimizin çoğu kullanmıyor. Doğrudan rezervasyonlar, WhatsApp ve gelen müşteriler için Hujuzatk\'ı kullanın — kanal senkronu Pro planda hazır.' },
        { q: 'Verilerim nerede saklanıyor — güvenli mi?', a: 'Verileriniz güvenli sunucularda, aktarımda ve depolamada şifrelenir. Asla satmaz veya paylaşmayız. İstediğiniz zaman her şeyi dışa aktarabilirsiniz.' },
        { q: 'İstediğim zaman iptal edebilir miyim?', a: 'Evet. Hesap ayarlarınızdan tek tıkla — telefon yok, soru yok. Uzun vadeli sözleşmemiz yok.' },
      ],
    },
    cta: {
      title: 'Rezervasyonlarınızı basitleştirmeye hazır mısınız?',
      desc: '14 günlük ücretsiz denemeye başlayın. Kredi kartı gerekmez.',
      button: 'Hemen başlayın',
      button2: 'Bizimle konuşun',
    },
    footer: {
      tagline: 'Modern ev sahipleri ve profesyonel mülk yöneticileri için dünyanın en sezgisel Rezervasyon Yönetim Sistemi.',
      product: 'Ürün', company: 'Şirket', legal: 'Yasal', support: 'Destek',
      productLinks: ['Özellikler', 'Fiyatlar', 'Entegrasyonlar', 'Mobil uygulama'],
      companyLinks: ['Hakkımızda', 'Hikayemiz', 'İletişim'],
      legalLinks: ['Gizlilik', 'Şartlar'],
      whatsapp: 'WhatsApp Destek',
      rights: `© ${new Date().getFullYear()} Hujuzatk PMS. Tüm hakları saklıdır.`,
      location: 'İstanbul · Türkiye · Uluslararası',
    },
    video: { playing: 'oynatılıyor', step: (i: number, n: number) => `Adım ${i} / ${n}` },
    workspaceCheck: 'Çalışma alanınız var mı? Adını girin:',
    workspacePh: 'calisma-alaniniz',
    open: 'Aç',
  },
};

// =====================================================================
// Reusable building blocks
// =====================================================================

function HZLogo({ size = 36, mono = false, color }: { size?: number; mono?: boolean; color?: string }) {
  const c = color || 'var(--ink-900)';
  return (
    <div className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="2" y="2" width="36" height="36" rx="11" fill={mono ? c : 'var(--brand-green)'} />
        <path d="M11 14 C 11 12, 13 11, 15 11 L 27 11 C 29 11, 30 12.5, 30 14.5 C 30 19, 28 24, 23 27 C 19.5 29, 14 29, 11 27"
          stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="14" cy="22" r="1.6" fill="#fff" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: size * 0.6, color: c, letterSpacing: '-0.02em' }}>Hujuzatk</span>
    </div>
  );
}

function HZUnderline({ color = 'var(--brand-green)' }: { color?: string }) {
  return (
    <svg viewBox="0 0 220 14" preserveAspectRatio="none">
      <path d="M3 9 C 60 3, 130 3, 217 7" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.65" />
    </svg>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative"
      style={{
        width: 320, borderRadius: 44, background: '#0F1A33', padding: 10,
        boxShadow: '0 50px 80px -30px rgba(11,27,58,.35), 0 16px 32px -16px rgba(11,27,58,.18)',
      }}
    >
      <div
        className="absolute"
        style={{
          top: 14, left: '50%', transform: 'translateX(-50%)',
          width: 90, height: 24, background: '#0F1A33', borderRadius: 14, zIndex: 3,
        }}
      />
      <div style={{ borderRadius: 36, background: 'var(--bg)', overflow: 'hidden', position: 'relative', height: 660 }}>
        {children}
      </div>
    </div>
  );
}

// Phone-screen calendar mock (Arabic) — used inside the hero phone
function CalendarScreenMock() {
  const dates = [
    { d: '27', m: 'مارس' }, { d: '28', m: 'مارس' }, { d: '29', m: 'مارس' },
    { d: '30', m: 'مارس' }, { d: '31', m: 'مارس' }, { d: '01', m: 'أبريل' },
    { d: '02', m: 'أبريل' }, { d: '03', m: 'أبريل' }, { d: '04', m: 'أبريل' },
    { d: '05', m: 'أبريل' }, { d: '06', m: 'أبريل' },
  ];
  const rooms = [
    { name: 'R 4', tone: 'blue' }, { name: 'B 1', tone: 'neutral' },
    { name: 'B 2', tone: 'neutral' }, { name: 'B 3', tone: 'green' },
  ];
  // Booking-cell tones. Text colors picked to pass WCAG AA 4.5:1 on their pastel
  // backgrounds — the natural blue-500 / emerald-700 combo failed contrast.
  //   blue:  #1E40AF (blue-800) on #DBEAFE  → ~7.1:1
  //   green: #065F46 (emerald-800) on #D1FAE5 → ~6.7:1
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue:    { bg: 'var(--accent-blue-soft)',  text: '#1E40AF',             border: 'rgba(59,130,246,.45)' },
    green:   { bg: 'var(--brand-green-soft)',  text: '#065F46',             border: 'rgba(14,159,110,.45)' },
    neutral: { bg: 'transparent',              text: 'var(--ink-700)',      border: 'var(--border)' },
  };

  const Block = ({ name, col, startRow, span, tone }: { name: string; col: number; startRow: number; span: number; tone: keyof typeof colorMap }) => {
    const t = colorMap[tone];
    const colW = `calc((100% - 44px) / 4)`;
    return (
      <div
        className="absolute flex items-center justify-center font-bold"
        style={{
          top: startRow * 44 + 4,
          insetInlineStart: `calc(44px + ${col - 1} * ${colW} + 4px)`,
          width: `calc(${colW} - 8px)`,
          height: span * 44 - 8,
          background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 8,
          color: t.text, fontSize: 12,
        }}
      >
        {name}
      </div>
    );
  };

  return (
    <div dir="rtl" style={{ height: '100%', background: '#fff', fontFamily: 'var(--font-ar)' }}>
      <div className="flex justify-between items-center" style={{ padding: '16px 14px 8px' }}>
        <div className="flex gap-2">
          <div className="flex items-center justify-center" style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--brand-green-tint)', color: 'var(--brand-green-deep)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 20c0-3.5 3-6.5 7-6.5s7 3 7 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 font-semibold" style={{
            background: 'var(--brand-green-tint)', borderRadius: 10, padding: '0 12px',
            color: 'var(--brand-green-deep)', fontSize: 13,
          }}>
            التقويم
          </div>
        </div>
        <div className="flex items-center justify-center text-white" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ink-900)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '44px repeat(4, 1fr)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center" style={{ padding: '8px 0', borderInlineStart: '1px solid var(--border)' }}>
          <Calendar size={14} style={{ color: 'var(--ink-500)' }} />
        </div>
        {rooms.map((r, i) => (
          <div key={i} className="text-center font-bold" style={{
            padding: '10px 0', fontSize: 12,
            color: colorMap[r.tone].text,
            background: r.tone === 'green' ? 'rgba(14,159,110,.06)' : r.tone === 'blue' ? 'rgba(59,130,246,.06)' : 'transparent',
            borderInlineStart: '1px solid var(--border)',
          }}>{r.name}</div>
        ))}
      </div>
      <div className="relative" style={{ height: 530, overflow: 'hidden' }}>
        <div className="grid" style={{ gridTemplateColumns: '44px repeat(4, 1fr)', gridAutoRows: '44px' }}>
          {dates.map((d, di) => (
            <div key={di} className="contents">
              <div className="flex flex-col items-center justify-center font-bold" style={{
                // Was var(--accent-coral) #F87171 on white — ~2.8:1, failed AA.
                // ink-700 matches the rest of the mock and is high-contrast.
                fontSize: 11, color: 'var(--ink-700)', lineHeight: 1.1,
                borderTop: '1px solid var(--border-soft)', borderInlineStart: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 11 }}>{d.d}</span>
                <span style={{ fontSize: 9, opacity: 0.85 }}>{d.m}</span>
              </div>
              {rooms.map((_, ri) => (
                <div key={ri} style={{ borderTop: '1px solid var(--border-soft)', borderInlineStart: '1px solid var(--border-soft)' }} />
              ))}
            </div>
          ))}
        </div>
        <Block name="Ahmed" col={1} startRow={0} span={3} tone="blue" />
        <Block name="Ali" col={3} startRow={1} span={4} tone="green" />
        <Block name="أحمد" col={1} startRow={5} span={5} tone="blue" />
      </div>
    </div>
  );
}

// =====================================================================
// Floating BadgeChip (around hero phone)
// =====================================================================
type BadgeProps = {
  wrapStyle: React.CSSProperties;
  rot?: number;
  floatAnim?: 'hzFloatA' | 'hzFloatB' | 'hzFloatC';
  delay?: string;
  accent: string;
  accentBg: string;
  icon: React.ReactNode;
  title: string;
  sub?: string;
  big?: string;
  delta?: string;
  statusDot?: boolean;
  /** Smaller variant for mobile — tighter padding and narrower min-width. */
  compact?: boolean;
};
function BadgeChip({ wrapStyle, rot = 0, floatAnim = 'hzFloatA', delay = '0s', accent, accentBg, icon, title, sub, big, delta, statusDot, compact }: BadgeProps) {
  // Auto-detect mobile: use the narrow variant when the viewport is narrow, regardless
  // of the explicit `compact` prop. Avoids passing the flag through every call site.
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024;
  const isCompact = compact ?? isNarrow;
  const iconBoxSize = isCompact ? 32 : 40;
  return (
    <div
      className="absolute"
      style={{
        ['--rot' as any]: `${rot}deg`,
        transform: `rotate(${rot}deg)`,
        animation: `${floatAnim} 6s ease-in-out infinite`,
        animationDelay: delay,
        ...wrapStyle,
      }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid var(--border)',
        borderRadius: isCompact ? 12 : 16,
        padding: isCompact ? '8px 10px' : '12px 16px',
        boxShadow: '0 20px 40px -12px rgba(11,27,58,0.16), 0 4px 12px -4px rgba(11,27,58,0.08)',
        minWidth: isCompact ? 0 : 200,
        maxWidth: isCompact ? 160 : 280,
      }}>
        <div className={cn('flex items-center', isCompact ? 'gap-2' : 'gap-3')}>
          <div className="grid place-items-center shrink-0" style={{
            width: iconBoxSize, height: iconBoxSize, borderRadius: isCompact ? 10 : 12,
            background: accentBg, color: accent,
          }}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="font-bold leading-tight" style={{ fontSize: isCompact ? 11 : 13, color: 'var(--ink-900)' }}>{title}</div>
              {statusDot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-green)', flexShrink: 0, animation: 'hzPulse 1.8s ease-in-out infinite' }} />}
            </div>
            {big && <div className="font-extrabold" style={{ fontSize: isCompact ? 14 : 20, color: 'var(--ink-900)', letterSpacing: '-0.02em', marginTop: 2 }}>{big}</div>}
            {sub && <div style={{ fontSize: isCompact ? 10 : 11, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>}
            {delta && <div className="font-bold" style={{ fontSize: isCompact ? 10 : 11, color: accent, marginTop: 4 }}>{delta}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Holographic feature visuals
// =====================================================================

function CalendarHolo({ lang }: { lang: Lang }) {
  return (
    <div style={{ position: 'relative', width: 220, height: 160 }}>
      {[
        { y: '2024', t: lang === 'ar' ? 'مارس' : lang === 'tr' ? 'Mar' : 'Mar', n: '27', rot: -8, x: 0, y2: 30, z: 1, dim: 0.55 },
        { y: '2025', t: lang === 'ar' ? 'مارس' : lang === 'tr' ? 'Mar' : 'Mar', n: '27', rot: -3, x: 30, y2: 15, z: 2, dim: 0.8 },
        { y: '2026', t: lang === 'ar' ? 'مارس' : lang === 'tr' ? 'Mar' : 'Mar', n: '27', rot: 4, x: 60, y2: 0, z: 3, dim: 1 },
      ].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', insetInlineStart: c.x, top: c.y2, zIndex: c.z,
          width: 110, height: 130, background: '#fff',
          borderRadius: 16, padding: 14,
          boxShadow: '0 8px 24px -8px rgba(11,27,58,0.18)',
          transform: `rotate(${c.rot}deg)`,
          opacity: c.dim,
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: 'var(--accent-coral)', fontWeight: 700, marginBottom: 4 }}>{c.y}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>{c.t}</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--ink-900)', lineHeight: 1, marginTop: 8, letterSpacing: '-0.04em' }}>{c.n}</div>
          <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'var(--brand-green)', opacity: 0.4 }} />
        </div>
      ))}
    </div>
  );
}

function InvoiceHolo({ lang }: { lang: Lang }) {
  const isAr = lang === 'ar';
  return (
    <div style={{
      transform: 'rotate(-6deg)', width: 200, background: '#fff',
      borderRadius: 12, padding: 16,
      boxShadow: '0 18px 36px -10px rgba(11,27,58,0.2)',
      border: '1px solid var(--border)', direction: isAr ? 'rtl' : 'ltr',
    }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-900)' }}>{isAr ? 'فاتورة #2451' : lang === 'tr' ? 'Fatura #2451' : 'Invoice #2451'}</span>
        <div className="grid place-items-center" style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent-amber-soft)', color: 'var(--accent-amber)' }}>
          <Receipt size={14} />
        </div>
      </div>
      {[
        { l: isAr ? '5 ليالٍ × ﷼ 250' : lang === 'tr' ? '5 gece × ₺ 250' : '5 nights × SAR 250', v: isAr ? '﷼ 1,250' : lang === 'tr' ? '₺ 1,250' : 'SAR 1,250' },
        { l: isAr ? 'خصم 10%' : lang === 'tr' ? 'İndirim %10' : 'Discount 10%', v: isAr ? '−﷼ 125' : lang === 'tr' ? '−₺ 125' : '−SAR 125', muted: true },
        { l: isAr ? 'ضريبة 5%' : lang === 'tr' ? 'Vergi %5' : 'Tax 5%', v: isAr ? '﷼ 56' : lang === 'tr' ? '₺ 56' : 'SAR 56', muted: true },
      ].map((r, i) => (
        <div key={i} className="flex justify-between" style={{ fontSize: 10, color: r.muted ? 'var(--ink-300)' : 'var(--ink-900)', padding: '3px 0' }}>
          <span>{r.l}</span><span>{r.v}</span>
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
      <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-900)' }}>
        <span>{isAr ? 'الإجمالي' : lang === 'tr' ? 'Toplam' : 'Total'}</span>
        <span>{isAr ? '﷼ 1,181' : lang === 'tr' ? '₺ 1,181' : 'SAR 1,181'}</span>
      </div>
    </div>
  );
}

function RtlHolo({ lang }: { lang: Lang }) {
  return (
    <div style={{ position: 'relative', width: 220, height: 160 }}>
      <div style={{
        position: 'absolute', insetInlineStart: 10, top: 20, zIndex: 1,
        width: 110, height: 90, background: '#fff', borderRadius: 12, padding: 12,
        boxShadow: '0 10px 24px -8px rgba(11,27,58,0.18)',
        border: '1px solid var(--border)', transform: 'rotate(-6deg)', direction: 'ltr',
      }}>
        <div style={{ fontSize: 9, color: 'var(--ink-300)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.08em' }}>EN · LTR</div>
        <div style={{ height: 6, width: '70%', background: 'var(--ink-900)', borderRadius: 3, marginBottom: 5 }} />
        <div style={{ height: 4, width: '90%', background: 'var(--border)', borderRadius: 2, marginBottom: 4 }} />
        <div style={{ height: 4, width: '60%', background: 'var(--border)', borderRadius: 2 }} />
      </div>
      <div style={{
        position: 'absolute', insetInlineEnd: 10, top: 30, zIndex: 2,
        width: 130, height: 100, background: '#fff', borderRadius: 12, padding: 12,
        boxShadow: '0 12px 28px -8px rgba(11,27,58,0.22)',
        border: `2px solid var(--accent-blue)`, transform: 'rotate(5deg)', direction: 'rtl',
      }}>
        <div style={{ fontSize: 9, color: 'var(--accent-blue)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.04em' }}>عربي · RTL</div>
        <div className="h-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink-900)', lineHeight: 1, fontFamily: 'var(--font-ar)' }}>حجوزاتك</div>
        <div style={{ marginTop: 6, height: 4, width: '60%', background: 'var(--border)', borderRadius: 2, marginInlineStart: 'auto' }} />
        <div style={{ marginTop: 4, height: 4, width: '80%', background: 'var(--border)', borderRadius: 2, marginInlineStart: 'auto' }} />
      </div>
      {/* Tag for tr */}
      {lang === 'tr' && (
        <div style={{
          position: 'absolute', insetInlineStart: 70, bottom: 20, zIndex: 3,
          width: 100, background: '#fff', borderRadius: 10, padding: 8,
          boxShadow: '0 12px 28px -8px rgba(11,27,58,0.22)',
          border: `2px solid var(--accent-coral)`, transform: 'rotate(-3deg)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--accent-coral)', fontWeight: 700, letterSpacing: '0.06em' }}>TR · LTR</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-900)', marginTop: 2 }}>Hujuzatk</div>
        </div>
      )}
    </div>
  );
}

function ReportsHolo({ lang }: { lang: Lang }) {
  const bars = [40, 65, 50, 80, 95, 70, 100];
  const isAr = lang === 'ar';
  return (
    <div className="flex gap-4 items-center justify-center">
      <div style={{
        width: 220, background: '#fff', borderRadius: 14, padding: 16,
        boxShadow: '0 18px 40px -12px rgba(11,27,58,0.22)',
        border: '1px solid var(--border)', transform: 'rotate(-4deg)',
        direction: isAr ? 'rtl' : 'ltr',
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-500)' }}>{isAr ? 'الإيرادات' : lang === 'tr' ? 'Gelir' : 'Revenue'}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--brand-green-deep)', background: 'var(--brand-green-tint)', padding: '2px 6px', borderRadius: 4 }}>↑ 18%</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em', marginBottom: 12 }}>
          {isAr ? '﷼ 28,450' : lang === 'tr' ? '₺ 28,450' : 'SAR 28,450'}
        </div>
        <div className="flex items-end" style={{ gap: 5, height: 60 }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              flex: 1, height: `${h}%`,
              background: i === 6 ? 'var(--brand-green)' : 'var(--brand-green-tint)',
              borderRadius: 3, transformOrigin: 'bottom',
              animation: `hzGrowBar .6s cubic-bezier(.2,.7,.2,1) both`,
              animationDelay: `${i * 80}ms`,
            }} />
          ))}
        </div>
      </div>
      <div style={{
        width: 90, background: '#fff', borderRadius: 12, padding: 12,
        boxShadow: '0 14px 28px -8px rgba(11,27,58,0.18)',
        border: '1px solid var(--border)', transform: 'rotate(6deg)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 9, color: 'var(--ink-500)', fontWeight: 700, marginBottom: 6 }}>{isAr ? 'إشغال' : lang === 'tr' ? 'Doluluk' : 'Occupancy'}</div>
        <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto' }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--brand-green)" strokeWidth="3"
              strokeDasharray="76 100" strokeDashoffset="0" transform="rotate(-90 18 18)" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 grid place-items-center" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-900)' }}>76%</div>
        </div>
      </div>
    </div>
  );
}

function InstallHolo({ lang }: { lang: Lang }) {
  return (
    <div style={{ position: 'relative', width: 240, height: 180 }}>
      <div style={{
        position: 'absolute', inset: 0, insetInlineEnd: 30,
        background: 'linear-gradient(135deg, #1B2A55 0%, #0B1B3A 100%)',
        borderRadius: 22, padding: 16, transform: 'rotate(-5deg)',
        boxShadow: '0 20px 40px -12px rgba(11,27,58,0.4)',
      }}>
        <div className="flex justify-between" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: 700, marginBottom: 18 }}>
          <span>9:41</span><span>●●●●●</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[0,1,2,3,4,5,6,7].map(i => (
            <div key={i} className="grid place-items-center" style={{
              width: 32, height: 32, borderRadius: 8,
              background: i === 0 ? 'var(--accent-purple)' : `rgba(255,255,255,${0.08 + (i % 3) * 0.04})`,
            }}>
              {i === 0 && <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>ح</span>}
            </div>
          ))}
        </div>
        <div className="absolute" style={{ insetInlineStart: 16, bottom: 14, fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
          {lang === 'ar' ? 'حجوزاتك' : 'Hujuzatk'}
        </div>
      </div>
      <div className="absolute flex items-center gap-2" style={{
        insetInlineEnd: -10, bottom: -10,
        background: '#fff', borderRadius: 14, padding: 10,
        boxShadow: '0 16px 32px -10px rgba(11,27,58,0.25)',
        border: '1px solid var(--border)', transform: 'rotate(4deg)',
      }}>
        <div className="grid place-items-center" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-purple)', color: '#fff', fontWeight: 800, fontSize: 14 }}>ح</div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-900)' }}>{lang === 'ar' ? 'تثبيت' : lang === 'tr' ? 'Kur' : 'Install'}</div>
          <div style={{ fontSize: 8, color: 'var(--ink-500)' }}>{lang === 'ar' ? 'بدون متجر' : lang === 'tr' ? 'Mağazasız' : 'No app store'}</div>
        </div>
      </div>
    </div>
  );
}

function ChannelsHolo({ lang }: { lang: Lang }) {
  const channels = [
    { t: 'Airbnb',  color: 'var(--accent-coral)', rot: -8, x: 0,   y: 20 },
    { t: 'Booking', color: 'var(--accent-blue)',  rot:  4, x: 70,  y: 0 },
    { t: lang === 'ar' ? 'جاذبين' : 'Gathern', color: 'var(--brand-green)', rot: -3, x: 140, y: 30 },
  ];
  return (
    <div style={{ position: 'relative', width: 240, height: 160 }}>
      <svg viewBox="0 0 240 160" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <path d="M30 100 Q 120 30 210 100" stroke="var(--brand-green)" strokeWidth="1.5" fill="none" strokeDasharray="3 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.4s" repeatCount="indefinite" />
        </path>
      </svg>
      {channels.map((c, i) => (
        <div key={i} style={{
          position: 'absolute', insetInlineStart: c.x, top: c.y,
          width: 84, padding: '10px 12px',
          background: '#fff', borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: '0 12px 28px -8px rgba(11,27,58,0.18)',
          transform: `rotate(${c.rot}deg)`,
          textAlign: 'center',
        }}>
          <div className="grid place-items-center" style={{
            width: 28, height: 28, borderRadius: 8, margin: '0 auto 6px',
            background: c.color, color: '#fff', fontSize: 13, fontWeight: 800,
          }}>{c.t.charAt(0)}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-900)' }}>{c.t}</div>
          <div style={{ fontSize: 8, color: 'var(--brand-green-deep)', fontWeight: 700, marginTop: 2 }}>● {lang === 'ar' ? 'متزامن' : lang === 'tr' ? 'senkron' : 'synced'}</div>
        </div>
      ))}
    </div>
  );
}

function ExpensesHolo({ lang }: { lang: Lang }) {
  const items = [
    { l: lang === 'ar' ? 'صيانة'  : lang === 'tr' ? 'Bakım'   : 'Maintenance', v: lang === 'ar' ? '﷼ 420' : lang === 'tr' ? '₺ 420' : 'SAR 420', c: 'var(--accent-amber)' },
    { l: lang === 'ar' ? 'تنظيف'  : lang === 'tr' ? 'Temizlik': 'Cleaning',    v: lang === 'ar' ? '﷼ 180' : lang === 'tr' ? '₺ 180' : 'SAR 180', c: 'var(--accent-blue)'  },
    { l: lang === 'ar' ? 'كهرباء' : lang === 'tr' ? 'Faturalar': 'Utilities',  v: lang === 'ar' ? '﷼ 95'  : lang === 'tr' ? '₺ 95'  : 'SAR 95',  c: 'var(--accent-purple)' },
  ];
  return (
    <div style={{ position: 'relative', width: 240, height: 170 }}>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2.5" style={{
          position: 'absolute',
          insetInlineStart: i * 28, top: i * 22,
          zIndex: 3 - i, width: 180,
          background: '#fff', borderRadius: 12,
          padding: '12px 14px',
          boxShadow: '0 14px 28px -8px rgba(11,27,58,0.18)',
          border: '1px solid var(--border)',
          transform: `rotate(${i === 0 ? -6 : i === 1 ? 0 : 5}deg)`,
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }}>
          <div className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: 8, background: `${it.c}22`, color: it.c }}>
            <Wallet size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 10, color: 'var(--ink-500)', fontWeight: 600 }}>{it.l}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>{it.v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  green:  { bg: 'var(--brand-green-tint)', fg: 'var(--brand-green-deep)' },
  amber:  { bg: 'var(--accent-amber-soft)', fg: 'var(--accent-amber)' },
  blue:   { bg: 'var(--accent-blue-soft)',  fg: 'var(--accent-blue)' },
  purple: { bg: 'var(--accent-purple-soft)',fg: 'var(--accent-purple)' },
  coral:  { bg: 'var(--accent-coral-soft)', fg: 'var(--accent-coral)' },
};

function FeatureCard({
  span, item, lang, wide, children, idx = 0,
}: {
  span: number;
  item: { tag: string; title: string; desc: string; color: string };
  lang: Lang;
  wide?: boolean;
  children: React.ReactNode;
  idx?: number;
}) {
  const c = COLOR_MAP[item.color] ?? COLOR_MAP.green;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { el.setAttribute('data-reveal', 'on'); io.unobserve(el); } });
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="hz-reveal hz-card-hover relative overflow-hidden flex flex-col"
      style={{
        gridColumn: `span ${span}`,
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 24,
        padding: 32,
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        minHeight: wide ? 360 : 380,
        transitionDelay: `${(idx % 3) * 80}ms`,
      }}
    >
      <div className="relative grid place-items-center mb-5" style={{
        height: wide ? 180 : 200, borderRadius: 16,
        background: `linear-gradient(135deg, ${c.bg} 0%, rgba(255,255,255,0.4) 100%)`,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 30% 30%, ${c.bg} 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.5) 0%, transparent 50%)`,
          mixBlendMode: 'screen',
        }} />
        <div className="relative w-full h-full grid place-items-center" style={{ zIndex: 1 }}>
          {children}
        </div>
      </div>
      <div className="inline-flex self-start items-center gap-2" style={{
        background: c.bg, color: c.fg, padding: '5px 12px', borderRadius: 999,
        fontSize: 11, fontWeight: 700, marginBottom: 12,
      }}>{item.tag}</div>
      <h3 className="m-0 mb-2.5" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-900)', lineHeight: 1.3 }}>{item.title}</h3>
      <p className="m-0" style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.6 }}>{item.desc}</p>
    </div>
  );
}

// =====================================================================
// VideoModal — cycles real product screenshots
// =====================================================================
function VideoModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: Lang }) {
  const FRAMES = [
    { src: '/screenshots/calendar.png',  labelEn: 'Calendar',     labelAr: 'التقويم',     labelTr: 'Takvim' },
    { src: '/screenshots/reports.png',   labelEn: 'Reports',      labelAr: 'التقارير',    labelTr: 'Raporlar' },
    { src: '/screenshots/list.png',      labelEn: 'Bookings',     labelAr: 'الحجوزات',    labelTr: 'Rezervasyonlar' },
    { src: '/screenshots/expense.png',   labelEn: 'Expenses',     labelAr: 'المصروفات',   labelTr: 'Giderler' },
    { src: '/screenshots/settings.png',  labelEn: 'Settings',     labelAr: 'الإعدادات',   labelTr: 'Ayarlar' },
  ];
  const FRAME_MS = 2500;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!open) { setIdx(0); setPlaying(true); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !playing) return;
    const id = setTimeout(() => setIdx(i => (i + 1) % FRAMES.length), FRAME_MS);
    return () => clearTimeout(id);
  }, [open, playing, idx, FRAMES.length]);

  if (!open) return null;
  const frame = FRAMES[idx];
  const label = lang === 'ar' ? frame.labelAr : lang === 'tr' ? frame.labelTr : frame.labelEn;
  const progress = ((idx + 1) / FRAMES.length) * 100;
  const t = content[lang];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(8,15,32,0.78)', backdropFilter: 'blur(8px)', padding: 24, animation: 'hzFadeIn .25s ease both' }}
      role="dialog" aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full"
        style={{ background: 'var(--ink-900)', borderRadius: 28, padding: 16, maxWidth: 1100, boxShadow: '0 60px 120px -20px rgba(0,0,0,.6)' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute z-10 grid place-items-center text-white"
          style={{ top: 24, insetInlineEnd: 24, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', fontSize: 18 }}
        >
          ×
        </button>

        {/* Window chrome */}
        <div className="flex items-center" style={{ gap: 8, padding: '6px 10px 12px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
          <div className="flex-1 text-center" style={{
            marginInline: 16, padding: '5px 14px',
            background: 'rgba(255,255,255,0.08)', borderRadius: 8,
            fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'ui-monospace, monospace',
          }}>
            ● {t.video.playing} · hujuzatk.app/{frame.labelEn.toLowerCase()}
          </div>
        </div>

        {/* Stage */}
        <div className="relative grid place-items-center" style={{
          background: 'linear-gradient(160deg, #14224d 0%, #0B1B3A 100%)',
          borderRadius: 18, overflow: 'hidden',
          aspectRatio: '16 / 10',
        }}>
          <div className="relative" style={{
            height: '94%', aspectRatio: '9 / 19.5',
            background: '#000', borderRadius: 32, padding: 6,
            boxShadow: '0 40px 80px -20px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,0.08)',
            animation: 'hzFadeIn .5s ease both',
          }}>
            <div className="w-full h-full relative" style={{ borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
              {FRAMES.map((f, i) => (
                <div key={i} className="absolute inset-0 grid place-items-center" style={{
                  opacity: i === idx ? 1 : 0, transition: 'opacity .55s ease', background: '#fff',
                }}>
                  <img src={f.src} alt="" style={{
                    width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center',
                    animation: i === idx && playing ? 'hzKenBurns 6s ease-in-out infinite alternate' : 'none',
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* Step caption */}
          <div className="absolute" style={{ insetInlineStart: 32, top: 32, color: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>
              {t.video.step(idx + 1, FRAMES.length)}
            </div>
            <div className="h-display" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15 }}>{label}</div>
          </div>

          {/* Soft glow */}
          <div className="absolute pointer-events-none" style={{
            inset: -100,
            background: 'radial-gradient(circle at 50% 60%, rgba(14,159,110,0.16), transparent 60%)',
          }} />
        </div>

        {/* Controls */}
        <div className="flex items-center" style={{ gap: 14, padding: '14px 6px 6px' }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="grid place-items-center text-white"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}
          >
            {playing ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          </button>
          <div className="flex-1 relative" style={{ height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', insetInlineStart: 0, top: 0, height: '100%',
              width: `${progress}%`, background: 'var(--brand-green)', transition: 'width .4s ease',
            }} />
          </div>
          <div className="flex" style={{ gap: 6 }}>
            {FRAMES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Frame ${i + 1}`}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i === idx ? 'var(--brand-green)' : 'rgba(255,255,255,0.25)',
                  border: 'none', padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// SEO helpers (preserved)
// =====================================================================

function setMetaName(name: string, c: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', c);
}
function setMetaProp(property: string, c: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.setAttribute('content', c);
}
function setLinkRel(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
}
function setJsonLD(id: string, data: object) {
  let el = document.querySelector<HTMLScriptElement>(`script[data-ld="${id}"]`);
  if (!el) { el = document.createElement('script'); el.setAttribute('type', 'application/ld+json'); el.setAttribute('data-ld', id); document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
}

function applySEO(lang: Lang) {
  const isAr = lang === 'ar';
  const title = isAr
    ? 'حجوزاتك — نظام إدارة الفنادق والإيجارات السياحية'
    : 'Hujuzatk — Hotel & Vacation Rental PMS for Saudi & GCC';
  const description = isAr
    ? 'حجوزاتك هو نظام إدارة الفنادق والإيجارات السياحية. تقويم حجوزات 5 سنوات، فوترة تلقائية، مزامنة Airbnb وجاثرين وBooking.com، دعم عربي كامل RTL. جرّب مجاناً 14 يوم بدون بطاقة ائتمان.'
    : 'Hujuzatk is a Hotel & Vacation Rental PMS for Saudi Arabia & the GCC. 5-year calendar, automated invoicing, Airbnb / Gathern / Booking.com sync, native Arabic RTL. Free 14-day trial.';
  document.title = title;
  document.documentElement.lang = lang;
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  setMetaName('description', description);
  setMetaProp('og:title', title);
  setMetaProp('og:description', description);
  setMetaProp('og:locale', isAr ? 'ar_AR' : 'en_US');
  setMetaProp('og:type', 'website');
  setMetaProp('og:url', 'https://hujuzatk.com');
  setMetaProp('og:image', 'https://hujuzatk.com/og-image.png');
  setMetaName('twitter:card', 'summary_large_image');
  setMetaName('twitter:title', title);
  setMetaName('twitter:description', description);
  setMetaName('twitter:image', 'https://hujuzatk.com/og-image.png');
  setLinkRel('canonical', 'https://hujuzatk.com');
  setJsonLD('software', {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Hujuzatk PMS',
    alternateName: 'حجوزاتك - نظام إدارة الحجوزات',
    url: 'https://hujuzatk.com',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Hotel Management Software',
    operatingSystem: 'Web, Android, iOS (PWA)',
    inLanguage: ['en', 'ar', 'tr'],
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '40', highPrice: '140',
      priceCurrency: 'USD', offerCount: '4',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
    },
    featureList: isAr
      ? ['تقويم حجوزات 3 سنوات', 'فوترة PDF تلقائية', 'دعم العربية RTL', 'تحليلات مالية', 'تتبع المصروفات', 'تطبيق جوال قابل للتثبيت', 'تكامل قنوات (Airbnb / جاذبين / Booking.com)']
      : ['3-Year Booking Calendar', 'Automated PDF Invoicing', 'Expense Tracking', 'Arabic RTL Support', 'Financial Analytics', 'Installable Mobile Web App', 'Channel Integrations (Airbnb / Gathern / Booking.com)'],
    screenshot: 'https://hujuzatk.com/og-image.png',
  });
}

function detectLang(): Lang {
  const stored = localStorage.getItem('landing-lang');
  if (stored === 'en' || stored === 'ar' || stored === 'tr') return stored;
  if (navigator.language?.startsWith('ar')) return 'ar';
  if (navigator.language?.startsWith('tr')) return 'tr';
  return 'en';
}

// =====================================================================
// Main LandingPage
// =====================================================================
export function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(detectLang);
  const [workspaceName, setWorkspaceName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; email: string; slug: string } | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);

  const c = content[lang];
  const isRtl = lang === 'ar';
  const isAr = lang === 'ar';

  useEffect(() => { applySEO(lang); }, [lang]);

  // Inject FAQPage JSON-LD on the landing route only. Previously it lived in
  // index.html and was therefore present on every SPA route — Google flagged
  // "Duplicate field 'FAQPage'" because /terms, /privacy, /workspace, etc. all
  // carried it. Mount-scoped script tag → only the home page emits it.
  useEffect(() => {
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What is Hujuzatk PMS?',
          acceptedAnswer: { '@type': 'Answer', text: 'Hujuzatk is a cloud-based Hotel and Property Management System (PMS) designed for hotels, apartments, and vacation rentals. It features a 5-year booking calendar, automated invoicing, financial analytics, and full Arabic and English support.' } },
        { '@type': 'Question', name: 'Does Hujuzatk support Arabic language?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Hujuzatk has native Arabic RTL support including Arabic date formats, SAR and GCC currencies, and complete right-to-left layout throughout the entire application.' } },
        { '@type': 'Question', name: 'How much does Hujuzatk cost?',
          acceptedAnswer: { '@type': 'Answer', text: 'Four tiers, billed annually: Trial (free 14 days, 3 rooms), Basic $40/year (up to 10 rooms), Pro $90/year (up to 30 rooms, with automatic Airbnb / Gathern / Booking.com channel sync), and Enterprise $140/year (unlimited rooms). All paid tiers include unlimited bookings, full reporting, multi-language support, and a 5-year calendar. A 14-day free trial is included — no credit card required.' } },
        { '@type': 'Question', name: 'Is Hujuzatk available as a mobile app?',
          acceptedAnswer: { '@type': 'Answer', text: "Yes. Hujuzatk installs to your phone's home screen from the browser in one tap — works offline, sends push notifications, no App Store or Play Store download needed." } },
        { '@type': 'Question', name: 'كم تكلفة حجوزاتك؟',
          acceptedAnswer: { '@type': 'Answer', text: 'أربع خطط بفوترة سنوية: التجريبية (مجانية 14 يوم، 3 غرف)، الأساسية 40$/سنة (حتى 10 غرف)، المحترفة 90$/سنة (حتى 30 غرفة، مع مزامنة تلقائية لـ Airbnb وجاثرين وBooking.com)، والمؤسسات 140$/سنة (غرف غير محدودة). كل الخطط المدفوعة تشمل حجوزات غير محدودة وتقارير كاملة ودعم متعدد اللغات وتقويم 5 سنوات. تتوفر تجربة مجانية 14 يوماً بدون بطاقة ائتمان.' } },
        { '@type': 'Question', name: 'ما هو نظام حجوزاتك PMS؟',
          acceptedAnswer: { '@type': 'Answer', text: 'حجوزاتك هو نظام إدارة الحجوزات والفنادق المبني على السحابة، مصمم للفنادق والشقق والإيجارات السياحية. يتميز بتقويم حجوزات لـ5 سنوات، وفوترة تلقائية، وتحليلات مالية، ودعم كامل للغة العربية والإنجليزية.' } },
        { '@type': 'Question', name: 'هل حجوزاتك يدعم اللغة العربية؟',
          acceptedAnswer: { '@type': 'Answer', text: 'نعم، يدعم حجوزاتك اللغة العربية بشكل كامل مع تخطيط RTL أصيل، وتنسيقات التواريخ العربية، والريال السعودي وعملات الخليج، وواجهة كاملة من اليمين إلى اليسار.' } },

        // ── From customer questions ──
        { '@type': 'Question', name: 'Is there a mobile app or only the website?',
          acceptedAnswer: { '@type': 'Answer', text: 'Both. Hujuzatk is a Progressive Web App — install it to your home screen from any modern browser in one tap. It runs full-screen like a native app, works offline, and sends push notifications. No App Store or Play Store download required. On iPhone: open in Safari → Share → Add to Home Screen. On Android: Chrome shows an "Install app" prompt automatically.' } },
        { '@type': 'Question', name: 'هل يوجد تطبيق للموبايل أم فقط موقع؟',
          acceptedAnswer: { '@type': 'Answer', text: 'الاثنان معاً. حجوزاتك تطبيق ويب تقدمي (PWA) — ثبّته على الشاشة الرئيسية لجهازك من أي متصفح حديث بنقرة واحدة. يعمل بملء الشاشة كتطبيق أصلي، يدعم العمل دون اتصال، ويرسل إشعارات. لا تحتاج تنزيله من App Store أو Play Store. على iPhone: افتح في Safari → مشاركة → إضافة إلى الشاشة الرئيسية. على Android: Chrome يعرض زر "تثبيت التطبيق" تلقائياً.' } },

        { '@type': 'Question', name: 'Does Hujuzatk work for a 60-room hotel?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Pro plan covers up to 30 rooms; for 60+ rooms we offer the Enterprise plan with unlimited rooms. The calendar grid is optimised for hundreds of rooms across a 5-year horizon with zero scroll lag — we routinely test with much larger properties. Contact us for Enterprise pricing.' } },
        { '@type': 'Question', name: 'هل حجوزاتك يناسب فندقاً بـ 60 غرفة؟',
          acceptedAnswer: { '@type': 'Answer', text: 'نعم. خطة Pro تدعم حتى 30 غرفة، وخطة Enterprise تدعم عدداً غير محدود من الغرف وهي المناسبة للفنادق الأكبر. تقويم الحجوزات محسّن للعمل مع مئات الغرف على مدى 5 سنوات بدون أي تأخير. تواصل معنا للحصول على سعر Enterprise.' } },

        { '@type': 'Question', name: 'Can I customize the invoice design and add my logo?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. From Settings → Company Profile you can upload your logo, set your company name, address, phone, email, tax ID, and a custom invoice footer. All these appear automatically on every printed and PDF invoice. Invoices are bilingual (Arabic / English / Turkish) and adapt to the language of the guest entry.' } },
        { '@type': 'Question', name: 'هل يمكنني تخصيص تصميم الفاتورة وإضافة لوجو؟',
          acceptedAnswer: { '@type': 'Answer', text: 'نعم. من الإعدادات → بيانات الشركة يمكنك رفع شعارك، وتحديد اسم الشركة والعنوان والهاتف والبريد والرقم الضريبي ونص في تذييل الفاتورة. تظهر هذه البيانات تلقائياً على كل فاتورة مطبوعة أو PDF. الفواتير ثنائية اللغة (عربي / إنجليزي / تركي) وتتكيف مع لغة بيانات الضيف.' } },

        { '@type': 'Question', name: 'How many users can use Hujuzatk at the same time? Is it cloud-based or does it work offline?',
          acceptedAnswer: { '@type': 'Answer', text: 'Unlimited concurrent users on the same account — share the login with your entire front desk and they all get the same full-access view in real time. Hujuzatk is cloud-based (changes sync across devices instantly via our managed Postgres database) AND works offline (PWA caches data locally; the calendar, booking list, and invoice screens stay usable without internet, and pending changes sync as soon as you reconnect).' } },
        { '@type': 'Question', name: 'كم شخص يستطيع استخدام البرنامج في نفس الوقت؟ هل هو سحابي أم يعمل بدون إنترنت؟',
          acceptedAnswer: { '@type': 'Answer', text: 'عدد المستخدمين غير محدود على نفس الحساب — يمكنك مشاركة بيانات الدخول مع كل موظفي الاستقبال (front desk) ويحصل الجميع على صلاحيات كاملة في الوقت الفعلي. حجوزاتك سحابي (التغييرات تتزامن فوراً بين جميع الأجهزة عبر قاعدة بيانات Postgres مُدارة) ويعمل أيضاً بدون إنترنت (تطبيق الويب التقدمي يحفظ البيانات محلياً، فيبقى التقويم وقائمة الحجوزات والفواتير قابلة للاستخدام، وتتم المزامنة تلقائياً عند عودة الاتصال).' } },
      ],
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.faq = 'hujuzatk-landing';
    script.textContent = JSON.stringify(faq);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  // Detect logged-in session
  useEffect(() => {
    let mounted = true;
    authService.getCurrentUser().then((s) => {
      if (!mounted) return;
      if (s) {
        const slug = encodeURIComponent((s.tenant.name || 'workspace').replace(/\s+/g, '-'));
        setLoggedInUser({ name: s.tenant.name, email: s.tenant.email, slug });
      }
      setSessionResolved(true);
    }).catch(() => setSessionResolved(true));
    return () => { mounted = false; };
  }, []);

  // Promo popup auto-show
  useEffect(() => {
    if (!sessionResolved || loggedInUser) return;
    if (!isPromoActive()) return;
    try {
      const dismissedAt = localStorage.getItem(PROMO_DISMISS_KEY);
      if (dismissedAt) {
        const ageDays = (Date.now() - new Date(dismissedAt).getTime()) / 86_400_000;
        if (ageDays < PROMO_DISMISS_COOLDOWN_DAYS) return;
      }
    } catch {}
    const timer = setTimeout(() => setShowPromo(true), 10_000);
    return () => clearTimeout(timer);
  }, [sessionResolved, loggedInUser]);

  const setLangTo = (l: Lang) => { setLang(l); localStorage.setItem('landing-lang', l); trackLanguageChange(l); };
  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    setLangTo(order[(order.indexOf(lang) + 1) % order.length]);
  };

  const handleOpenWorkspace = async () => {
    const name = workspaceName.trim();
    if (!name) { trackCTA('get_started_empty', 'hero'); navigate('/user?tab=register'); return; }
    trackWorkspaceSearch(name);
    const slug = name.replace(/\s+/g, '-');
    try {
      const exists = await authService.checkWorkspaceExists(slug);
      if (exists) navigate(`/${slug}`);
      else navigate(`/user?workspace=${encodeURIComponent(name)}&tab=register`);
    } catch {
      navigate(`/user?workspace=${encodeURIComponent(name)}&tab=register`);
    }
  };

  const handlePromoStart = (planId: string) => {
    setShowPromo(false);
    trackCTA(`promo_start_${planId}`, 'popup');
    if (planId === 'enterprise') {
      window.open('https://wa.me/905523205496?text=I%27m%20interested%20in%20Hujuzatk%20Enterprise', '_blank');
    } else {
      navigate(`/user?tab=register&plan=${planId}`);
    }
  };

  const handlePlanCta = (planId: string) => {
    trackCTA(`start_trial_${planId}`, 'pricing');
    if (planId === 'enterprise') {
      window.open('https://wa.me/905523205496?text=I%27m%20interested%20in%20Hujuzatk%20Enterprise', '_blank');
    } else {
      navigate(`/user?tab=register&plan=${planId}`);
    }
  };

  const promoOn = isPromoActive();

  return (
    <div dir={c.dir} style={{
      background: 'var(--bg)', minHeight: '100vh',
      fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-en)',
    }}>
      {/* ───────── Nav ─────────
          z-50 (not z-10) — the hero section below also has a z-10 inner wrapper
          for its parallax content, so a same-z later-in-DOM sibling was painting
          over the language dropdown panel. The dropdown's own z-[120] is capped
          by the nav's stacking context, so the fix is at the nav level. */}
      <nav className="relative z-50" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1280px] mx-auto flex items-center justify-between" style={{ padding: '20px 24px' }}>
          <Link to="/" className="shrink-0"><HZLogo size={36} /></Link>
          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="px-4 py-2 text-sm font-semibold" style={{ color: 'var(--ink-700)' }}>{c.nav.features}</a>
            <a href="#pricing"  className="px-4 py-2 text-sm font-semibold" style={{ color: 'var(--ink-700)' }}>{c.nav.pricing}</a>
            {/* Language dropdown — three-language picker (EN / AR / TR). */}
            <div className="relative mx-2">
              <button
                onClick={() => setShowLangMenu((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={showLangMenu}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-slate-50"
                style={{ borderRadius: 999, border: '1px solid var(--border)', color: 'var(--ink-700)', background: '#fff' }}
              >
                <Globe size={13} weight="bold" />
                {{ en: 'EN', ar: 'العربية', tr: 'TR' }[lang]}
                <CaretDown size={10} weight="bold" className={cn('transition-transform', showLangMenu && 'rotate-180')} />
              </button>
              {showLangMenu && (
                <>
                  {/* Click-outside catcher — z-[110] so it covers the hero hover zones
                      but stays below the dropdown panel itself (z-[120]). */}
                  <div className="fixed inset-0 z-[110]" onClick={() => setShowLangMenu(false)} />
                  <div
                    role="listbox"
                    className="absolute top-full mt-1 z-[120] min-w-[140px] overflow-hidden"
                    style={{
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      background: '#fff',
                      boxShadow: 'var(--sh-lg)',
                      [isRtl ? 'right' : 'left']: 0,
                    } as React.CSSProperties}
                  >
                    {(['en', 'ar', 'tr'] as Lang[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLangTo(l); setShowLangMenu(false); }}
                        className={cn(
                          'w-full px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-3 transition-colors',
                          l === lang ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        <span>{{ en: 'English', ar: 'العربية', tr: 'Türkçe' }[l]}</span>
                        {l === lang && <Check size={13} weight="bold" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {loggedInUser ? (
              <button
                onClick={() => navigate(`/${loggedInUser.slug}`)}
                className="px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--brand-green)', color: '#fff', borderRadius: 999, boxShadow: '0 8px 20px -8px rgba(14,159,110,.6)' }}
              >
                {c.open} {loggedInUser.name}
              </button>
            ) : (
              <>
                <Link to="/user?tab=login" className="px-4 py-2 text-sm font-bold" style={{ color: 'var(--brand-green-deep)' }}>
                  {c.nav.login}
                </Link>
                <Link
                  to="/user?tab=register"
                  className="px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--brand-green)', color: '#fff', borderRadius: 999, boxShadow: '0 8px 20px -8px rgba(14,159,110,.6)' }}
                >
                  {c.nav.signup}
                </Link>
              </>
            )}
          </div>
          <button
            onClick={() => setMenuOpen((m) => !m)}
            className="md:hidden grid place-items-center"
            style={{ width: 40, height: 40, borderRadius: 12, color: 'var(--ink-900)' }}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="max-w-[1280px] mx-auto flex flex-col" style={{ padding: '12px 24px' }}>
              <a onClick={() => setMenuOpen(false)} href="#features" className="py-3 text-sm font-semibold" style={{ color: 'var(--ink-700)' }}>{c.nav.features}</a>
              <a onClick={() => setMenuOpen(false)} href="#pricing"  className="py-3 text-sm font-semibold" style={{ color: 'var(--ink-700)' }}>{c.nav.pricing}</a>

              {/* Flat 3-button language group — sits in the mobile menu as a single-row
                  picker so users see all three options at once and can tap directly. */}
              <div className="my-2 p-1 rounded-2xl flex gap-1" style={{ background: 'var(--surface-alt)' }}>
                {(['en', 'ar', 'tr'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLangTo(l); setMenuOpen(false); }}
                    className={cn(
                      'flex-1 py-2 text-xs font-bold rounded-xl transition-colors',
                      l === lang ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-600 hover:bg-white/60',
                    )}
                  >
                    {{ en: 'English', ar: 'العربية', tr: 'Türkçe' }[l]}
                  </button>
                ))}
              </div>
              {/* Auth CTAs styled as actual buttons (matches the desktop nav). Login is
                  the secondary outline-style button; Start Free is the primary green button. */}
              {loggedInUser ? (
                <button
                  onClick={() => navigate(`/${loggedInUser.slug}`)}
                  className="mt-2 py-3 text-sm font-bold text-center transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--brand-green)', color: '#fff', borderRadius: 999, boxShadow: '0 8px 20px -8px rgba(14,159,110,.6)' }}
                >
                  {c.open} {loggedInUser.name}
                </button>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Link
                    to="/user?tab=login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-center transition-colors"
                    style={{
                      background: '#fff',
                      border: '1.5px solid var(--ink-200)',
                      color: 'var(--brand-green-deep)',
                      borderRadius: 999,
                    }}
                  >
                    {c.nav.login}
                  </Link>
                  <Link
                    to="/user?tab=register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-center transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'var(--brand-green)',
                      color: '#fff',
                      borderRadius: 999,
                      boxShadow: '0 8px 20px -8px rgba(14,159,110,.6)',
                    }}
                  >
                    {c.nav.signup}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* <main> landmark wraps the page's primary content. Lighthouse a11y
          flagged "Document does not have a main landmark" — every page needs
          exactly one <main> for screen-reader users to jump straight to the
          content (skipping nav). The footer below stays outside. */}
      <main>

      {/* ───────── Hero ─────────
          Decorative shapes use raw `left`/`right` (not insetInline*) so they stay in
          the same physical positions regardless of text direction — purely aesthetic
          backgrounds shouldn't mirror with language. Both sides get a soft tint so the
          composition reads balanced in both LTR and RTL. */}
      <section className="relative overflow-hidden" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="absolute" style={{ left: -200, top: -120, width: 520, height: 520, borderRadius: '50%', background: 'var(--bg-cream)', opacity: 0.5, zIndex: 0 }} />
        <div className="absolute" style={{ right: -180, top: 280, width: 380, height: 380, borderRadius: '50%', background: 'var(--bg-mint)', opacity: 0.45, zIndex: 0 }} />
        <div className="bg-dots absolute hidden md:block" style={{ left: 60, top: 200, width: 120, height: 120, opacity: 0.4, zIndex: 1 }} />
        <div className="bg-dots absolute hidden md:block" style={{ right: 60, bottom: 100, width: 120, height: 120, opacity: 0.4, zIndex: 1 }} />

        <div className="max-w-[1280px] mx-auto relative z-10" style={{ padding: '48px 24px 32px' }}>
          {/* Headline */}
          <div className="hz-reveal text-center mx-auto" data-reveal="on" style={{ maxWidth: 880, marginBottom: 24 }}>
            <span className="eyebrow inline-block" style={{ marginBottom: 16 }}>{c.hero.eyebrow}</span>
            <h1 className="h-display" style={{
              fontSize: isAr ? 'clamp(2.5rem, 6vw, 4.5rem)' : 'clamp(2.75rem, 6.5vw, 5rem)',
              margin: '0 0 18px', color: 'var(--ink-900)',
              lineHeight: isAr ? 1.25 : 1.05,
            }}>
              {c.hero.title1}{' '}
              <span className="mark-underline">
                {c.hero.mark}
                <HZUnderline color="var(--brand-green)" />
              </span>
            </h1>
            <p className="mx-auto" style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--ink-500)', maxWidth: 680, margin: '0 auto 28px' }}>
              {c.hero.subtitle}
            </p>
            <div className="flex justify-center flex-wrap" style={{ gap: 14, marginBottom: 14 }}>
              <button
                onClick={() => { trackCTA('hero_start', 'hero'); navigate('/user?tab=register'); }}
                className="inline-flex items-center transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--brand-green)', color: '#fff',
                  padding: '16px 30px', fontSize: 16, fontWeight: 700,
                  borderRadius: 999, gap: 10,
                  boxShadow: '0 8px 20px -8px rgba(14,159,110,.6)',
                }}
              >
                {c.hero.cta}
                <ArrowRight size={18} weight="bold" style={{ transform: isRtl ? 'scaleX(-1)' : undefined }} />
              </button>
              {/* Watch-video CTA hidden until we have a video to ship.
                  Kept in the tree (commented) so re-enabling is a one-line
                  uncomment + restoring c.hero.cta2 copy.
              <button
                onClick={() => { trackCTA('hero_video', 'hero'); setVideoOpen(true); }}
                className="inline-flex items-center transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--surface)', border: '1.5px solid var(--ink-200)',
                  color: 'var(--ink-900)', padding: '14px 22px', fontSize: 16, fontWeight: 600,
                  borderRadius: 999, gap: 12,
                }}
              >
                <span className="grid place-items-center" style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-green)', color: '#fff', fontSize: 11,
                }}>
                  <Play size={11} weight="fill" />
                </span>
                {c.hero.cta2}
              </button>
              */}
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-300)' }}>{c.hero.trust}</p>
          </div>

          {/* Phone with floating BadgeChips — narrower container so chips hug the phone */}
          <div className="hidden lg:block relative mx-auto" style={{ height: 640, marginTop: 16, maxWidth: 980 }}>
            <div className="absolute" style={{ left: '50%', top: 30, transform: 'translateX(-50%)', width: 540, height: 540, borderRadius: '50%', background: 'var(--bg-mint)', zIndex: 0 }} />
            <div className="absolute" style={{ left: '50%', top: 80, transform: 'translateX(-50%)', width: 440, height: 440, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', zIndex: 0 }} />

            <span className="absolute" style={{ insetInlineStart: '30%', top: 60, width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-coral)', zIndex: 1 }} />
            <span className="absolute" style={{ insetInlineEnd: '32%', top: 100, width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-green)', zIndex: 1 }} />
            <span className="absolute" style={{ insetInlineStart: '20%', bottom: 60, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', zIndex: 1 }} />

            <div className="absolute" style={{ left: '50%', top: 0, transform: 'translateX(-50%)', zIndex: 3, animation: 'hzRevealUp .8s cubic-bezier(.2,.7,.2,1) both' }}>
              <PhoneFrame><CalendarScreenMock /></PhoneFrame>
            </div>

            {/* Outer-side chips: insetInlineEnd in LTR pulls right; in RTL pulls left (auto-mirror) */}
            <BadgeChip
              wrapStyle={{ top: 24, insetInlineEnd: 0, zIndex: 5 }}
              rot={3} floatAnim="hzFloatA" delay="0s"
              accent="var(--brand-green-deep)" accentBg="var(--brand-green-tint)"
              icon={<Calendar size={20} />}
              title={c.badges.cal.title} sub={c.badges.cal.sub}
            />
            <BadgeChip
              wrapStyle={{ top: 64, insetInlineStart: 0, zIndex: 5 }}
              rot={-4} floatAnim="hzFloatB" delay=".4s"
              accent="var(--accent-amber)" accentBg="var(--accent-amber-soft)"
              icon={<Receipt size={20} />}
              title={c.badges.inv.title} sub={c.badges.inv.sub}
            />
            <BadgeChip
              wrapStyle={{ top: 280, insetInlineStart: 0, zIndex: 5 }}
              rot={2} floatAnim="hzFloatC" delay=".7s"
              accent="var(--accent-coral)" accentBg="var(--accent-coral-soft)"
              icon={<ArrowsClockwise size={20} />}
              title={c.badges.sync.title} sub={c.badges.sync.sub} statusDot
            />
            <BadgeChip
              wrapStyle={{ top: 320, insetInlineEnd: 0, zIndex: 5 }}
              rot={-3} floatAnim="hzFloatA" delay="1s"
              accent="var(--brand-green-deep)" accentBg="var(--brand-green-tint)"
              icon={<ChartBar size={20} />}
              title={c.badges.rev.title} big={c.badges.rev.big} delta={c.badges.rev.delta}
            />
            <BadgeChip
              wrapStyle={{ bottom: 24, insetInlineStart: 24, zIndex: 5 }}
              rot={-2} floatAnim="hzFloatB" delay=".2s"
              accent="var(--accent-blue)" accentBg="var(--accent-blue-soft)"
              icon={<Globe size={20} />}
              title={c.badges.rtl.title} sub={c.badges.rtl.sub}
            />
            <BadgeChip
              wrapStyle={{ bottom: 40, insetInlineEnd: 24, zIndex: 5 }}
              rot={4} floatAnim="hzFloatC" delay=".55s"
              accent="var(--accent-purple)" accentBg="var(--accent-purple-soft)"
              icon={<DeviceMobile size={20} />}
              title={c.badges.install.title} sub={c.badges.install.sub}
            />
          </div>

          {/* Mobile: phone + 4 compact badge chips arranged tight around it.
              Smaller scale (0.7) + smaller chips so the cluster fits a 360px viewport. */}
          <div className="lg:hidden relative mx-auto" style={{ marginTop: 24, height: 540, maxWidth: 360 }}>
            {/* Backdrop circle — `left: 50%` (raw, not insetInlineStart) so it stays
                centered in BOTH text directions. insetInlineStart flips to `right` in
                RTL, but translateX is direction-agnostic, so the combo would put the
                element off-screen. */}
            <div className="absolute" style={{
              left: '50%', top: 30, transform: 'translateX(-50%)',
              width: 320, height: 320, borderRadius: '50%',
              background: 'var(--bg-mint)', zIndex: 0,
            }} />

            {/* Centered phone */}
            <div className="absolute" style={{
              left: '50%', top: 0,
              transform: 'translateX(-50%) scale(0.7)',
              transformOrigin: 'center top',
              zIndex: 3,
            }}>
              <PhoneFrame><CalendarScreenMock /></PhoneFrame>
            </div>

            {/* Badge chips — tighter offsets, smaller min-widths, only 4 chips
                (chosen to highlight the strongest selling points without crowding). */}
            <BadgeChip
              wrapStyle={{ top: 8, insetInlineEnd: 4, zIndex: 5 }}
              rot={3} floatAnim="hzFloatA" delay="0s"
              accent="var(--brand-green-deep)" accentBg="var(--brand-green-tint)"
              icon={<Calendar size={16} />}
              title={c.badges.cal.title} sub={c.badges.cal.sub}
            />
            <BadgeChip
              wrapStyle={{ top: 64, insetInlineStart: 4, zIndex: 5 }}
              rot={-4} floatAnim="hzFloatB" delay=".4s"
              accent="var(--accent-amber)" accentBg="var(--accent-amber-soft)"
              icon={<Receipt size={16} />}
              title={c.badges.inv.title}
            />
            <BadgeChip
              wrapStyle={{ bottom: 70, insetInlineStart: 0, zIndex: 5 }}
              rot={2} floatAnim="hzFloatC" delay=".7s"
              accent="var(--accent-coral)" accentBg="var(--accent-coral-soft)"
              icon={<ArrowsClockwise size={16} />}
              title={c.badges.sync.title} sub={c.badges.sync.sub} statusDot
            />
            <BadgeChip
              wrapStyle={{ bottom: 30, insetInlineEnd: 0, zIndex: 5 }}
              rot={-3} floatAnim="hzFloatA" delay="1s"
              accent="var(--brand-green-deep)" accentBg="var(--brand-green-tint)"
              icon={<ChartBar size={16} />}
              title={c.badges.rev.title} big={c.badges.rev.big}
            />
          </div>

          {/* Workspace shortcut */}
          {!loggedInUser && sessionResolved && (
            <div className="mt-12 max-w-[480px] mx-auto" style={{ padding: '0 24px' }}>
              <p className="text-center mb-2" style={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 600 }}>{c.workspaceCheck}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpenWorkspace(); }}
                  placeholder={c.workspacePh}
                  className="flex-1 outline-none"
                  style={{
                    background: '#fff', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600,
                    color: 'var(--ink-900)',
                  }}
                />
                <button
                  onClick={handleOpenWorkspace}
                  className="font-bold transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'var(--ink-900)', color: '#fff',
                    borderRadius: 12, padding: '12px 22px', fontSize: 14,
                  }}
                >
                  {c.open}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── Logos strip — static row, fade-in stagger on viewport entry.
          Only 3 supported channels (Airbnb / Gathern / Booking.com) so no scroll
          needed — they fit on one line on every viewport. Each name pulses subtly
          on a stagger so the row reads as alive without distracting motion. */}
      <section style={{ padding: '60px 0', background: 'var(--surface)' }}>
        <div className="max-w-[1280px] mx-auto" style={{ padding: '0 24px' }}>
          <p className="text-center" style={{ fontSize: 13, color: 'var(--ink-300)', marginBottom: 28, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {c.logos.intro}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 sm:gap-x-16 gap-y-4">
            {c.logos.items.map((n, i) => (
              <span
                key={i}
                className="hz-reveal whitespace-nowrap"
                data-reveal="on"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--ink-300)',
                  letterSpacing: '-0.02em',
                  // Each logo gets a longer transition delay so they enter in sequence;
                  // the hz-reveal class handles the actual fade+lift.
                  transitionDelay: `${i * 120}ms`,
                  // Subtle infinite breathing animation, staggered per item.
                  animation: `hzFadeIn 3s ease-in-out ${i * 0.6}s infinite alternate`,
                }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section id="features" style={{ padding: '120px 24px', background: 'var(--bg)' }}>
        <div className="max-w-[1280px] mx-auto">
          <div className="hz-reveal text-center mx-auto" data-reveal="on" style={{ marginBottom: 64, maxWidth: 720 }}>
            <span className="eyebrow">{c.features.eyebrow}</span>
            <h2 className="h-display" style={{ fontSize: 48, margin: '16px 0 16px', color: 'var(--ink-900)' }}>{c.features.title}</h2>
            <p style={{ fontSize: 18, color: 'var(--ink-500)', lineHeight: 1.6 }}>{c.features.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-6 md:auto-rows-[minmax(340px,_auto)]">
            <FeatureCard idx={0} span={2} item={c.f[0]} lang={lang}><CalendarHolo lang={lang} /></FeatureCard>
            <FeatureCard idx={1} span={2} item={c.f[1]} lang={lang}><InvoiceHolo lang={lang} /></FeatureCard>
            <FeatureCard idx={2} span={2} item={c.f[2]} lang={lang}><RtlHolo lang={lang} /></FeatureCard>

            <FeatureCard idx={0} span={3} item={c.f[3]} lang={lang} wide><ReportsHolo lang={lang} /></FeatureCard>
            <FeatureCard idx={1} span={3} item={c.f[6]} lang={lang} wide><ExpensesHolo lang={lang} /></FeatureCard>

            <FeatureCard idx={0} span={3} item={c.f[4]} lang={lang} wide><InstallHolo lang={lang} /></FeatureCard>
            <FeatureCard idx={1} span={3} item={c.f[5]} lang={lang} wide><ChannelsHolo lang={lang} /></FeatureCard>
          </div>
        </div>
      </section>

      {/* ───────── Testimonial ───────── */}
      <section style={{ padding: '120px 24px', background: 'var(--bg-cream)' }}>
        <div className="max-w-[900px] mx-auto text-center">
          <svg width="48" height="36" viewBox="0 0 48 36" fill="none" className="mx-auto block" style={{ marginBottom: 24 }}>
            <path d="M14 36c-7 0-12-5-12-13 0-9 7-18 18-23l5 7c-7 4-12 9-13 14h2c5 0 9 4 9 10s-4 5-9 5zm26 0c-7 0-12-5-12-13 0-9 7-18 18-23l5 7c-7 4-12 9-13 14h2c5 0 9 4 9 10s-4 5-9 5z" fill="var(--brand-green)" opacity="0.3" />
          </svg>
          <p className="h-display" style={{ fontSize: 32, lineHeight: 1.4, color: 'var(--ink-900)', margin: '0 0 32px', fontWeight: 600 }}>
            {c.testimonial.quote}
          </p>
          <div className="flex items-center justify-center" style={{ gap: 16 }}>
            <div className="grid place-items-center font-extrabold" style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--brand-green-soft)', color: 'var(--brand-green-deep)', fontSize: 22,
            }}>
              أ
            </div>
            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div className="font-bold" style={{ color: 'var(--ink-900)' }}>{c.testimonial.name}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-500)' }}>{c.testimonial.role}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Pricing — 4 plans ───────── */}
      <section id="pricing" style={{ padding: '120px 24px', background: 'var(--bg-cream)' }}>
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mx-auto" style={{ maxWidth: 720, marginBottom: 60 }}>
            <span className="eyebrow">{c.pricing.eyebrow}</span>
            <h2 className="h-display" style={{ fontSize: 48, margin: '16px 0 16px', color: 'var(--ink-900)' }}>{c.pricing.title}</h2>
            <p style={{ fontSize: 18, color: 'var(--ink-500)' }}>{c.pricing.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-[1100px] mx-auto" style={{ gap: 20 }}>
            {c.pricing.plans.map((p) => {
              const showCrossout = promoOn && 'oldPrice' in p && p.oldPrice && p.price !== p.oldPrice;
              const isPopular = p.recommended;
              return (
                <div
                  key={p.id}
                  className="relative flex flex-col"
                  style={{
                    background: isPopular ? 'var(--ink-900)' : '#fff',
                    color: isPopular ? '#fff' : 'var(--ink-900)',
                    border: isPopular ? 'none' : '1px solid var(--border)',
                    borderRadius: 24, padding: 28,
                    transform: isPopular ? 'scale(1.02)' : undefined,
                    boxShadow: isPopular ? '0 30px 60px -20px rgba(11,27,58,0.5)' : 'var(--sh-sm)',
                    direction: isAr ? 'rtl' : 'ltr',
                  }}
                >
                  {isPopular && (
                    <span className="absolute font-bold uppercase" style={{
                      top: -14, insetInlineStart: 28,
                      background: 'var(--brand-green)', color: '#fff',
                      padding: '6px 14px', borderRadius: 999,
                      fontSize: 11, letterSpacing: '0.08em',
                    }}>
                      {c.pricing.recommended}
                    </span>
                  )}
                  {showCrossout && !isPopular && (
                    <span className="absolute font-bold" style={{
                      top: -10, insetInlineEnd: 20,
                      background: 'var(--accent-amber-soft)', color: 'var(--accent-amber)',
                      padding: '4px 10px', borderRadius: 999, fontSize: 10,
                    }}>
                      {c.pricing.save}
                    </span>
                  )}

                  <h3 className="font-bold" style={{ fontSize: 18, margin: '0 0 6px' }}>{p.name}</h3>
                  <p style={{
                    fontSize: 13, color: isPopular ? 'rgba(255,255,255,0.6)' : 'var(--ink-500)',
                    margin: '0 0 18px', lineHeight: 1.4,
                  }}>{p.tagline}</p>

                  <div className="mb-5" dir="ltr">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {showCrossout && (
                        <span className="line-through font-bold" style={{
                          fontSize: 14,
                          color: isPopular ? 'rgba(255,255,255,0.4)' : 'var(--ink-300)',
                        }}>
                          {CURRENCY_SYMBOL}{(p as any).oldPrice}
                        </span>
                      )}
                      <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em' }}>{CURRENCY_SYMBOL}{p.price}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isPopular ? 'rgba(255,255,255,0.6)' : 'var(--ink-500)' }}>{c.pricing.perYear}</span>
                    </div>
                    {(lang === 'ar' || lang === 'en') && (
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: isPopular ? 'rgba(255,255,255,0.55)' : 'var(--ink-300)' }}>
                        ≈ {lang === 'ar' ? '﷼' : 'SAR'} {Math.round(p.price * 3.75)} {c.pricing.perYear}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handlePlanCta(p.id)}
                    className="font-bold transition-all hover:-translate-y-0.5"
                    style={{
                      width: '100%', padding: '12px 20px',
                      borderRadius: 999, fontSize: 14, marginBottom: 20,
                      background: isPopular ? '#fff' : p.id === 'enterprise' ? 'var(--ink-900)' : 'var(--brand-green)',
                      color: isPopular ? 'var(--ink-900)' : '#fff',
                    }}
                  >
                    {p.cta}
                  </button>

                  <ul className="flex flex-col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start" style={{ gap: 10, fontSize: 13, color: isPopular ? 'rgba(255,255,255,0.85)' : 'var(--ink-700)' }}>
                        <Check size={16} weight="bold" style={{ color: 'var(--brand-green)', flexShrink: 0, marginTop: 2 }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-center" style={{ marginTop: 32, fontSize: 14, color: 'var(--ink-300)', fontWeight: 500 }}>
            {c.pricing.note}
          </p>
        </div>
      </section>

      {/* ───────── FAQ ─────────
          Same Q/A set that's emitted as FAQPage JSON-LD higher up — duplicating
          here makes them visible to users (and Google rewards in-page text that
          matches the structured data). <details>/<summary> gives free
          accessibility: keyboard toggle, screen-reader semantics, no JS. */}
      <section id="faq" style={{ padding: '80px 24px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-[860px] mx-auto">
          <div className="text-center" style={{ marginBottom: 32 }}>
            <span className="eyebrow inline-block" style={{ marginBottom: 12 }}>
              {isAr ? 'الأسئلة الشائعة' : lang === 'tr' ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'}
            </span>
            <h2 className="h-display" style={{ fontSize: 40, margin: '8px 0 0', color: 'var(--ink-900)' }}>
              {isAr ? 'الأسئلة الأكثر شيوعاً' : lang === 'tr' ? 'En çok sorulanlar' : 'Common questions'}
            </h2>
          </div>
          <div className="flex flex-col" style={{ gap: 12 }}>
            {([
              // ── Original Q/A set ──
              {
                q: { en: 'What is Hujuzatk PMS?',
                     ar: 'ما هو نظام حجوزاتك PMS؟',
                     tr: 'Hujuzatk PMS nedir?' },
                a: { en: 'Hujuzatk is a cloud-based Hotel and Property Management System (PMS) designed for hotels, apartments, and vacation rentals. It features a 5-year booking calendar, automated invoicing, financial analytics, and full Arabic and English support.',
                     ar: 'حجوزاتك هو نظام إدارة الحجوزات والفنادق المبني على السحابة، مصمم للفنادق والشقق والإيجارات السياحية. يتميز بتقويم حجوزات لـ5 سنوات، وفوترة تلقائية، وتحليلات مالية، ودعم كامل للغة العربية والإنجليزية.',
                     tr: 'Hujuzatk; oteller, daireler ve kısa süreli kiralamalar için tasarlanmış, bulut tabanlı bir Otel ve Mülk Yönetim Sistemidir (PMS). 5 yıllık rezervasyon takvimi, otomatik faturalama, finansal analitik ve tam Arapça / İngilizce desteği sunar.' },
              },
              {
                q: { en: 'Does Hujuzatk support Arabic language?',
                     ar: 'هل حجوزاتك يدعم اللغة العربية؟',
                     tr: 'Hujuzatk Arapça dilini destekler mi?' },
                a: { en: 'Yes. Hujuzatk has native Arabic RTL support including Arabic date formats, SAR and GCC currencies, and a complete right-to-left layout throughout the entire application.',
                     ar: 'نعم، يدعم حجوزاتك اللغة العربية بشكل كامل مع تخطيط RTL أصيل، وتنسيقات التواريخ العربية، والريال السعودي وعملات الخليج، وواجهة كاملة من اليمين إلى اليسار.',
                     tr: 'Evet. Hujuzatk; Arapça tarih formatları, SAR ve Körfez para birimleri ve uygulama genelinde tam sağdan-sola düzen dahil olmak üzere yerel Arapça RTL desteğine sahiptir.' },
              },
              {
                q: { en: 'How much does Hujuzatk cost?',
                     ar: 'كم تكلفة حجوزاتك؟',
                     tr: 'Hujuzatk ne kadar?' },
                a: { en: 'Four tiers, billed annually: Trial (free 14 days, 3 rooms), Basic $40/year (up to 10 rooms), Pro $90/year (up to 30 rooms, with automatic Airbnb / Gathern / Booking.com channel sync), and Enterprise $140/year (unlimited rooms). All paid tiers include unlimited bookings, full reporting, multi-language support, and the 5-year calendar. A 14-day free trial is included — no credit card required.',
                     ar: 'أربع خطط بفوترة سنوية: التجريبية (مجانية 14 يوم، 3 غرف)، الأساسية 40$/سنة (حتى 10 غرف)، المحترفة 90$/سنة (حتى 30 غرفة، مع مزامنة تلقائية لـ Airbnb وجاثرين وBooking.com)، والمؤسسات 140$/سنة (غرف غير محدودة). كل الخطط المدفوعة تشمل حجوزات غير محدودة وتقارير كاملة ودعم متعدد اللغات وتقويم 5 سنوات. تتوفر تجربة مجانية 14 يوماً بدون بطاقة ائتمان.',
                     tr: 'Dört plan, yıllık faturalandırma: Deneme (14 gün ücretsiz, 3 oda), Basic 40 $/yıl (10 odaya kadar), Pro 90 $/yıl (30 odaya kadar, otomatik Airbnb / Gathern / Booking.com kanal senkronizasyonu ile) ve Enterprise 140 $/yıl (sınırsız oda). Tüm ücretli planlar sınırsız rezervasyon, tam raporlama, çoklu dil desteği ve 5 yıllık takvim içerir. 14 gün ücretsiz deneme dahildir — kredi kartı gerekmez.' },
              },

              // ── From customer questions ──
              {
                q: { en: 'Is there a mobile app, or only a website?',
                     ar: 'هل يوجد تطبيق للموبايل أم فقط موقع؟',
                     tr: 'Mobil uygulama var mı, yoksa sadece web sitesi mi?' },
                a: { en: 'Both. Hujuzatk is a Progressive Web App — install it to your home screen from any modern browser in one tap. It runs full-screen like a native app, works offline, and sends push notifications. No App Store or Play Store download required. On iPhone: open in Safari → Share → Add to Home Screen. On Android: Chrome shows an "Install app" prompt automatically.',
                     ar: 'الاثنان معاً. حجوزاتك تطبيق ويب تقدمي (PWA) — ثبّته على الشاشة الرئيسية لجهازك من أي متصفح حديث بنقرة واحدة. يعمل بملء الشاشة كتطبيق أصلي، يدعم العمل دون اتصال، ويرسل إشعارات. لا تحتاج تنزيله من App Store أو Play Store. على iPhone: افتح في Safari → مشاركة → إضافة إلى الشاشة الرئيسية. على Android: Chrome يعرض زر "تثبيت التطبيق" تلقائياً.',
                     tr: 'İkisi de. Hujuzatk bir Progressive Web App — herhangi bir modern tarayıcıdan tek dokunuşla ana ekrana yükleyin. Yerel uygulama gibi tam ekran çalışır, çevrimdışı çalışır ve push bildirimleri gönderir. App Store veya Play Store indirme gerekmez.' },
              },
              {
                q: { en: 'Does Hujuzatk work for a 60-room hotel?',
                     ar: 'هل حجوزاتك يناسب فندقاً بـ 60 غرفة؟',
                     tr: '60 odalı bir otel için uygun mu?' },
                a: { en: 'Yes. The Pro plan covers up to 30 rooms; for 60+ rooms we offer the Enterprise plan with unlimited rooms. The calendar grid is optimised for hundreds of rooms across a 5-year horizon with zero scroll lag — we routinely test with much larger properties. Contact us for Enterprise pricing.',
                     ar: 'نعم. خطة Pro تدعم حتى 30 غرفة، وخطة Enterprise تدعم عدداً غير محدود من الغرف وهي المناسبة للفنادق الأكبر. تقويم الحجوزات محسّن للعمل مع مئات الغرف على مدى 5 سنوات بدون أي تأخير. تواصل معنا للحصول على سعر Enterprise.',
                     tr: 'Evet. Pro planı 30 odaya kadar destekler; 60+ oda için Enterprise plan sınırsız oda destekler. Takvim, 5 yıllık ufkun üzerinde yüzlerce oda için sıfır gecikme ile optimize edilmiştir.' },
              },
              {
                q: { en: 'Can I customize the invoice design and add my logo?',
                     ar: 'هل يمكنني تخصيص تصميم الفاتورة وإضافة لوجو؟',
                     tr: 'Fatura tasarımını özelleştirebilir ve logomu ekleyebilir miyim?' },
                a: { en: 'Yes. From Settings → Company Profile you can upload your logo, set your company name, address, phone, email, tax ID, and a custom invoice footer. All these appear automatically on every printed and PDF invoice. Invoices are bilingual (Arabic / English / Turkish) and adapt to the language of the guest entry.',
                     ar: 'نعم. من الإعدادات ← بيانات الشركة يمكنك رفع شعارك، وتحديد اسم الشركة والعنوان والهاتف والبريد والرقم الضريبي ونص في تذييل الفاتورة. تظهر هذه البيانات تلقائياً على كل فاتورة مطبوعة أو PDF. الفواتير ثنائية اللغة (عربي / إنجليزي / تركي).',
                     tr: 'Evet. Ayarlar → Şirket Profili\'nden logonuzu yükleyebilir, şirket adınızı, adresinizi, telefonunuzu, e-postanızı, vergi numaranızı ve özel bir fatura alt bilgisi ayarlayabilirsiniz.' },
              },
              {
                q: { en: 'How many users can use Hujuzatk at the same time? Is it cloud-based or does it work offline?',
                     ar: 'كم شخص يستطيع استخدام البرنامج في نفس الوقت؟ هل هو سحابي أم يعمل بدون إنترنت؟',
                     tr: 'Aynı anda kaç kullanıcı kullanabilir? Bulut tabanlı mı yoksa çevrimdışı çalışır mı?' },
                a: { en: 'Unlimited concurrent users on the same account — share the login with your entire front desk and they all get the same full-access view in real time. Hujuzatk is cloud-based (changes sync across devices instantly via our managed Postgres database) AND works offline (PWA caches data locally; the calendar, booking list, and invoice screens stay usable without internet, and pending changes sync as soon as you reconnect).',
                     ar: 'عدد المستخدمين غير محدود على نفس الحساب — يمكنك مشاركة بيانات الدخول مع كل موظفي الاستقبال ويحصل الجميع على صلاحيات كاملة في الوقت الفعلي. حجوزاتك سحابي (التغييرات تتزامن فوراً بين جميع الأجهزة عبر قاعدة بيانات Postgres مُدارة) ويعمل أيضاً بدون إنترنت (تطبيق الويب التقدمي يحفظ البيانات محلياً، فيبقى التقويم وقائمة الحجوزات والفواتير قابلة للاستخدام، وتتم المزامنة تلقائياً عند عودة الاتصال).',
                     tr: 'Aynı hesapta sınırsız eşzamanlı kullanıcı — giriş bilgilerini tüm resepsiyon ekibinizle paylaşın, hepsi gerçek zamanlı tam erişim alır. Hujuzatk bulut tabanlı (değişiklikler yönetilen Postgres veritabanı üzerinden cihazlar arası anında senkronize) VE çevrimdışı çalışır (PWA verileri yerel olarak önbelleğe alır).' },
              },
            ] as const).map((item, i) => (
              <details
                key={i}
                className="group"
                style={{
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 16,
                  padding: '18px 22px',
                }}
              >
                <summary
                  className="cursor-pointer flex items-center justify-between gap-4 list-none"
                  style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)' }}
                >
                  <span>{item.q[lang]}</span>
                  <span
                    aria-hidden
                    className="transition-transform group-open:rotate-45 shrink-0"
                    style={{ fontSize: 22, lineHeight: 1, color: 'var(--brand-green)' }}
                  >
                    +
                  </span>
                </summary>
                <p
                  className="mt-3"
                  style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-500)', margin: '12px 0 0' }}
                >
                  {item.a[lang]}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section style={{ padding: '120px 24px' }}>
        <div className="max-w-[1100px] mx-auto relative overflow-hidden text-center" style={{
          background: 'linear-gradient(135deg, var(--brand-green) 0%, var(--brand-green-deep) 100%)',
          color: '#fff', borderRadius: 36, padding: '72px 40px',
        }}>
          <div className="absolute" style={{ insetInlineEnd: -100, top: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div className="absolute" style={{ insetInlineStart: -60, bottom: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <h2 className="h-display relative" style={{ fontSize: 48, margin: '0 0 18px' }}>{c.cta.title}</h2>
          <p className="relative" style={{ fontSize: 18, opacity: 0.9, marginBottom: 32 }}>{c.cta.desc}</p>
          <div className="inline-flex flex-wrap justify-center relative" style={{ gap: 14 }}>
            <button
              onClick={() => { trackCTA('bottom_cta_start', 'cta'); navigate('/user?tab=register'); }}
              className="font-bold transition-all hover:-translate-y-0.5"
              style={{ background: '#fff', color: 'var(--brand-green-deep)', padding: '16px 30px', fontSize: 15, borderRadius: 999 }}
            >
              {c.cta.button}
            </button>
            <a
              href="https://wa.me/905523205496?text=Hi%20Hujuzatk"
              target="_blank" rel="noopener noreferrer"
              onClick={() => trackCTA('bottom_cta_talk', 'cta')}
              className="font-bold transition-all hover:-translate-y-0.5 inline-flex items-center"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', padding: '14px 26px', fontSize: 15, borderRadius: 999 }}
            >
              {c.cta.button2}
            </a>
          </div>
        </div>
      </section>

      </main>

      {/* ───────── Footer ───────── */}
      <footer style={{ background: 'var(--ink-900)', color: '#fff', padding: '60px 24px 32px' }}>
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4" style={{ gap: 40, marginBottom: 40 }}>
            <div className="md:col-span-1">
              {/* Footer: keep the green rect (mono=false default) so the white ح inside
                  stays visible against the navy footer. Only the wordmark uses #fff. */}
              <HZLogo size={32} color="#fff" />
              <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 320 }}>
                {c.footer.tagline}
              </p>
              <a
                href="https://wa.me/905523205496"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center mt-4"
                style={{ gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#25d366' }} />
                {c.footer.whatsapp}
              </a>
            </div>
            <div>
              <h3 className="font-bold" style={{ fontSize: 14, marginBottom: 16 }}>{c.footer.product}</h3>
              <ul className="flex flex-col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                {c.footer.productLinks.map((it: string, j: number) => (
                  <li key={j}>
                    <a href={j === 0 ? '#features' : j === 1 ? '#pricing' : '#'} style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{it}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold" style={{ fontSize: 14, marginBottom: 16 }}>{c.footer.company}</h3>
              <ul className="flex flex-col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                <li><Link to="/about"   style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{c.footer.companyLinks[0]}</Link></li>
                <li><Link to="/story"   style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{c.footer.companyLinks[1]}</Link></li>
                <li><Link to="/contact" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{c.footer.companyLinks[2]}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold" style={{ fontSize: 14, marginBottom: 16 }}>{c.footer.legal}</h3>
              <ul className="flex flex-col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                <li><Link to="/privacy" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{c.footer.legalLinks[0]}</Link></li>
                <li><Link to="/terms" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{c.footer.legalLinks[1]}</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex justify-between flex-wrap" style={{
            borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20,
            fontSize: 13, color: 'rgba(255,255,255,0.4)', gap: 12,
          }}>
            <span>{c.footer.rights}</span>
            <span>{c.footer.location}</span>
          </div>
        </div>
      </footer>

      {/* ───────── Modals ───────── */}
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} lang={lang} />
      {showPromo && !loggedInUser && (
        <PromoPopup
          lang={lang}
          strings={{
            title: c.pricing.promo.title,
            subtitle: c.pricing.promo.subtitle,
            perYear: c.pricing.perYear,
            was: c.pricing.was,
            save: c.pricing.save,
            recommended: c.pricing.recommended,
            plans: c.pricing.plans,
          }}
          onStart={handlePromoStart}
        />
      )}

      {/* ───────── Floating WhatsApp ───────── */}
      <a
        href="https://wa.me/905523205496"
        target="_blank" rel="noopener noreferrer"
        aria-label="WhatsApp Support"
        className="fixed z-40 grid place-items-center transition-all hover:scale-110"
        style={{
          bottom: 24, insetInlineEnd: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
          color: '#fff',
          boxShadow: '0 12px 28px -8px rgba(37, 211, 102, .55)',
        }}
      >
        <span className="absolute inset-0 rounded-full" style={{ background: 'rgba(74, 222, 128, 0.4)', animation: 'hzPulse 1.8s ease-in-out infinite' }} />
        <svg width="26" height="26" viewBox="0 0 32 32" fill="white">
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.872 2.722.872.4 0 1.117-.058 1.43-.301.388-.302.673-.953.673-1.444 0-.156-.043-.301-.072-.444-.115-.422-1.917-1.234-2.018-1.205zM16.117 27.71c-2.063 0-4.083-.587-5.832-1.66l-.418-.25-4.318 1.131 1.158-4.21-.272-.434C5.234 20.4 4.578 18.214 4.578 16c0-6.357 5.182-11.54 11.54-11.54 6.36 0 11.54 5.183 11.54 11.54-.013 6.357-5.197 11.71-11.54 11.71zm0-25.117c-7.4 0-13.41 6.014-13.41 13.41 0 2.379.625 4.683 1.81 6.736l-1.93 7.057 7.213-1.886a13.39 13.39 0 0 0 6.347 1.622h.012c7.4 0 13.426-6.013 13.426-13.41 0-3.59-1.396-6.957-3.94-9.495a13.45 13.45 0 0 0-9.527-3.943z" />
        </svg>
      </a>
    </div>
  );
}

// =====================================================================
// PrivacyPolicy + TermsOfService (kept simple, in new design language)
// =====================================================================

// Per-route SEO. SPA shares <head> with index.html, so we patch document.title +
// meta[name=description] on mount for Legal pages. Without this, Google sees the
// landing-page title on /terms and /privacy and may classify them as duplicates
// or thin content.
function useRouteHead(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
      created = true;
    }
    const prevDesc = meta.content;
    meta.content = description;
    return () => {
      document.title = prevTitle;
      if (created && meta) meta.remove();
      else if (meta) meta.content = prevDesc;
    };
  }, [title, description]);
}

export function PrivacyPolicy() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const isAr = lang === 'ar';
  useRouteHead(
    isAr ? 'سياسة الخصوصية | حجوزاتك' : 'Privacy Policy | Hujuzatk PMS',
    isAr
      ? 'سياسة خصوصية حجوزاتك: ما البيانات التي نجمعها، كيف نستخدمها، حقوقك، وكيفية حذف حسابك أو طلب بياناتك.'
      : 'Hujuzatk Privacy Policy — what data we collect, how we use it, your rights under GDPR, data retention, security practices, and how to delete your account or export data.'
  );
  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next); localStorage.setItem('landing-lang', next);
  };
  const H2 = (props: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-900)', marginBottom: 6 }}>{props.children}</h2>
  );
  return (
    <main className="min-h-screen" dir={isAr ? 'rtl' : 'ltr'} style={{ background: 'var(--bg)', padding: '60px 24px', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-en)' }}>
      <div className="max-w-[760px] mx-auto" style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 24, padding: 36, color: 'var(--ink-900)',
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 18 }}>
          <h1 className="h-display" style={{ fontSize: 30, margin: 0 }}>{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
          <button onClick={cycleLang} className="inline-flex items-center gap-1.5 font-bold" style={{
            padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)',
            color: 'var(--ink-700)', fontSize: 12, background: '#fff',
          }}>
            <Globe size={14} /> {{ en: 'العربية', ar: 'Türkçe', tr: 'English' }[lang]}
          </button>
        </div>
        <p style={{ marginBottom: 20, fontSize: 11, color: 'var(--ink-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {isAr ? `آخر تحديث: ${new Date().toLocaleDateString('ar')}` : `Last updated: ${new Date().toLocaleDateString()}`}
        </p>
        <div className="flex flex-col" style={{ gap: 18, color: 'var(--ink-700)', lineHeight: 1.6 }}>
          {isAr ? (
            <>
              <p>تشرح هذه السياسة كيف يتعامل حجوزاتك مع المعلومات الشخصية لمالكي العقارات ومديري الفنادق والشقق الذين يستخدمون منصتنا لإدارة الحجوزات. باستخدامك للخدمة، فإنك توافق على ممارسات جمع البيانات الموضحة هنا.</p>

              <div><H2>١. ما البيانات التي نجمعها</H2><p>نجمع المعلومات التي تقدمها مباشرة عند إنشاء حساب: الاسم، البريد الإلكتروني، رقم الهاتف، اسم الشركة، والعملة المفضلة. عند إضافة حجوزات، نخزن أسماء الضيوف، أرقام الهواتف، أرقام الهوية، تواريخ الإقامة، أسعار الليلة، والملاحظات. إذا فعّلت تكامل القنوات (Airbnb, Booking.com, Gathren) فإننا نستورد بيانات الحجوزات عبر روابط iCal التي تزودنا بها.</p></div>

              <div><H2>٢. كيف نستخدم بياناتك</H2><p>تُستخدم بياناتك فقط لتقديم الخدمة لك: عرض تقويم الحجوزات، توليد الفواتير، إنتاج التقارير المالية، والمزامنة مع قنوات الحجز الخارجية. لا نبيع بياناتك ولا نشاركها مع جهات إعلانية. قد نستخدم البريد الإلكتروني المرتبط بحسابك لإرسال إشعارات تشغيلية (تأكيد التسجيل، إعادة تعيين كلمة المرور، تغييرات الاشتراك).</p></div>

              <div><H2>٣. مكان تخزين البيانات</H2><p>تُخزن بياناتك على بنية تحتية سحابية (Supabase) في مراكز بيانات آمنة. جميع الاتصالات بين متصفحك وخوادمنا مشفرة عبر TLS. كلمات المرور مُشفرة باستخدام bcrypt ولا تُخزن بصيغة نصية أبداً.</p></div>

              <div><H2>٤. حقوقك</H2><p>يحق لك في أي وقت: (١) الوصول إلى بياناتك وتنزيلها بصيغة CSV من شاشة الإعدادات، (٢) تعديل أي معلومة على حسابك، (٣) طلب حذف حسابك وجميع بياناتك المرتبطة به نهائياً عبر مراسلة الدعم. عند حذف الحساب، تُحذف البيانات خلال 30 يوماً ما عدا السجلات المطلوبة قانونياً (الفواتير الضريبية).</p></div>

              <div><H2>٥. ملفات تعريف الارتباط (Cookies)</H2><p>نستخدم ملفات تعريف ارتباط أساسية للحفاظ على جلسة الدخول، تذكر تفضيلات اللغة، والقياس التحليلي المُجمَّع. لا نستخدم ملفات تعريف ارتباط إعلانية ولا نتتبعك عبر مواقع أخرى.</p></div>

              <div><H2>٦. الاحتفاظ بالبيانات</H2><p>نحتفظ بحجوزاتك ومعلومات الضيوف طوال فترة نشاط حسابك. عند الإلغاء، يُعطى مهلة 90 يوماً لاستعادة البيانات، ثم تُحذف نهائياً ما عدا السجلات المالية المطلوبة بموجب القانون المحلي.</p></div>

              <div><H2>٧. التواصل</H2><p>لأي سؤال أو طلب يخص الخصوصية، راسلنا عبر <a href="https://wa.me/905523205496" style={{ color: 'var(--brand-green-deep)', fontWeight: 700 }}>WhatsApp</a> أو البريد المرفق في موقعنا.</p></div>
            </>
          ) : (
            <>
              <p>This policy explains how Hujuzatk handles personal information for property owners and hotel/apartment managers using our platform to manage bookings. By using the service you consent to the data practices described here.</p>

              <div><H2>1. What we collect</H2><p>We collect information you provide directly when you create an account: name, email, phone, company name, and preferred currency. When you add bookings, we store guest names, phone numbers, ID numbers, stay dates, nightly rates, deposits, and notes. If you enable channel integrations (Airbnb, Booking.com, Gathren), we import booking data via the iCal URLs you provide us.</p></div>

              <div><H2>2. How we use your data</H2><p>Your data is used only to deliver the service to you: rendering the booking calendar, generating invoices, producing financial reports, and syncing with external booking channels. We do not sell your data and do not share it with advertisers. We may use the email on your account to send operational notifications (signup confirmation, password reset, subscription changes).</p></div>

              <div><H2>3. Where your data lives</H2><p>Your data is stored on managed cloud infrastructure (Supabase) in secure data centers. All traffic between your browser and our servers is encrypted with TLS. Passwords are hashed with bcrypt and never stored in plain text.</p></div>

              <div><H2>4. Your rights</H2><p>At any time you can: (1) access and export your data as CSV from the Settings screen, (2) edit any information on your account, (3) request permanent deletion of your account and all associated data by contacting support. After deletion, data is removed within 30 days except for legally required records (tax invoices).</p></div>

              <div><H2>5. Cookies</H2><p>We use essential cookies to maintain your login session, remember your language preference, and aggregate analytics. We do not use advertising cookies and do not track you across other websites.</p></div>

              <div><H2>6. Data retention</H2><p>We keep your bookings and guest information for as long as your account is active. On cancellation, we give a 90-day grace period for data export, after which the data is permanently deleted except for financial records required by local law.</p></div>

              <div><H2>7. Contact</H2><p>For any privacy question or request, reach us via <a href="https://wa.me/905523205496" style={{ color: 'var(--brand-green-deep)', fontWeight: 700 }}>WhatsApp</a> or the email shown on our contact page.</p></div>
            </>
          )}
        </div>
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <Link to="/" className="inline-flex items-center font-bold" style={{ color: 'var(--brand-green-deep)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', gap: 8 }}>
            {isAr ? '→ العودة للرئيسية' : '← Back to Home'}
          </Link>
        </div>
      </div>
    </main>
  );
}

export function TermsOfService() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const isAr = lang === 'ar';
  useRouteHead(
    isAr ? 'شروط الخدمة | حجوزاتك' : 'Terms of Service | Hujuzatk PMS',
    isAr
      ? 'شروط استخدام منصة حجوزاتك لإدارة الحجوزات الفندقية: الاشتراك، التجربة المجانية، حدود المسؤولية، إنهاء الحساب، والقانون المعمول به.'
      : 'Hujuzatk Terms of Service — subscription terms, free trial conditions, acceptable use, account termination, liability limits, and the governing law for our property management platform.'
  );
  const cycleLang = () => {
    const order: Lang[] = ['en', 'ar', 'tr'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next); localStorage.setItem('landing-lang', next);
  };
  const H2 = (props: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-900)', marginBottom: 6 }}>{props.children}</h2>
  );
  return (
    <main className="min-h-screen" dir={isAr ? 'rtl' : 'ltr'} style={{ background: 'var(--bg)', padding: '60px 24px', fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-en)' }}>
      <div className="max-w-[760px] mx-auto" style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 24, padding: 36, color: 'var(--ink-900)',
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 18 }}>
          <h1 className="h-display" style={{ fontSize: 30, margin: 0 }}>{isAr ? 'شروط الخدمة' : 'Terms of Service'}</h1>
          <button onClick={cycleLang} className="inline-flex items-center gap-1.5 font-bold" style={{
            padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)',
            color: 'var(--ink-700)', fontSize: 12, background: '#fff',
          }}>
            <Globe size={14} /> {{ en: 'العربية', ar: 'Türkçe', tr: 'English' }[lang]}
          </button>
        </div>
        <p style={{ marginBottom: 20, fontSize: 11, color: 'var(--ink-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {isAr ? `آخر تحديث: ${new Date().toLocaleDateString('ar')}` : `Last updated: ${new Date().toLocaleDateString()}`}
        </p>
        <div className="flex flex-col" style={{ gap: 18, color: 'var(--ink-700)', lineHeight: 1.6 }}>
          {isAr ? (
            <>
              <p>تحكم هذه الشروط استخدامك لمنصة حجوزاتك لإدارة العقارات. باستخدامك للخدمة فإنك تقر بقراءتها والموافقة عليها.</p>

              <div><H2>١. قبول الشروط</H2><p>بإنشائك حساباً على حجوزاتك أو باستخدامك للخدمة، توافق على الالتزام بهذه الشروط. إذا كنت تستخدم الخدمة بالنيابة عن شركة، فأنت تؤكد أن لديك الصلاحية لإلزام تلك الشركة بهذه الشروط.</p></div>

              <div><H2>٢. الاشتراك والتجربة المجانية</H2><p>تحصل الحسابات الجديدة على فترة تجريبية مجانية لمدة 14 يوماً مع وصول كامل لميزات الخطة التجريبية. بعد انتهاء التجربة، يتطلب استمرار الوصول اشتراكاً نشطاً. يتم تجديد الاشتراك تلقائياً ما لم يتم إلغاؤه قبل تاريخ التجديد. الرسوم غير قابلة للاسترداد عن الفترات الجزئية.</p></div>

              <div><H2>٣. مسؤوليات المستخدم</H2><p>أنت مسؤول عن: (١) الحفاظ على سرية كلمة المرور وبيانات تسجيل الدخول، (٢) دقة المعلومات التي تدخلها (أسماء الضيوف، التواريخ، الأسعار)، (٣) التأكد من امتثال استخدامك للخدمة لجميع القوانين المعمول بها في بلد عملك، بما في ذلك قوانين حماية البيانات والضرائب.</p></div>

              <div><H2>٤. الاستخدام المسموح</H2><p>يُمنع منعاً باتاً: استخدام الخدمة لأي غرض غير مشروع، محاولة الوصول غير المصرح به إلى أنظمتنا، استخدام الخدمة لإرسال رسائل مزعجة، أو إعادة بيع الخدمة دون إذن خطي مسبق.</p></div>

              <div><H2>٥. تكامل القنوات الخارجية</H2><p>عند ربط حساب Airbnb أو Booking.com أو Gathren عبر روابط iCal، فإنك تقر بأن البيانات المستوردة تخضع لشروط الخدمة الخاصة بتلك القنوات. حجوزاتك تستورد البيانات فقط ولا تتحكم في محتواها. اختلافات المزامنة بين القنوات (الحجز المزدوج، التأخير في التحديث) ليست من مسؤوليتنا.</p></div>

              <div><H2>٦. حدود المسؤولية</H2><p>تُقدم الخدمة "كما هي" دون ضمانات صريحة أو ضمنية. لن نكون مسؤولين عن أي خسارة مالية، فقدان بيانات، أو ضرر تبعي ناتج عن استخدام الخدمة. مسؤوليتنا القصوى في أي حال محدودة بالمبلغ الذي دفعته خلال 12 شهراً السابقة.</p></div>

              <div><H2>٧. إنهاء الحساب</H2><p>يمكنك إلغاء حسابك في أي وقت من شاشة الإعدادات. نحتفظ بحقنا في تعليق أو إنهاء حسابك إذا انتهكت هذه الشروط. عند الإلغاء، يمكنك تصدير بياناتك خلال 90 يوماً قبل الحذف النهائي.</p></div>

              <div><H2>٨. التعديلات</H2><p>قد نُحدّث هذه الشروط من وقت لآخر. التعديلات الجوهرية ستُعلَن عبر البريد الإلكتروني قبل 30 يوماً من سريانها. استمرار استخدامك للخدمة بعد التعديل يُعتبر موافقة.</p></div>

              <div><H2>٩. القانون المعمول به</H2><p>تخضع هذه الشروط لقوانين سلطنة عُمان. أي نزاع ينشأ عن الخدمة يُحل عبر التحكيم في مسقط ما لم يتفق الطرفان كتابياً على غير ذلك.</p></div>
            </>
          ) : (
            <>
              <p>These terms govern your use of the Hujuzatk property management platform. By using the service, you acknowledge that you have read and agree to them.</p>

              <div><H2>1. Acceptance of Terms</H2><p>By creating a Hujuzatk account or using the service, you agree to be bound by these terms. If you are using the service on behalf of a company, you represent that you have authority to bind that company to these terms.</p></div>

              <div><H2>2. Subscription &amp; Free Trial</H2><p>New accounts receive a 14-day free trial with full access to trial-plan features. After the trial, continued access requires an active paid subscription. Subscriptions renew automatically unless cancelled before the renewal date. Fees are non-refundable for partial periods.</p></div>

              <div><H2>3. Your Responsibilities</H2><p>You are responsible for: (1) keeping your password and login credentials confidential, (2) the accuracy of information you enter (guest names, dates, prices), (3) ensuring your use of the service complies with all applicable laws in your country of operation, including data protection and tax law.</p></div>

              <div><H2>4. Acceptable Use</H2><p>You may not: use the service for any unlawful purpose, attempt unauthorized access to our systems, use the service to send spam, or resell the service without prior written permission.</p></div>

              <div><H2>5. External Channel Integrations</H2><p>When you connect Airbnb, Booking.com, or Gathren via iCal URLs, you acknowledge that the imported data is subject to those channels' own terms. Hujuzatk only imports the data and does not control its content. Sync discrepancies between channels (double-bookings, update delays) are not our liability.</p></div>

              <div><H2>6. Limitation of Liability</H2><p>The service is provided "as is" without express or implied warranties. We are not liable for any financial loss, data loss, or consequential damages arising from your use of the service. Our maximum liability in any case is limited to the amount you paid us during the prior 12 months.</p></div>

              <div><H2>7. Termination</H2><p>You may cancel your account at any time from the Settings screen. We reserve the right to suspend or terminate your account if you violate these terms. After cancellation, you have 90 days to export your data before permanent deletion.</p></div>

              <div><H2>8. Changes</H2><p>We may update these terms from time to time. Material changes will be announced by email at least 30 days before they take effect. Continued use of the service after a change constitutes acceptance.</p></div>

              <div><H2>9. Governing Law</H2><p>These terms are governed by the laws of the Sultanate of Oman. Any dispute arising from the service is resolved by arbitration in Muscat unless the parties agree otherwise in writing.</p></div>
            </>
          )}
        </div>
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <Link to="/" className="inline-flex items-center font-bold" style={{ color: 'var(--brand-green-deep)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', gap: 8 }}>
            {isAr ? '→ العودة للرئيسية' : '← Back to Home'}
          </Link>
        </div>
      </div>
    </main>
  );
}
