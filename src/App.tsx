import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from './utils/cn';
import { type Booking, type Tenant } from './db';
import { dataService } from './lib/dataService';
import { authService, type SessionUser } from './lib/authService';
import { getDir, type Language, t } from './lib/i18n';
import {
  Calendar,
  FileText,
  Globe,
  ChartPie,
  DeviceMobile,
  Database,
  ArrowRight,
  MagnifyingGlass,
  Check,
  Star,
  ShieldCheck,
  Sparkle,
  House,
  Layout,
  Users,
  CreditCard,
  Target,
  Plus
} from 'phosphor-react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfToday,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ar, enUS } from 'date-fns/locale';

const DEFAULT_ROOMS = [
  { id: 'A1', name: 'A1' },
  { id: 'A2', name: 'A2' },
  { id: 'A3', name: 'A3' },
  { id: 'A4', name: 'A4' },
  { id: 'A5', name: 'A5' },
];

type View = 'calendar' | 'list' | 'reports' | 'settings' | 'admin';
type ListFilter = 'upcoming' | 'active' | 'past' | 'canceled' | 'all';
type AuthMode = 'login' | 'register';

function formatTz(date: Date | string, fmt: string, tz: string, lang: Language) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, tz || 'Asia/Muscat', fmt, { locale: lang === 'ar' ? ar : enUS });
}

// ---------- ROOT APP WITH THREE ROUTES ----------

export function App() {
  const location = useLocation();
  const path = location.pathname || '/';

  if (path === '/') {
    return <LandingPage />;
  }

  if (path.startsWith('/user')) {
    return <UserAuthShell />;
  }

  if (path.startsWith('/superadmin')) {
    return <SuperAdminShell />;
  }
  if (path === '/privacy') {
    return <PrivacyPolicy />;
  }
  if (path === '/terms') {
    return <TermsOfService />;
  }

  const username = decodeURIComponent(path.slice(1).split('/')[0] || 'workspace');
  return <WorkspaceShell username={username} />;
}

// ---------- LANDING PAGE (MARKETING OPTIMIZED) ----------

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-slate-50 py-20 px-4">
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-900">
      <h1 className="text-3xl font-black mb-6 tracking-tight">Privacy Policy</h1>
      <p className="mb-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Last updated: {new Date().toLocaleDateString()}</p>
      <section className="space-y-6 text-slate-700 leading-relaxed">
        <p>At ProHost, we take your privacy seriously. This policy describes how we collect, use, and protect your data.</p>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">1. Data Collection</h2>
          <p>We collect information you provide directly to us when you create an account, such as your name, email address, and property details. All booking data is stored securely and is isolated per tenant.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">2. Data Usage</h2>
          <p>Your data is used solely to provide and improve the ProHost service. We do not sell your personal information or booking data to third parties.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">3. Security</h2>
          <p>We implement industry-standard security measures to protect your data. For PostgreSQL cloud users, data is encrypted at rest and in transit via Supabase/PostgreSQL protocols.</p>
        </div>
      </section>
      <div className="mt-12 pt-8 border-t border-slate-100">
        <Link to="/" className="text-emerald-600 font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2">
          ← Back to Home
        </Link>
      </div>
    </div>
  </div>
);

const TermsOfService = () => (
  <div className="min-h-screen bg-slate-50 py-20 px-4">
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-900">
      <h1 className="text-3xl font-black mb-6 tracking-tight">Terms of Service</h1>
      <p className="mb-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Last updated: {new Date().toLocaleDateString()}</p>
      <section className="space-y-6 text-slate-700 leading-relaxed">
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">1. Acceptance of Terms</h2>
          <p>By accessing ProHost, you agree to be bound by these terms. Our service is provided "as is" and "as available".</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">2. Subscription & Trials</h2>
          <p>New accounts receive a 14-day free trial. After the trial, continued access requires an active subscription managed by the system administrator.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">3. User Responsibility</h2>
          <p>Users are responsible for maintaining the confidentiality of their login credentials and for all activities that occur under their workspace.</p>
        </div>
      </section>
      <div className="mt-12 pt-8 border-t border-slate-100">
        <Link to="/" className="text-emerald-600 font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2">
          ← Back to Home
        </Link>
      </div>
    </div>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState("");

  const handleOpenWorkspace = async () => {
    if (!workspaceName.trim()) return;
    const slug = workspaceName.trim().replace(/\s+/g, "-");
    const exists = await authService.checkWorkspaceExists(slug);
    if (exists) {
      navigate(`/${slug}`);
    } else {
      navigate(`/user?workspace=${encodeURIComponent(workspaceName)}&tab=register`);
    }
  };

  const FeatureIcon = ({ icon: Icon, color = "emerald" }: { icon: any, color?: string }) => (
    <div className={cn(
      "flex h-12 w-12 items-center justify-center rounded-2xl mb-6 shadow-sm",
      color === 'emerald' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
    )}>
      <Icon size={24} weight="duotone" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-200">
              <House size={22} weight="bold" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">ProHost</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">Features</a>
            <a href="#reports" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">Reporting</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/user')} className="hidden px-4 py-2 text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors sm:block">
              Log in
            </button>
            <button 
              onClick={() => navigate('/user?tab=register')} 
              className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-600 active:scale-95"
            >
              <span className="relative z-10">Start Free Trial</span>
              <ArrowRight size={16} className="relative z-10 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-400 rounded-full blur-[100px]" />
          </div>

          <div className="container mx-auto px-6 text-center">
            <div className="mx-auto mb-8 flex max-w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/50 px-4 py-1.5 text-sm font-bold text-emerald-700 backdrop-blur-sm">
              <Sparkle size={16} weight="fill" />
              <span>The Next Gen PMS is here</span>
            </div>
            
            <h1 className="mx-auto max-w-5xl text-5xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-7xl lg:text-8xl">
              Property Management <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent italic">Simplified.</span>
            </h1>
            
            <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-600 sm:text-xl">
              Scale your hotel, apartment business, or vacation rentals with our lightning-fast 5-year calendar, automated invoicing, and deep financial analytics.
            </p>

            <div className="mx-auto mt-12 max-w-2xl">
              <div className="group relative flex flex-col gap-3 rounded-[2rem] bg-white p-3 shadow-2xl shadow-slate-200 ring-1 ring-slate-200 sm:flex-row">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <MagnifyingGlass size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter your hotel or workspace name..." 
                    className="w-full h-14 rounded-[1.5rem] border-0 bg-slate-50 pl-14 pr-6 text-lg font-semibold text-slate-900 ring-0 focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenWorkspace()}
                  />
                </div>
                <button 
                  onClick={handleOpenWorkspace}
                  className="h-14 flex items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-600 px-10 text-lg font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-200 active:scale-95"
                >
                  Get Started <ArrowRight size={20} weight="bold" />
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-2"><Check size={18} weight="bold" className="text-emerald-500" /> 14-Day Free Trial</span>
                <span className="flex items-center gap-2"><Check size={18} weight="bold" className="text-emerald-500" /> No Credit Card</span>
                <span className="flex items-center gap-2"><Check size={18} weight="bold" className="text-emerald-500" /> Instant Setup</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 pb-32">
          <div className="relative rounded-[2.5rem] bg-slate-900 p-4 shadow-3xl lg:p-8">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-2xl bg-white px-8 py-4 shadow-xl ring-1 ring-slate-200">
               <div className="flex items-center gap-6">
                  <div className="text-center border-r border-slate-100 pr-6">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Occupancy</p>
                    <p className="text-xl font-black text-emerald-600">94.2%</p>
                  </div>
                  <div className="text-center border-r border-slate-100 pr-6">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Revenue</p>
                    <p className="text-xl font-black text-slate-900">OMR 12.4k</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Bookings</p>
                    <p className="text-xl font-black text-blue-600">142</p>
                  </div>
               </div>
            </div>
            
            <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-white shadow-inner">
               <div className="flex h-full flex-col">
                  <div className="border-b bg-slate-50 px-6 py-4 flex items-center justify-between">
                    <div className="flex gap-2">
                       <div className="h-3 w-3 rounded-full bg-red-400"></div>
                       <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                       <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    </div>
                  </div>
                  <div className="flex flex-1">
                    <div className="w-16 border-r bg-slate-50 flex flex-col gap-2 p-2">
                       {[...Array(10)].map((_, i) => <div key={i} className="h-8 rounded bg-slate-200 w-full opacity-50"></div>)}
                    </div>
                    <div className="flex-1 p-6">
                       <div className="grid grid-cols-6 gap-4">
                          {[...Array(18)].map((_, i) => (
                            <div key={i} className={`h-24 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center ${i === 7 || i === 13 ? 'bg-emerald-50 border-emerald-200' : ''}`}>
                               {(i === 7 || i === 13) && <div className="h-4 w-12 rounded bg-emerald-500"></div>}
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
               </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 pointer-events-none rounded-[2.5rem]"></div>
          </div>
        </section>

        <section id="features" className="bg-white py-32 relative overflow-hidden">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-emerald-50 rounded-full blur-[100px] -z-10"></div>
          <div className="container mx-auto px-6">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Built for speed. Designed for growth.</h2>
              <p className="mt-6 text-xl leading-relaxed text-slate-600">Everything we built focuses on one thing: making your property management operation as invisible as possible so you can focus on your guests.</p>
            </div>
            
            <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Calendar, title: "Infinite 5-Year Calendar", desc: "Our proprietary virtualized grid lets you scroll through 5 years of bookings without a single stutter. Plan peak seasons years in advance." },
                { icon: FileText, title: "Smart Invoicing", desc: "Automated calculation of nights, discounts, and deposits. Generate clean, printable PDF invoices in English or Arabic instantly." },
                { icon: Globe, title: "Native Arabic & RTL", desc: "Not just a translation, but a complete localized experience. Perfect RTL layouts with OMR and regional date formats built-in." },
                { icon: ChartPie, title: "Financial Intelligence", desc: "Advanced reporting on Stay Date vs Creation Date. Visualize fill rates, revenue per room, and identify your most profitable channels." },
                { icon: DeviceMobile, title: "Native PWA Experience", desc: "Install ProHost directly on your device. It feels and acts like a native app with fast loading and push-notification readiness." },
                { icon: Database, title: "Enterprise Scaling", desc: "Start locally with high-speed Dexie DB and upgrade to PostgreSQL (Supabase) in seconds. Your data, your control." }
              ].map((feature, i) => (
                <div key={i} className="group flex flex-col items-start transition-all">
                  <FeatureIcon icon={feature.icon} color={i % 2 === 0 ? "emerald" : "blue"} />
                  <h3 className="text-2xl font-extrabold text-slate-900">{feature.title}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-32 text-white">
          <div className="container mx-auto px-6">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div>
                   <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-400 mb-8">
                      <ShieldCheck size={18} weight="fill" />
                      Bank-Grade Security
                   </div>
                   <h2 className="text-4xl font-black leading-tight sm:text-6xl">Your data is safe, private, and always yours.</h2>
                   <p className="mt-8 text-xl text-slate-400 leading-relaxed">ProHost uses multi-tenant isolation. This means every hotel's data is mathematically separated from others. No leaks, no performance crosstalk, just pure reliability.</p>
                   
                   <div className="mt-12 flex gap-12">
                      <div>
                         <p className="text-4xl font-black text-white">99.9%</p>
                         <p className="mt-1 text-slate-500 uppercase text-xs font-bold tracking-widest">Uptime SLA</p>
                      </div>
                      <div>
                         <p className="text-4xl font-black text-white">0ms</p>
                         <p className="mt-1 text-slate-500 uppercase text-xs font-bold tracking-widest">Latency Local</p>
                      </div>
                   </div>
                </div>
                <div className="relative">
                   <div className="rounded-3xl bg-slate-800 p-10 border border-slate-700 relative z-10">
                      <div className="flex gap-1 text-emerald-400 mb-6">
                         {[...Array(5)].map((_, i) => <Star key={i} size={20} weight="fill" />)}
                      </div>
                      <p className="text-2xl font-medium leading-relaxed italic">"Switching to ProHost cut my check-in time by half. The 5-year calendar is a game changer for our vacation rental business in Salalah. We can now plan our entire year in minutes."</p>
                      <div className="mt-10 flex items-center gap-4">
                         <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-slate-600 to-slate-400 shadow-xl"></div>
                         <div>
                            <p className="text-lg font-bold">Ahmed Al-Raisi</p>
                            <p className="text-sm text-slate-500">General Manager, Al-Raisi Suites</p>
                         </div>
                      </div>
                   </div>
                   <div className="absolute top-10 right-[-20px] bottom-10 left-10 bg-emerald-600 rounded-3xl -z-0 opacity-20 blur-2xl"></div>
                </div>
             </div>
          </div>
        </section>

        <section id="pricing" className="py-32 bg-white">
          <div className="container mx-auto px-6 text-center">
             <h2 className="text-4xl font-black text-slate-900 sm:text-6xl">Simple, honest pricing.</h2>
             <p className="mt-6 text-xl text-slate-500 max-w-2xl mx-auto">One plan, all features, infinite possibilities. No hidden fees or per-user charges.</p>
             
             <div className="mt-20 mx-auto max-w-lg rounded-[3rem] border border-slate-200 bg-white p-2 shadow-2xl transition-all hover:shadow-emerald-100">
                <div className="rounded-[2.5rem] bg-slate-50 p-12 text-center">
                   <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600 mb-4">Professional Plan</p>
                   <div className="flex items-center justify-center gap-1">
                      <span className="text-3xl font-bold text-slate-400 uppercase">OMR</span>
                      <span className="text-7xl font-black text-slate-900">45</span>
                      <span className="text-xl font-bold text-slate-400">/mo</span>
                   </div>
                   <ul className="mt-10 space-y-4 text-left">
                      {["Unlimited Bookings", "Up to 50 Rooms", "Full Reporting Suite", "Multi-Language (AR/EN)", "Desktop PWA Install", "Advanced 5-Year Calendar"].map((li, i) => (
                        <li key={i} className="flex items-center gap-3 font-semibold text-slate-700">
                           <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Check size={14} weight="bold" />
                           </div>
                           {li}
                        </li>
                      ))}
                   </ul>
                   <button 
                    onClick={() => navigate('/user?tab=register')}
                    className="mt-12 w-full rounded-2xl bg-emerald-600 py-5 text-xl font-black text-white transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-100 active:scale-[0.98]"
                   >
                     Start Your 14-Day Free Trial
                   </button>
                   <p className="mt-6 text-sm font-medium text-slate-400">Cancel anytime. No lock-in contracts.</p>
                </div>
             </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-20">
        <div className="container mx-auto px-6">
           <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="max-w-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg">
                    <House size={20} weight="bold" />
                  </div>
                  <span className="text-2xl font-black tracking-tight text-slate-900">ProHost</span>
                </div>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  The world's most intuitive Property Management System for modern hosts and professional property managers.
                </p>
                <a 
                  href="https://wa.me/96899999999" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full text-sm font-black transition-all shadow-lg shadow-emerald-200 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.634 1.432h.006c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  WhatsApp Support
                </a>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 text-sm font-bold uppercase tracking-widest">
                <div className="flex flex-col gap-4">
                  <span className="text-slate-900">Legal</span>
                  <Link to="/privacy" className="text-slate-400 hover:text-emerald-600 transition-colors">Privacy</Link>
                  <Link to="/terms" className="text-slate-400 hover:text-emerald-600 transition-colors">Terms</Link>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-slate-900">Support</span>
                  <a href="#" className="text-slate-400 hover:text-emerald-600">Help Center</a>
                  <a href="#" className="text-slate-400 hover:text-emerald-600">Contact</a>
                </div>
              </div>
           </div>
           <div className="mt-12 border-t border-slate-200 pt-12 flex flex-col md:flex-row justify-between text-sm font-medium text-slate-400 items-center gap-6">
              <p>© {new Date().getFullYear()} ProHost PMS. All rights reserved.</p>
              <div className="flex items-center gap-4">
                 <Globe size={16} />
                 <span>Oman | United Kingdom | International</span>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
};

// ---------- USER AUTH SHELL (/user) ----------

function UserAuthShell() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialWorkspace = searchParams.get('workspace') || '';
  const initialTab = (searchParams.get('tab') as AuthMode) || 'login';

  const [authMode, setAuthMode] = useState<AuthMode>(initialTab);
  const [authError, setAuthError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setSession(user);
      }
    };
    void bootstrap();
  }, []);

  if (session) {
    const slug = encodeURIComponent((session.tenant.name || 'workspace').replace(/\s+/g, '-'));
    navigate(`/${slug}`);
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-blue-50">
      <div className="flex-1 flex items-center justify-center p-4">
        <AuthScreen
          mode={authMode}
          onModeChange={setAuthMode}
          onLoggedIn={(s) => {
            setSession(s);
            const slug = encodeURIComponent((s.tenant.name || 'workspace').replace(/\s+/g, '-'));
            navigate(`/${slug}`);
          }}
          error={authError}
          setError={setAuthError}
          initialWorkspace={initialWorkspace}
        />
      </div>
    </div>
  );
}

// ---------- WORKSPACE SHELL (/:username) ----------

interface WorkspaceShellProps {
  username: string;
}

function WorkspaceShell({ username }: WorkspaceShellProps) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await authService.getCurrentUser();
        setSession(user);
      } finally {
        setAuthLoading(false);
      }
    };
    void bootstrap();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <WorkspaceHeader username={username} />
        <div className="flex-1 flex items-center justify-center text-gray-700">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium">Loading workspace…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-blue-50">
        <WorkspaceHeader username={username} />
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthScreen
            mode={authMode}
            onModeChange={setAuthMode}
            onLoggedIn={setSession}
            error={authError}
            setError={setAuthError}
            workspaceLabel={username}
            initialWorkspace={username}
          />
        </div>
      </div>
    );
  }

  return <TenantApp session={session} onSessionChange={setSession} />;
}

function WorkspaceHeader({ username }: { username: string }) {
  const navigate = useNavigate();
  const niceName = username === 'my-hotel' ? 'My Hotel' : username;
  return (
    <header className="h-14 border-b bg-white/90 backdrop-blur flex items-center justify-between px-4 shadow-sm fixed top-0 w-full z-50 text-slate-900">
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs"
        >
          <House size={16} />
        </button>
        <div className="flex flex-col">
          <span className="font-semibold text-xs sm:text-sm">ProHost</span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Workspace: {niceName}</span>
        </div>
      </div>
    </header>
  );
}

// ---------- SUPERADMIN SHELL (/superadmin) ----------

function SuperAdminShell() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user?.isAdmin) setSession(user);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const s = await authService.loginLocal(email, password);
      if (!s.isAdmin) {
        setError('This user is not a superadmin.');
        return;
      }
      setSession(s);
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Loading superadmin…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl shadow-2xl max-w-md w-full p-8">
          <h1 className="text-xl font-bold mb-2">Superadmin Login</h1>
          <p className="text-xs text-slate-300 mb-4">
            Enter your credentials to manage global ProHost PMS settings.
          </p>
          {error && (
            <div className="mb-3 text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded px-2 py-1.5">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-3 text-sm">
            <div>
              <label className="block text-[11px] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold py-2 rounded"
            >
              Login as Superadmin
            </button>
          </form>
        </div>
      </div>
    );
  }

  const lang = (session.tenant.language as Language) || 'en';
  const tz = session.tenant.timezone || 'Asia/Muscat';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="h-14 border-b border-emerald-500/40 bg-slate-900/90 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xs text-center">
            SA
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Superadmin Dashboard</span>
            <span className="text-[10px] text-emerald-200">Global System Management</span>
          </div>
        </div>
        <button
          onClick={async () => {
            await authService.logout();
            window.location.href = '/';
          }}
          className="text-[11px] text-emerald-200 hover:text-emerald-100 underline underline-offset-2"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-6xl mx-auto w-full">
        <SuperAdminConfigPanel />
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 shadow-xl p-4">
          <AdminView lang={lang} tz={tz} superadmin />
        </div>
      </main>
    </div>
  );
}

function SuperAdminConfigPanel() {
  const [trialDays, setTrialDays] = useState(14);
  const [calendarYears, setCalendarYears] = useState(5);

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700 shadow-xl p-4 text-sm text-slate-100">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Database size={18} className="text-emerald-400" />
        Global Configuration
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Free trial period (days)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={trialDays}
            onChange={(e) => setTrialDays(parseInt(e.target.value) || 14)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Calendar window (years)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={calendarYears}
            onChange={(e) => setCalendarYears(parseInt(e.target.value) || 5)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Supported languages</label>
          <div className="flex gap-2 text-xs mt-1">
            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-400/40">EN</span>
            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-400/40">AR</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- AUTH SCREEN ----------

interface AuthScreenProps {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  onLoggedIn: (s: SessionUser) => void;
  error: string | null;
  setError: (v: string | null) => void;
  workspaceLabel?: string;
  initialWorkspace?: string;
}

function AuthScreen({ mode, onModeChange, onLoggedIn, error, setError, workspaceLabel, initialWorkspace }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState(initialWorkspace || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialWorkspace && mode === 'register') {
      setName(initialWorkspace);
    }
  }, [initialWorkspace, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        const s = await authService.registerLocalTenant({ email, name: name || email, password });
        onLoggedIn(s);
      } else {
        const s = await authService.loginLocal(email, password);
        onLoggedIn(s);
      }
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl max-w-md w-full p-8 border border-emerald-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200">
          <House size={22} weight="bold" />
        </div>
        <div>
          <div className="font-bold text-lg">ProHost PMS</div>
          <div className="text-xs text-gray-500">
            {workspaceLabel ? `Workspace: ${workspaceLabel}` : 'Professional Property Management'}
          </div>
        </div>
      </div>

      <div className="flex mb-6 bg-slate-100 rounded-lg p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className={cn(
            'flex-1 py-2 rounded-md transition-all',
            mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500',
          )}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => onModeChange('register')}
          className={cn(
            'flex-1 py-2 rounded-md transition-all',
            mode === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-500',
          )}
        >
          Register (14-day free)
        </button>
      </div>

      {error && <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-3 font-semibold">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Company / Workspace Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
              placeholder="e.g. Al Noor Apartments"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Log In' : 'Create My Workspace'}
        </button>
      </form>
    </div>
  );
}

// ---------- TENANT APP ----------

interface TenantAppProps {
  session: SessionUser;
  onSessionChange: (s: SessionUser | null) => void;
}

// Helper to convert month name to number
function getMonthNumber(monthName: string): string {
  const months: { [key: string]: string } = {
    'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04',
    'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
    'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12',
  };
  return months[monthName.toUpperCase()] || '01';
}

function TenantApp({ session, onSessionChange }: TenantAppProps) {
  const lang = (session.tenant.language as Language) || 'en';
  const tz = session.tenant.timezone || 'Asia/Muscat';
  const currency = session.tenant.currency || 'OMR';
  const dir = getDir(lang);

  const [currentView, setCurrentView] = useState<View>('calendar');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set()); // Track which months are loaded
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialDate, setAddModalInitialDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [addModalInitialRoom, setAddModalInitialRoom] = useState<string>(
    session.tenant.rooms?.[0]?.id ?? DEFAULT_ROOMS[0].id,
  );
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const invoiceRef = useRef<HTMLDivElement | null>(null);

  const [reportStartDate, setReportStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportRoomFilter, setReportRoomFilter] = useState<string>('ALL');
  const [reportType, setReportType] = useState<'stay' | 'created'>('stay');

  const [listSearchTerm, setListSearchTerm] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('upcoming');
  const [visibleListCount, setVisibleListCount] = useState(30); // Start with 30, not 15 (better initial load)

  // Helper to generate calendar days on-demand per month (not all 1825 at once!)
  const generateMonthDays = (year: number, month: number): Date[] => {
    const days: Date[] = [];
    const firstDay = startOfMonth(new Date(year, month, 1));
    const lastDay = endOfMonth(new Date(year, month, 1));
    const daysInMonth = differenceInCalendarDays(lastDay, firstDay) + 1;
    for (let i = 0; i < daysInMonth; i++) {
      days.push(addDays(firstDay, i));
    }
    return days;
  };
  
  // Generate days for 24 months total (1 year back + 1 year forward for smooth scrolling)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfMonth(new Date());
    for (let m = -12; m <= 12; m++) {
      const monthDate = addMonths(today, m);
      const monthDays = generateMonthDays(monthDate.getFullYear(), monthDate.getMonth());
      days.push(...monthDays);
    }
    return days;
  }, []);

  const calendarContainerRef = useRef<HTMLDivElement | null>(null);

  // Load bookings for a specific month
  const loadMonthBookings = async (date: Date, force: boolean = false) => {
    const monthKey = format(date, 'yyyy-MM');
    
    if (force || !loadedMonths.has(monthKey)) {
      const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(date), 'yyyy-MM-dd');
      
      const monthBookings = await dataService.getBookingsByDateRange(startDate, endDate);
      setBookings(prev => {
        // Remove old bookings from this month, add new ones
        const filtered = prev.filter(b => {
          // Keep bookings not in this month
          const bookingMonth = format(parseISO(b.checkIn), 'yyyy-MM');
          return bookingMonth !== monthKey;
        });
        // Add all new month bookings
        return [...filtered, ...monthBookings];
      });
      setLoadedMonths(prev => new Set([...prev, monthKey]));
    }
  };

  // Initial load: fetch current + surrounding months (3 months initial, then predictive loading kicks in)
  useEffect(() => {
    const loadInitialMonths = async () => {
      const now = new Date();
      // Load current month and 2 months forward initially for smooth scrolling
      for (let m = -1; m <= 2; m++) {
        const date = addMonths(now, m);
        await loadMonthBookings(date);
      }
    };
    
    void loadInitialMonths();
  }, [session.tenantId]);

  // Detect visible months on scroll and load their bookings + next/prev month for fast loading
  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const onScroll = () => {
      // Throttle scroll handler to run max once per 500ms
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Find month headers in the visible area
        const monthHeaders = container.querySelectorAll('td[colSpan]');
        const monthsToLoad = new Set<string>(); // Use Set to avoid duplicates
        
        monthHeaders.forEach((header) => {
          const rect = header.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Check if header is in visible area (with some buffer for predictive loading)
          if (rect.top >= containerRect.top - 200 && rect.top <= containerRect.bottom + 200) {
            const monthText = header.textContent || '';
            // Parse month from text like "FEBRUARY 2026"
            const parts = monthText.trim().split(' ');
            if (parts.length === 2) {
              try {
                const monthDate = parseISO(`${parts[1]}-${getMonthNumber(parts[0])}-01`);
                
                // Add current month and adjacent months to set (using month key to deduplicate)
                monthsToLoad.add(format(monthDate, 'yyyy-MM'));
                monthsToLoad.add(format(addMonths(monthDate, 1), 'yyyy-MM'));
                monthsToLoad.add(format(addMonths(monthDate, -1), 'yyyy-MM'));
              } catch (e) {
                // Skip if parsing fails
              }
            }
          }
        });

        // Load only unique months
        monthsToLoad.forEach((monthKey) => {
          try {
            const [year, month] = monthKey.split('-').map(Number);
            const monthDate = new Date(year, month - 1, 1);
            loadMonthBookings(monthDate);
          } catch (e) {
            // Skip if parsing fails
          }
        });
      }, 300);
    };

    container.addEventListener('scroll', onScroll);
    return () => {
      clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', onScroll);
    };
  }, [loadedMonths]);

  useEffect(() => {
    if (currentView === 'calendar' && calendarContainerRef.current) {
      const todayEl = calendarContainerRef.current.querySelector('[data-today="true"]');
      if (todayEl) {
        (todayEl as HTMLElement).scrollIntoView({ block: 'center' });
      }
    }
  }, [currentView]);

  const jumpToToday = () => {
    if (calendarContainerRef.current) {
      const todayEl = calendarContainerRef.current.querySelector('[data-today="true"]');
      if (todayEl) {
        (todayEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const rooms = session.tenant.rooms?.length ? session.tenant.rooms : DEFAULT_ROOMS;

  // Refresh bookings for a specific month (after add/update/delete operations)
  const refreshMonthBookings = async (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      // Force reload the month with fresh data from server
      await loadMonthBookings(date, true);
    } catch (e) {
      console.error('Failed to refresh month bookings:', e);
    }
  };

  const handleAddBooking = async (newBooking: any) => {
    // Build proper BookingInput - only send allowed fields
    const bookingInput = {
      guestName: newBooking.guestName,
      guestEmail: newBooking.guestEmail || undefined,
      guestPhone: newBooking.phone || newBooking.guestPhone || '', // Map from form 'phone' field
      city: newBooking.city || undefined,
      room: newBooking.room,
      checkIn: newBooking.checkIn,
      checkOut: newBooking.checkOut,
      nightPrice: newBooking.nightPrice,
      deposit: newBooking.deposit,
      notes: newBooking.notes || undefined,
      status: 'UPCOMING', // Use proper enum value
    };
    
    // Filter out undefined values
    Object.keys(bookingInput).forEach(key => 
      (bookingInput as any)[key] === undefined && delete (bookingInput as any)[key]
    );
    
    await dataService.addBooking(bookingInput);
    // Refresh the month where booking was added
    await refreshMonthBookings(newBooking.checkIn);
    setShowAddModal(false);
  };

  const handleUpdateBookingStatus = async (id: number | string, status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW') => {
    await dataService.updateBooking(id, { status });
    // Refresh the month(s) affected by this booking
    if (selectedBooking?.checkIn) {
      await refreshMonthBookings(selectedBooking.checkIn);
    }
    setSelectedBooking(null);
  };

  const handleDeleteBooking = async (id: number | string) => {
    const bookingToDelete = bookings.find(b => b.id === id);
    await dataService.deleteBooking(id);
    // Refresh the month where booking was deleted
    if (bookingToDelete?.checkIn) {
      await refreshMonthBookings(bookingToDelete.checkIn);
    }
    setSelectedBooking(null);
  };

  const filteredBookings = useMemo(() => {
    const today = startOfToday();

    let filtered = bookings.filter((b: Booking) => {
      const term = listSearchTerm.toLowerCase();
      return (
        b.guestName.toLowerCase().includes(term) ||
        b.city?.toLowerCase().includes(term) ||
        b.guestPhone?.includes(listSearchTerm)
      );
    });

    if (listFilter !== 'all') {
      filtered = filtered.filter((b: Booking) => {
        if (listFilter === 'canceled') return b.status === 'CANCELED';
        if (b.status === 'CANCELED') return false;
        const checkIn = parseISO(b.checkIn);
        const checkOut = parseISO(b.checkOut);
        if (listFilter === 'upcoming') return checkIn >= today;
        if (listFilter === 'active') return checkIn < today && checkOut > today;
        if (listFilter === 'past') return checkOut <= today;
        return true;
      });
    }

    return filtered.sort((a: Booking, b: Booking) => b.checkIn.localeCompare(a.checkIn));
  }, [bookings, listSearchTerm, listFilter]);

  const visibleBookings = filteredBookings.slice(0, visibleListCount);

  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      // Load more when user is within 200px of bottom
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setVisibleListCount((prev) => {
          const nextCount = prev + 50; // Load 50 at a time for better performance
          return nextCount > filteredBookings.length ? filteredBookings.length : nextCount;
        });
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [filteredBookings.length]);

  useEffect(() => {
    setVisibleListCount(30); // Reset to 30 when filter changes
  }, [listFilter, listSearchTerm]);

  const reportData = useMemo(() => {
    const filtered = bookings.filter((b: Booking) => {
      if (b.status === 'CANCELED') return false;
      const dateToCompare = reportType === 'stay' ? b.checkIn : b.createdAt.split('T')[0];
      const inRange = dateToCompare >= reportStartDate && dateToCompare <= reportEndDate;
      const roomMatch = reportRoomFilter === 'ALL' || b.room === reportRoomFilter;
      return inRange && roomMatch;
    });

    const roomStats = rooms.map((room) => {
      const roomBookings = filtered.filter((b: Booking) => b.room === room.id);
      const totalNights = roomBookings.reduce((sum: number, b: Booking) => sum + b.nights, 0);
      const totalRevenue = roomBookings.reduce((sum: number, b: Booking) => sum + b.totalPrice, 0);

      const start = parseISO(reportStartDate);
      const end = parseISO(reportEndDate);
      const daysInReport = differenceInDays(end, start) + 1;
      let occupiedDays = 0;
      if (daysInReport > 0) {
        let current = start;
        while (current <= end) {
          const dStr = format(current, 'yyyy-MM-dd');
          const isOccupied = roomBookings.some((b) => dStr >= b.checkIn && dStr < b.checkOut);
          if (isOccupied) occupiedDays++;
          current = addDays(current, 1);
        }
      }
      const occupancyRate = daysInReport > 0 ? (occupiedDays / daysInReport) * 100 : 0;

      return { roomId: room.id, totalNights, totalRevenue, occupancyRate };
    });

    const totalRevenue = filtered.reduce((sum: number, b: Booking) => sum + b.totalPrice, 0);
    const totalNights = filtered.reduce((sum: number, b: Booking) => sum + b.nights, 0);

    const months = eachMonthOfInterval({
      start: parseISO(reportStartDate),
      end: parseISO(reportEndDate),
    });

    const monthlyStats = months.map((month) => {
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      const realStart = format(startOfMonth(month), 'yyyy-MM-dd');

      const monthBookings = bookings.filter(
        (b) =>
          b.status !== 'CANCELED' &&
          b.checkIn <= monthEnd &&
          b.checkOut > realStart &&
          (reportRoomFilter === 'ALL' || b.room === reportRoomFilter),
      );

      const revenue = monthBookings.reduce((sum, b) => {
        return b.checkIn >= realStart && b.checkIn <= monthEnd ? sum + b.totalPrice : sum;
      }, 0);

      const occupancy = monthBookings.reduce((sum, b) => {
        const s = b.checkIn < realStart ? parseISO(realStart) : parseISO(b.checkIn);
        const e = b.checkOut > monthEnd ? parseISO(monthEnd) : parseISO(b.checkOut);
        const days = differenceInDays(e, s);
        return sum + Math.max(0, days);
      }, 0);

      const totalPossibleNights = differenceInDays(parseISO(monthEnd), parseISO(realStart)) + 1;
      const totalRooms = reportRoomFilter === 'ALL' ? rooms.length : 1;
      const fillRate = totalPossibleNights > 0 ? (occupancy / (totalPossibleNights * totalRooms)) * 100 : 0;

      return {
        month: formatTz(month, 'MMM yyyy', tz, lang),
        revenue,
        fillRate,
      };
    });

    return { roomStats, totalRevenue, totalNights, bookingCount: filtered.length, monthlyStats };
  }, [bookings, reportStartDate, reportEndDate, reportRoomFilter, reportType, rooms, tz, lang]);

  const printInvoice = () => {
    if (!invoiceRef.current || !selectedBooking) return;
    const content = invoiceRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<html><head><title>Invoice</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}.text-right{text-align:right}.bg-gray-100{background:#f3f4f6}</style></head><body dir="${dir}">${content}</body></html>`,
    );
    win.document.close();
    win.print();
  };

  const handleLogout = async () => {
    await authService.logout();
    onSessionChange(null);
    window.location.href = '/';
  };

  const subscriptionBadge = (() => {
    const status = session.tenant.subscriptionStatus;
    const validUntil = session.tenant.validUntil;
    const label = t(lang, `status.${status}`);
    const color =
      status === 'ACTIVE'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'TRIAL'
        ? 'bg-blue-100 text-blue-700'
        : status === 'EXPIRED'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
    return (
      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black mr-2 uppercase', color)}>
        {label}
        {validUntil && ` • ${t(lang, 'admin.validUntil')} ${formatTz(validUntil, 'yyyy-MM-dd', tz, lang)}`}
      </span>
    );
  })();

  return (
    <div className={cn('min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100', dir === 'rtl' && 'rtl')} dir={dir}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-[100] h-14 backdrop-blur-xl bg-white/80">
        <div className="max-w-full mx-auto px-6 flex justify-between h-full items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-100">
               <House size={20} weight="bold" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight">{session.tenant.name || 'ProHost Workspace'}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Professional PMS</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 text-xs">
              {subscriptionBadge}
              <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter', dataService.isCloud ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                {dataService.isCloud ? t(lang, 'misc.cloudDB') : t(lang, 'misc.localDB')}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] font-black uppercase text-slate-400 hover:text-red-600 transition-colors"
            >
              {t(lang, 'misc.logout')}
            </button>
          </div>
        </div>
      </nav>
      
      <div className="bg-white border-b border-slate-200 sticky top-14 z-[90] h-10 overflow-x-auto overflow-y-hidden">
        <div className="container mx-auto px-6 flex h-full items-center gap-1 scrollbar-hide">
          {(['calendar', 'list', 'reports', 'settings', ...(session.isAdmin ? ['admin'] : [])] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setCurrentView(v)}
              className={cn(
                'px-4 h-full text-xs font-black uppercase tracking-widest transition-all border-b-2',
                currentView === v ? 'border-emerald-600 text-emerald-600 bg-emerald-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {t(lang, `nav.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto p-6 pt-8">
        {currentView === 'calendar' && (
          <CalendarView
            rooms={rooms}
            bookings={bookings}
            selectedDateStr={selectedDateStr}
            setSelectedDateStr={setSelectedDateStr}
            calendarDays={calendarDays}
            calendarContainerRef={calendarContainerRef}
            setShowAddModal={setShowAddModal}
            setAddModalInitialDate={setAddModalInitialDate}
            setAddModalInitialRoom={setAddModalInitialRoom}
            setSelectedBooking={setSelectedBooking}
            jumpToToday={jumpToToday}
            lang={lang}
            tz={tz}
          />
        )}

        {currentView === 'list' && (
          <ListView
            bookings={visibleBookings}
            fullFiltered={filteredBookings}
            visibleCount={visibleListCount}
            totalCount={filteredBookings.length}
            onLoadMore={() => setVisibleListCount(prev => prev + 50)}
            listFilter={listFilter}
            setListFilter={setListFilter}
            listSearchTerm={listSearchTerm}
            setListSearchTerm={setListSearchTerm}
            setShowAddModal={setShowAddModal}
            setSelectedBooking={setSelectedBooking}
            setShowInvoiceModal={setShowInvoiceModal}
            listContainerRef={listContainerRef}
            currency={currency}
            lang={lang}
            tz={tz}
          />
        )}

        {currentView === 'reports' && (
          <ReportsView
            rooms={rooms}
            reportType={reportType}
            setReportType={setReportType}
            reportStartDate={reportStartDate}
            reportEndDate={reportEndDate}
            setReportStartDate={setReportStartDate}
            setReportEndDate={setReportEndDate}
            reportRoomFilter={reportRoomFilter}
            setReportRoomFilter={setReportRoomFilter}
            reportData={reportData}
            currency={currency}
            lang={lang}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView session={session} onSessionChange={onSessionChange} lang={lang} />
        )}

        {currentView === 'admin' && session.isAdmin && (
          <AdminView lang={lang} tz={tz} />
        )}
      </main>

      {showAddModal && (
        <AddBookingModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddBooking}
          initialDate={addModalInitialDate}
          initialRoom={addModalInitialRoom}
          rooms={rooms}
          currency={currency}
          lang={lang}
        />
      )}

      {selectedBooking && !showInvoiceModal && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onDelete={handleDeleteBooking}
          onUpdateStatus={handleUpdateBookingStatus}
          onPrintInvoice={() => setShowInvoiceModal(true)}
          currency={currency}
          lang={lang}
          tz={tz}
        />
      )}

      {showInvoiceModal && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden" ref={invoiceRef}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center hide-on-print">
              <h2 className="font-black text-slate-900 uppercase tracking-tight">{t(lang, 'invoice.title')} Preview</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100">×</button>
            </div>
            <div className="p-12 relative overflow-auto max-h-[80vh]">
              {selectedBooking.status === 'CANCELED' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[12px] border-red-500 text-red-500 font-black text-8xl opacity-10 transform -rotate-12 p-8 rounded-3xl uppercase pointer-events-none">
                  {t(lang, 'invoice.canceled')}
                </div>
              )}
              <div className="flex justify-between mb-12">
                <div className="space-y-1">
                  <h1 className="text-4xl font-black text-emerald-600 tracking-tighter uppercase">{t(lang, 'invoice.title')}</h1>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t(lang, 'invoice.bookingId')}: #{selectedBooking.id}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    {t(lang, 'invoice.created')}: {formatTz(parseISO(selectedBooking.createdAt), 'dd MMM yyyy', tz, lang)}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{session.tenant.name?.toUpperCase()}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guest Folio</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12 border-y border-slate-100 py-10">
                <div>
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">{t(lang, 'invoice.guestInfo')}</div>
                  <div className="font-black text-2xl text-slate-900 leading-tight mb-1">{selectedBooking.guestName}</div>
                  <div className="text-sm font-semibold text-slate-500">{selectedBooking.city || ''}</div>
                  <div className="text-sm font-bold text-slate-600 mt-2">{selectedBooking.guestPhone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">{t(lang, 'invoice.roomDetails')}</div>
                  <div className="font-black text-2xl text-slate-900 leading-tight mb-1">{t(lang, 'list.room')} {selectedBooking.room}</div>
                  <div className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-1">{selectedBooking.nights} {t(lang, 'invoice.night')}</div>
                  <div className="text-sm font-semibold text-slate-500">
                    {formatTz(selectedBooking.checkIn, 'dd MMM', tz, lang)} {' - '}
                    {formatTz(selectedBooking.checkOut, 'dd MMM yyyy', tz, lang)}
                  </div>
                </div>
              </div>

              <table className="w-full mb-12">
                <thead className="border-b-4 border-slate-900">
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <th className="py-4 text-left">{t(lang, 'invoice.description')}</th>
                    <th className="py-4 text-right">{t(lang, 'invoice.priceNight')}</th>
                    <th className="py-4 text-right">{t(lang, 'invoice.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="text-slate-700">
                    <td className="py-6 font-bold">{t(lang, 'invoice.roomFees')} ({selectedBooking.nights} Nights)</td>
                    <td className="py-6 text-right font-medium">{currency} {selectedBooking.nightPrice}</td>
                    <td className="py-6 text-right font-black text-lg text-slate-900">{currency} {selectedBooking.totalPrice}</td>
                  </tr>
                </tbody>
              </table>
              
              <div className="ml-auto max-w-xs space-y-3">
                 <div className="flex justify-between text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                    <span>{t(lang, 'invoice.total')}</span>
                    <span className="text-slate-900 font-black">{currency} {selectedBooking.totalPrice}</span>
                 </div>
                 <div className="flex justify-between text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                    <span>{t(lang, 'invoice.deposit')}</span>
                    <span className="text-slate-900 font-black">{currency} {selectedBooking.deposit}</span>
                 </div>
                 <div className="flex justify-between bg-slate-900 text-white p-4 rounded-2xl items-center">
                    <span className="font-black uppercase text-xs tracking-widest">{t(lang, 'invoice.remainingBalance')}</span>
                    <span className="text-2xl font-black">{currency} {selectedBooking.remaining}</span>
                 </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 hide-on-print">
              <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-3 border border-slate-200 rounded-2xl font-bold hover:bg-white transition-all">
                {t(lang, 'invoice.close')}
              </button>
              <button onClick={printInvoice} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
                <FileText size={20} weight="bold" /> {t(lang, 'invoice.print')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- SUB-COMPONENTS ----------

// Soft color palette for bookings - paired colors that work well together
const SOFT_BOOKING_COLORS = [
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700' },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700 ' },
];

function getBookingColor(bookingId: number | string): { bg: string; border: string; text: string } {
  const hash = String(bookingId).charCodeAt(0) + String(bookingId).length;
  return SOFT_BOOKING_COLORS[hash % SOFT_BOOKING_COLORS.length];
}

function CalendarView({
  rooms,
  bookings,
  selectedDateStr,
  setSelectedDateStr,
  calendarDays,
  calendarContainerRef,
  setShowAddModal,
  setAddModalInitialDate,
  setAddModalInitialRoom,
  setSelectedBooking,
  jumpToToday,
  lang,
  tz,
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={jumpToToday}
            className="text-xs bg-slate-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            {t(lang, 'calendar.jumpToday')}
          </button>
        </div>
        <button
          onClick={() => {
            setAddModalInitialDate(selectedDateStr);
            setShowAddModal(true);
          }}
          className="bg-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-50 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
        >
          <Sparkle size={16} weight="fill" />
          <span className="hidden sm:inline">{t(lang, 'calendar.newBooking')}</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[75vh]">
        <div className="overflow-auto flex-1 scrollbar-hide" ref={calendarContainerRef}>
          <table className="w-full border-separate border-spacing-0 table-fixed min-w-[900px] sm:min-w-[1200px]">
            <thead className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md">
              <tr>
                <th className="w-16 sm:w-24 p-2 sm:p-4 border-b border-r border-slate-200 sticky left-0 z-50 bg-slate-50/90 backdrop-blur-md text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t(lang, 'calendar.date')}
                </th>
                {rooms.map((r: any) => (
                  <th
                    key={r.id}
                    className="w-20 sm:w-32 p-2 sm:p-4 border-b border-r border-slate-200 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-600 text-center"
                  >
                    <span className="hidden sm:inline">{r.name}</span>
                    <span className="sm:hidden font-black">{r.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {calendarDays.map((date: Date) => {
                const dStr = format(date, 'yyyy-MM-dd');
                const isToday = isSameDay(date, new Date());
                const isPast = date < startOfToday();
                const isFirst = date.getDate() === 1;

                return (
                  <React.Fragment key={dStr}>
                    {isFirst && (
                      <tr>
                        <td
                          colSpan={rooms.length + 1}
                          className="bg-slate-900 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] px-2 sm:px-4 py-1.5 sm:py-2 sticky left-0 z-30"
                        >
                          {formatTz(date, 'MMMM yyyy', tz, lang).toUpperCase()}
                        </td>
                      </tr>
                    )}
                    <tr className="h-8 sm:h-10 group" data-today={isToday ? 'true' : 'false'}>
                      <td
                        onClick={() => setSelectedDateStr(dStr)}
                        className={cn(
                          'border-r border-slate-200 text-center text-[9px] sm:text-[11px] font-black cursor-pointer sticky left-0 z-30 transition-colors p-1 sm:p-4',
                          isToday
                            ? 'bg-emerald-600 text-white shadow-xl scale-105 z-40'
                            : isPast
                            ? 'bg-red-50/40 text-red-400'
                            : 'bg-white text-slate-500 hover:bg-slate-100/30',
                          selectedDateStr === dStr && !isToday && 'bg-emerald-50 text-emerald-600 border-l-4 border-l-emerald-600',
                        )}
                      >
                        {formatTz(date, 'dd MMM', tz, lang)}
                      </td>
                      {rooms.map((r: any) => {
                        const cellBookings = bookings.filter((b: any) => {
                          if (b.status === 'CANCELED') return false;
                          const inRoom = b.room === r.id;
                          // Parse dates properly for comparison
                          const checkInDate = parseISO(b.checkIn);
                          const checkOutDate = parseISO(b.checkOut);
                          const cellDate = parseISO(dStr);
                          return inRoom && cellDate >= checkInDate && cellDate < checkOutDate;
                        });
                        return (
                          <td
                            key={r.id}
                            onClick={() => {
                              setSelectedDateStr(dStr);
                              setAddModalInitialDate(dStr);
                              setAddModalInitialRoom(r.id);
                              setShowAddModal(true);
                            }}
                            className={cn(
                              'border border-slate-100 relative p-0.5 sm:p-1 transition-all cursor-pointer hover:bg-emerald-100/80',
                              selectedDateStr === dStr && 'bg-emerald-50/30',
                            )}
                          >
                            {/* Plus icon on hover (if no bookings) */}
                            {cellBookings.length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Plus size={20} weight="bold" className="text-emerald-600" />
                              </div>
                            )}
                            
                            {cellBookings.map((b: any) => {
                              const color = getBookingColor(b.id);
                              return (
                                <div
                                  key={b.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBooking(b);
                                  }}
                                  className={cn(
                                    'mx-0.5 sm:mx-1 my-0 text-[8px] sm:text-[10px] font-black rounded-md sm:rounded-lg text-center leading-tight flex items-center justify-center shadow-sm cursor-pointer hover:shadow-lg transition-all hover:scale-[1.08] px-1 sm:px-2 py-0.5 sm:py-1 border truncate',
                                    color.bg,
                                    color.border,
                                    color.text,
                                  )}
                                  title={b.guestName}
                                >
                                  <span className="truncate">{b.guestName}</span>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ListView({
  bookings,
  fullFiltered,
  visibleCount,
  totalCount,
  onLoadMore,
  listFilter,
  setListFilter,
  listSearchTerm,
  setListSearchTerm,
  setShowAddModal,
  setSelectedBooking,
  setShowInvoiceModal,
  listContainerRef,
  currency,
  lang,
  tz,
}: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-[1.25rem] w-full lg:w-auto">
          {(['upcoming', 'active', 'past', 'canceled', 'all'] as ListFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setListFilter(f)}
              className={cn(
                'flex-1 lg:flex-none px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all',
                listFilter === f ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {t(lang, `list.${f}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full lg:w-auto lg:flex-1 lg:justify-end">
          <div className="relative flex-1 lg:max-w-xs">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300">
               <MagnifyingGlass size={18} />
            </div>
            <input
              type="text"
              placeholder={t(lang, 'list.search')}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              value={listSearchTerm}
              onChange={(e) => setListSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-emerald-50 active:scale-95 transition-all"
          >
            {t(lang, 'list.new')}
          </button>
        </div>
      </div>

      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden overflow-x-auto max-h-[75vh] scrollbar-hide"
        ref={listContainerRef}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <th className="px-6 py-5 text-left">{t(lang, 'list.guest')}</th>
              <th className="px-6 py-5 text-left">{t(lang, 'list.room')}</th>
              <th className="px-6 py-5 text-left">{t(lang, 'list.dates')}</th>
              <th className="px-6 py-5 text-right">{t(lang, 'list.amount')}</th>
              <th className="px-6 py-5 text-right">{t(lang, 'list.balance')}</th>
              <th className="px-6 py-5 text-center">{t(lang, 'list.status')}</th>
              <th className="px-6 py-5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                   <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Users size={64} weight="light" />
                      <p className="font-bold uppercase text-[11px] tracking-[0.2em]">
                        {fullFiltered.length === 0 ? t(lang, 'misc.noBookings') : t(lang, 'misc.scrollMore')}
                      </p>
                   </div>
                </td>
              </tr>
            ) : (
              bookings.map((b: any) => {
                const checkIn = parseISO(b.checkIn);
                const checkOut = parseISO(b.checkOut);
                const today = startOfToday();
                let statusColor = 'bg-slate-100 text-slate-500';
                let statusText = t(lang, 'list.upcoming');

                if (b.status === 'CANCELED') {
                  statusColor = 'bg-red-50 text-red-500 line-through';
                  statusText = t(lang, 'list.canceled');
                } else if (isSameDay(checkIn, today)) {
                  statusColor = 'bg-red-500 text-white font-black animate-pulse';
                  statusText = t(lang, 'list.checkInToday');
                } else if (checkIn < today && checkOut > today) {
                  statusColor = 'bg-emerald-600 text-white font-black';
                  statusText = t(lang, 'list.active');
                } else if (checkOut <= today) {
                  statusColor = 'bg-slate-200 text-slate-400';
                  statusText = t(lang, 'list.past');
                }

                return (
                  <tr
                    key={b.id}
                    className={cn('group hover:bg-slate-50 transition-colors', b.status === 'CANCELED' && 'opacity-60')}
                  >
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-900 leading-tight">{b.guestName}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight uppercase">{b.phone}</div>
                    </td>
                    <td className="px-6 py-5 font-black text-slate-900">{b.room}</td>
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-700 text-[11px] uppercase tracking-tighter">{formatTz(b.checkIn, 'dd MMM yyyy', tz, lang)}</div>
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                        {b.nights} {t(lang, 'list.nights')} · {formatTz(b.checkOut, 'dd MMM', tz, lang)}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-slate-900">
                      {currency} {b.totalPrice}
                    </td>
                    <td
                      className={cn(
                        'px-6 py-5 text-right font-black',
                        b.remaining > 0 ? 'text-red-500' : 'text-emerald-600',
                      )}
                    >
                      {currency} {b.remaining}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn('px-2.5 py-1 rounded-[10px] text-[10px] font-black uppercase tracking-widest', statusColor)}>{statusText}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowInvoiceModal(true);
                        }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all"
                        title={t(lang, 'list.view')}
                      >
                        <FileText size={20} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {visibleCount < totalCount && totalCount > 0 && (
        <div className="flex justify-center pt-6">
          <button
            onClick={onLoadMore}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95"
          >
            Load {Math.min(50, totalCount - visibleCount)} more of {totalCount}
          </button>
        </div>
      )}
    </div>
  );
}

function ReportsView({
  rooms,
  reportType,
  setReportType,
  reportStartDate,
  reportEndDate,
  setReportStartDate,
  setReportEndDate,
  reportRoomFilter,
  setReportRoomFilter,
  reportData,
  currency,
  lang,
}: any) {
  const avgFill =
    reportData.roomStats.length === 0
      ? 0
      : reportData.roomStats.reduce((a: any, b: any) => a + b.occupancyRate, 0) / reportData.roomStats.length;

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col gap-2 w-full md:w-auto flex-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.type')}</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'stay' | 'created')}
              className="border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black bg-slate-50 focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="stay">{t(lang, 'reports.stayDate')}</option>
              <option value="created">{t(lang, 'reports.createdDate')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.fromDate')}</label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black bg-slate-50"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.toDate')}</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black bg-slate-50"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.roomFilter')}</label>
            <select
              value={reportRoomFilter}
              onChange={(e) => setReportRoomFilter(e.target.value)}
              className="border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black bg-slate-50"
            >
              <option value="ALL">{t(lang, 'reports.allRooms')}</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 text-white px-8 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center gap-2 justify-center"
            >
              <FileText size={18} weight="bold" /> {t(lang, 'reports.print')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
             <CreditCard size={120} weight="duotone" />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 relative z-10">
            {t(lang, 'reports.totalRevenue')}
          </div>
          <div className="text-4xl font-black mt-2 tracking-tighter relative z-10">
            {currency} {reportData.totalRevenue.toLocaleString()}
          </div>
        </div>
        <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
             <Calendar size={120} weight="duotone" />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 relative z-10">
            {t(lang, 'reports.totalNights')}
          </div>
          <div className="text-4xl font-black mt-2 tracking-tighter relative z-10">{reportData.totalNights}</div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
             <Users size={120} weight="duotone" />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 relative z-10">
            {t(lang, 'reports.totalBookings')}
          </div>
          <div className="text-4xl font-black mt-2 tracking-tighter relative z-10">{reportData.bookingCount}</div>
        </div>
        <div className="bg-amber-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
             <Target size={120} weight="duotone" />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 relative z-10">
            {t(lang, 'reports.avgFillRate')}
          </div>
          <div className="text-4xl font-black mt-2 tracking-tighter relative z-10">{avgFill.toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="font-black uppercase tracking-widest text-slate-500 text-xs">{t(lang, 'reports.roomPerformance')}</span>
            <Layout size={20} className="text-slate-300" />
          </div>
          <div className="flex-1 overflow-auto max-h-96 scrollbar-hide">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <th className="px-8 py-4 text-left">{t(lang, 'reports.room')}</th>
                  <th className="px-8 py-4 text-right">{t(lang, 'reports.revenue')}</th>
                  <th className="px-8 py-4 text-center">{t(lang, 'reports.occupancy')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.roomStats.map((s: any) => (
                  <tr key={s.roomId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-black text-slate-900 text-lg">{s.roomId}</td>
                    <td className="px-8 py-5 text-right text-emerald-600 font-black">
                      {currency} {s.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex-1 max-w-[100px] bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, s.occupancyRate).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-400 w-10 text-right">
                          {s.occupancyRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
             <span className="font-black uppercase tracking-widest text-slate-500 text-xs">{t(lang, 'reports.monthlyFillRate')}</span>
             <ChartPie size={20} className="text-slate-300" />
          </div>
          <div className="flex-1 overflow-auto max-h-96 scrollbar-hide">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <th className="px-8 py-4 text-left">{t(lang, 'reports.month')}</th>
                  <th className="px-8 py-4 text-right">{t(lang, 'reports.revenue')}</th>
                  <th className="px-8 py-4 text-center">{t(lang, 'reports.fillRate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.monthlyStats.map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-black text-slate-900">{s.month}</td>
                    <td className="px-8 py-5 text-right text-emerald-600 font-black">
                      {currency} {s.revenue.toLocaleString()}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex-1 max-w-[100px] bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, s.fillRate).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-400 w-10 text-right">
                          {s.fillRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddBookingModal({ onClose, onAdd, initialDate, initialRoom, rooms, currency, lang }: any) {
  const guestNameInputRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({
    guestName: '',
    city: '',
    phone: '',
    checkIn: initialDate,
    nights: 1,
    room: initialRoom,
    nightPrice: 20,
    deposit: 0,
  });

  // Auto-focus guest name input on modal open
  useEffect(() => {
    guestNameInputRef.current?.focus();
  }, []);

  const checkOut = format(addDays(parseISO(f.checkIn), Math.max(1, f.nights)), 'yyyy-MM-dd');
  const totalPrice = Math.max(1, f.nights) * f.nightPrice;
  const remaining = totalPrice - f.deposit;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-10 shadow-3xl">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8 flex items-center gap-3">
           <Sparkle size={32} className="text-emerald-500" weight="fill" />
           {t(lang, 'booking.addTitle')}
        </h2>
        <div className="space-y-5">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-500 transition-colors">
               <Users size={18} weight="bold" />
            </div>
            <input
              ref={guestNameInputRef}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.guestName')}
              value={f.guestName}
              onChange={(e) => setF({ ...f, guestName: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <input
              className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.city')}
              value={f.city}
              onChange={(e) => setF({ ...f, city: e.target.value })}
            />
            <input
              className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.phone')}
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
                {t(lang, 'booking.checkIn')}
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                value={f.checkIn}
                onChange={(e) => setF({ ...f, checkIn: e.target.value })}
              />
            </div>
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
                {t(lang, 'booking.nights')}
              </label>
              <input
                type="number"
                min={1}
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                value={f.nights}
                onChange={(e) => setF({ ...f, nights: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
                {t(lang, 'booking.room')}
              </label>
              <select
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                value={f.room}
                onChange={(e) => setF({ ...f, room: e.target.value })}
              >
                {rooms.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
                {t(lang, 'booking.priceNight')}
              </label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300 text-[10px] font-black uppercase">{currency}</div>
                 <input
                  type="number"
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={f.nightPrice}
                  onChange={(e) => setF({ ...f, nightPrice: parseInt(e.target.value) || 0 })}
                 />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white mt-4 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-all">
                <CreditCard size={100} weight="duotone" />
             </div>
             <div className="grid grid-cols-2 gap-4 relative z-10">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{t(lang, 'booking.total')}</p>
                   <p className="text-2xl font-black">{currency} {totalPrice}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{t(lang, 'booking.deposit')}</p>
                   <input
                    type="number"
                    className="w-full bg-slate-800/50 border-0 rounded-xl px-3 py-1 text-lg font-black focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={f.deposit}
                    onChange={(e) => setF({ ...f, deposit: parseInt(e.target.value) || 0 })}
                   />
                </div>
                <div className="col-span-2 pt-4 border-t border-slate-800 flex justify-between items-center">
                   <p className="text-xs font-black uppercase tracking-widest text-emerald-400">{t(lang, 'booking.remaining')}</p>
                   <p className="text-3xl font-black text-white">{currency} {remaining}</p>
                </div>
             </div>
          </div>
        </div>
        <div className="mt-10 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
            {t(lang, 'booking.cancel')}
          </button>
          <button
            onClick={() =>
              onAdd({
                guestName: f.guestName,
                city: f.city,
                phone: f.phone, // Will be mapped to guestPhone in handleAddBooking
                room: f.room,
                checkIn: f.checkIn,
                checkOut: checkOut,
                nightPrice: f.nightPrice,
                deposit: f.deposit,
              })
            }
            className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95"
          >
            {t(lang, 'booking.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({
  booking,
  onClose,
  onDelete,
  onPrintInvoice,
  onUpdateStatus,
  currency,
  lang,
  tz,
}: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-3xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{booking.guestName}</h2>
            <div className="flex gap-2 items-center">
               <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                 {t(lang, 'list.room')} {booking.room}
               </span>
               <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                 {booking.nights} {t(lang, 'list.nights')}
               </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-6 mb-10">
          <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">{t(lang, 'booking.checkIn')}</p>
              <p className="font-black text-slate-700 uppercase tracking-tighter">{formatTz(booking.checkIn, 'dd MMM yyyy', tz, lang)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">{t(lang, 'booking.checkOut').replace(' (auto)', '')}</p>
              <p className="font-black text-slate-700 uppercase tracking-tighter">{formatTz(booking.checkOut, 'dd MMM yyyy', tz, lang)}</p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-3xl p-6 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>{t(lang, 'booking.totalBill')}</span>
              <span className="text-slate-900 font-black text-lg">{currency} {booking.totalPrice}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-red-500 uppercase tracking-widest border-t border-slate-100 pt-3">
              <span>{t(lang, 'booking.remaining')}</span>
              <span className="font-black text-xl">{currency} {booking.remaining}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={onPrintInvoice}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <FileText size={18} weight="bold" /> {t(lang, 'booking.printInvoice')}
          </button>

          <div className="grid grid-cols-2 gap-3">
             {booking.status !== 'canceled' ? (
              <button
                onClick={() => {
                  if (confirm(t(lang, 'booking.confirmCancel'))) onUpdateStatus(booking.id!, 'canceled');
                }}
                className="py-3 bg-amber-50 text-amber-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-100 transition-all"
              >
                {t(lang, 'booking.cancelBooking')}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm(t(lang, 'booking.confirmReactivate'))) onUpdateStatus(booking.id!, 'confirmed');
                }}
                className="py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition-all"
              >
                {t(lang, 'booking.reactivate')}
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(t(lang, 'booking.confirmDelete'))) onDelete(booking.id!);
              }}
              className="py-3 border border-red-50 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all"
            >
              {t(lang, 'booking.delete')}
            </button>
          </div>
          
          <button onClick={onClose} className="mt-4 text-slate-300 font-black uppercase tracking-[0.3em] text-[10px] hover:text-slate-500 transition-colors">
            {t(lang, 'booking.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ session, onSessionChange, lang }: any) {
  const [tenant, setTenant] = useState<Tenant>(session.tenant);
  const [saving, setSaving] = useState(false);

  const handleRoomChange = (index: number, value: string) => {
    const rooms = [...(tenant.rooms || [])];
    rooms[index] = { ...rooms[index], name: value };
    setTenant({ ...tenant, rooms });
  };

  const handleAddRoom = () => {
    const rooms = [...(tenant.rooms || [])];
    const id = `R${rooms.length + 1}`;
    rooms.push({ id, name: id });
    setTenant({ ...tenant, rooms });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateTenantConfig(tenant.uuid, {
        language: tenant.language,
        currency: tenant.currency,
        timezone: tenant.timezone,
        rooms: tenant.rooms,
      });
      setTenant(updated);
      onSessionChange({ ...session, tenant: updated });
    } finally {
      setSaving(false);
    }
  };

  const timezones = [
    'Asia/Muscat', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Amman',
    'Asia/Jerusalem', 'Africa/Cairo', 'Europe/Istanbul', 'Europe/London', 'Europe/Paris',
    'America/New_York', 'America/Chicago', 'UTC',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10">
        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
           <Globe size={28} className="text-emerald-500" />
           {t(lang, 'settings.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.language')}
            </label>
            <select
              value={tenant.language}
              onChange={(e) => setTenant({ ...tenant, language: e.target.value })}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.currency')}
            </label>
            <input
              value={tenant.currency}
              onChange={(e) => setTenant({ ...tenant, currency: e.target.value })}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="e.g. OMR"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.timezone')}
            </label>
            <select
              value={tenant.timezone}
              onChange={(e) => setTenant({ ...tenant, timezone: e.target.value })}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
             <Layout size={28} className="text-blue-500" />
             {t(lang, 'settings.rooms')}
          </h2>
          <button
            onClick={handleAddRoom}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            {t(lang, 'settings.addRoom')}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {(tenant.rooms || []).map((room, idx) => (
            <div key={room.id} className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block px-2">{room.id}</label>
              <input
                value={room.name}
                onChange={(e) => handleRoomChange(idx, e.target.value)}
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 text-white px-20 py-5 rounded-[2rem] text-xl font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? t(lang, 'settings.saving') : t(lang, 'settings.save')}
        </button>
      </div>
    </div>
  );
}

function AdminView({ lang, tz }: { lang: Language; tz: string; superadmin?: boolean }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const list = await authService.adminListTenants();
      setTenants(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTenants();
  }, []);

  const handleStatusChange = async (
    tObj: Tenant,
    status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED',
  ) => {
    const validUntil = tObj.validUntil || new Date().toISOString().slice(0, 10);
    await authService.adminSetSubscriptionStatus(tObj.uuid, status, validUntil);
    await loadTenants();
  };

  const navigate = useNavigate();

  const handleImpersonate = async (tenant: Tenant) => {
    localStorage.setItem('hotel-pms-session', JSON.stringify({ tenantUuid: tenant.uuid }));
    const slug = encodeURIComponent((tenant.name || tenant.email || 'workspace').replace(/\s+/g, '-'));
    navigate(`/${slug}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
           <Users size={32} className="text-emerald-400" />
           {t(lang, 'admin.title')}
        </h2>
        <button
          onClick={loadTenants}
          className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
        >
          {t(lang, 'admin.refresh')}
        </button>
      </div>
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-auto max-h-[60vh] scrollbar-hide">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80 sticky top-0 z-10">
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <th className="px-6 py-5 text-left">{t(lang, 'admin.name')}</th>
                <th className="px-6 py-5 text-left">{t(lang, 'admin.email')}</th>
                <th className="px-6 py-5 text-left">{t(lang, 'admin.config')}</th>
                <th className="px-6 py-5 text-left">{t(lang, 'admin.subscription')}</th>
                <th className="px-6 py-5 text-left">{t(lang, 'admin.validUntil')}</th>
                <th className="px-6 py-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">
                    {t(lang, 'admin.loading')}
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">
                    {t(lang, 'admin.noTenants')}
                  </td>
                </tr>
              ) : (
                tenants.map((tObj) => (
                  <tr key={tObj.uuid} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-5 font-black text-white">{tObj.name}</td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-400">{tObj.email}</td>
                    <td className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                      {tObj.language?.toUpperCase()} · {tObj.currency} · {tObj.timezone}
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest', 
                        tObj.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                        tObj.subscriptionStatus === 'TRIAL' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-red-500/10 text-red-400'
                      )}>
                        {t(lang, `status.${tObj.subscriptionStatus}`)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs font-black text-slate-400">
                      {tObj.validUntil ? formatTz(tObj.validUntil, 'yyyy-MM-dd', tz, lang) : ''}
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                       <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStatusChange(tObj, 'ACTIVE')}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-500"
                        >
                          {t(lang, 'admin.activate')}
                        </button>
                        <button
                          onClick={() => handleImpersonate(tObj)}
                          className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-slate-600"
                        >
                          Login as User
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
