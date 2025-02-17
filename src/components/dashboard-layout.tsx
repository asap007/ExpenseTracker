"use client";

import React from 'react';
import { UserCircle, DollarSign, PieChart, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  const navigationItems = [
    { icon: DollarSign, label: 'Expenses', href: '/dashboard/expenses' },
    { icon: PieChart, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-semibold">Expense Tracker</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                onClick={handleSignOut}
              >
                <LogOut size={20} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r">
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.href}
                className="flex items-center space-x-2 w-full p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                onClick={() => router.push(item.href)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;