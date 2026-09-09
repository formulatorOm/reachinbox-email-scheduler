'use client';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="w-full flex items-center gap-2 px-2 py-2 text-red-600 hover:bg-red-50 rounded-md transition font-medium text-sm"
    >
      <LogOut size={18} />
      Logout
    </button>
  );
}