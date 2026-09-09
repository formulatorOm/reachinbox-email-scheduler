import './globals.css';
import { Toaster } from 'react-hot-toast';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./lib/auth";
import DashboardLayout from './components/DashboardLayout';
import Providers from './components/Providers';

export const metadata = {
  title: 'ReachInbox - Outbox Labs',
  description: 'Full-stack Email Job Scheduler & Lead Outreach Dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="bg-[#F8F9FA] text-gray-800 antialiased font-sans">
        <Providers session={session}>
          <DashboardLayout session={session}>
            {children}
          </DashboardLayout>
        </Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}