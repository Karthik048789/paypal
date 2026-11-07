'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Briefcase, Activity, Shield, Home } from 'lucide-react';

function MobileTabBarContent() {
  const pathname = usePathname();

  const tabs = [
    {
      label: 'Home',
      href: '/',
      icon: <Home className="w-5 h-5" />,
      isActive: pathname === '/',
    },
    {
      label: 'Jobs',
      href: '/dashboard',
      icon: <Briefcase className="w-5 h-5" />,
      isActive: pathname === '/dashboard' || pathname.startsWith('/jobs'),
    },
    {
      label: 'Admin',
      href: '/admin',
      icon: <Activity className="w-5 h-5" />,
      isActive: pathname === '/admin',
    },
    {
      label: 'Demo Targets',
      href: '/demo/good',
      icon: <Shield className="w-5 h-5" />,
      isActive: pathname.startsWith('/demo'),
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg"
      aria-label="Mobile Bottom Navigation"
    >
      {tabs.map((tab) => (
        <a
          key={tab.label}
          href={tab.href}
          className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition ${
            tab.isActive ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className="mb-0.5">{tab.icon}</div>
          <span>{tab.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function MobileTabBar() {
  return (
    <Suspense fallback={null}>
      <MobileTabBarContent />
    </Suspense>
  );
}
