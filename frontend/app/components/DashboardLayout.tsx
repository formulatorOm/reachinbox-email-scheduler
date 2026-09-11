'use client';

import { Search, Filter, RotateCcw, Clock, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import LogoutButton from './LogoutButton';

interface DashboardLayoutProps {
  children: React.ReactNode;
  session: any;
}

export default function DashboardLayout({ children, session }: DashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLoginPage = pathname === '/login';

  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSlackConnected, setIsSlackConnected] = useState<boolean>(false);
  const [showSlackBanner, setShowSlackBanner] = useState<boolean>(false);

  const userId = session?.user?.email || '1';

  // Fetch counts & Slack status
  const fetchCounts = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/stats/${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.scheduled !== undefined) setScheduledCount(data.scheduled);
        if (data.sent !== undefined) setSentCount(data.sent);
      })
      .catch(() => {
        setScheduledCount(12);
        setSentCount(785);
      });
  };

  useEffect(() => {
    if (!isLoginPage) {
      fetchCounts();
      const interval = setInterval(fetchCounts, 5000);

      // Check if Slack query param is present or saved in localStorage
      const slackSuccess = searchParams?.get('slack') === 'success';
      const storedSlack = localStorage.getItem('slack_connected') === 'true';

      if (slackSuccess || storedSlack) {
        setIsSlackConnected(true);
        localStorage.setItem('slack_connected', 'true');
        if (slackSuccess) {
          setShowSlackBanner(true);
          setTimeout(() => setShowSlackBanner(false), 6000);
        }
      }

      return () => clearInterval(interval);
    }
  }, [isLoginPage, userId, searchParams]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      window.dispatchEvent(new CustomEvent('app-search', { detail: searchQuery }));
    }
  };

  const handleRefresh = () => {
    window.dispatchEvent(new Event('app-refresh'));
    fetchCounts();
  };

  return (
    <div className="bg-[#F8F9FA] flex h-screen overflow-hidden text-gray-800 w-full relative">
      {/* SUCCESS SLACK NOTIFICATION TOAST BANNER */}
      {showSlackBanner && (
        <div className="fixed top-4 right-4 z-50 bg-[#00A84F] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={20} />
          <span className="text-xs font-semibold">Slack Connected Successfully! Real-time alerts enabled.</span>
        </div>
      )}

      {/* SIDEBAR matching Figma Images 2 & 3 */}
      <aside className="w-64 bg-white border-r border-gray-200/80 flex flex-col relative z-40 select-none">
        
        {/* LOGO */}
        <div className="h-16 flex items-center px-6 font-black text-2xl tracking-tighter text-gray-900">
          ONB
        </div>

        {/* DYNAMIC USER PROFILE */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-3 p-2.5 bg-gray-50/70 border border-gray-100 rounded-xl">
            <img
              src={session?.user?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver"}
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover border border-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{session?.user?.name || "Oliver Brown"}</p>
              <p className="text-[11px] text-gray-400 truncate">{session?.user?.email || "oliver.brown@domain.io"}</p>
            </div>
          </div>
        </div>

        {/* COMPOSE BUTTON */}
        <div className="px-4 py-3">
          <Link
            href="/compose"
            className="w-full flex justify-center items-center gap-2 bg-white border border-[#00A84F] text-[#00A84F] font-semibold py-2 px-4 rounded-full hover:bg-emerald-50/50 transition-all text-sm shadow-xs"
          >
            Compose
          </Link>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          <p className="text-[11px] font-bold tracking-wider text-gray-400 mb-2 px-2 uppercase">CORE</p>

          <Link
            href="/"
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === '/'
                ? 'bg-[#E8F5E9] text-[#00A84F] font-semibold'
                : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock size={16} />
              <span>Scheduled</span>
            </div>
            <span className="text-xs font-semibold text-gray-500">{scheduledCount}</span>
          </Link>

          <Link
            href="/sent"
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === '/sent'
                ? 'bg-[#E8F5E9] text-[#00A84F] font-semibold'
                : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send size={16} />
              <span>Sent</span>
            </div>
            <span className="text-xs font-semibold text-gray-500">{sentCount}</span>
          </Link>
        </nav>

        {/* SLACK & LOGOUT BUTTONS */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {isSlackConnected ? (
            <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 py-2 px-3 rounded-xl font-semibold text-xs shadow-xs">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Slack Connected</span>
            </div>
          ) : (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/slack/auth?userId=${encodeURIComponent(userId)}`}
              className="w-full flex items-center justify-center gap-2 bg-[#4A154B] text-white py-2 px-3 rounded-xl transition-all font-medium text-xs hover:bg-[#3B113C] shadow-xs"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521h-6.313A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522-2.52h-6.313z"/>
              </svg>
              <span>Connect Slack</span>
            </a>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen relative min-w-0">
        
        {/* HEADER matching Figma Images */}
        <header className="h-16 bg-white border-b border-gray-200/80 flex items-center px-8 justify-between z-30">
          
          {/* SEARCH INPUT */}
          <div className="flex items-center bg-[#F5F5F5] px-3.5 py-2 rounded-xl w-full max-w-xl transition-all focus-within:ring-2 focus-within:ring-green-500/20 focus-within:bg-white border border-transparent focus-within:border-gray-200">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="bg-transparent border-none outline-none ml-2.5 w-full text-xs text-gray-800 placeholder-gray-400 font-medium"
            />
          </div>

          {/* TOP RIGHT TOOLBAR */}
          <div className="flex items-center gap-4 text-gray-400">
            <button className="p-2 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Filter">
              <Filter size={17} />
            </button>
            <button onClick={handleRefresh} className="p-2 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Refresh">
              <RotateCcw size={17} />
            </button>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
