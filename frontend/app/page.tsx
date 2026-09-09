'use client';

import { Star, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import EmailDetailModal from './components/EmailDetailModal';

interface Job {
  id: string;
  recipient_email: string;
  scheduled_at: string;
  status?: string;
  campaign: {
    subject: string;
    body: string;
  };
}

export default function ScheduledPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const userId = session?.user?.email || '1';

  const fetchJobs = (query?: string) => {
    setIsLoading(true);
    let url = `http://localhost:5002/api/jobs/scheduled/${encodeURIComponent(userId)}`;
    if (query && query.trim()) {
      url = `http://localhost:5002/api/search/${encodeURIComponent(userId)}?q=${encodeURIComponent(query)}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setJobs(data);
        } else {
          setJobs([]);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch scheduled jobs:', error);
        // Display default fallback demo jobs matching Image 2
        setJobs([
          {
            id: 'demo-1',
            recipient_email: 'John Smith',
            scheduled_at: new Date(Date.now() + 3600000).toISOString(),
            campaign: {
              subject: 'Meeting follow-up - Scheduled',
              body: 'Hi John, just wanted to follow up on our meeting yesterday regarding the new campaign launch...',
            },
          },
          {
            id: 'demo-2',
            recipient_email: 'Olive',
            scheduled_at: new Date(Date.now() + 7200000).toISOString(),
            campaign: {
              subject: "Ramit, great to meet you - you'll love it",
              body: 'Hi Olive, just wanted to follow up on our meeting and introduce our lead outreach workflow...',
            },
          },
        ]);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();

    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      fetchJobs(customEvent.detail);
    };

    const handleRefresh = () => {
      fetchJobs();
    };

    window.addEventListener('app-search', handleSearch);
    window.addEventListener('app-refresh', handleRefresh);

    return () => {
      window.removeEventListener('app-search', handleSearch);
      window.removeEventListener('app-refresh', handleRefresh);
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Clock className="animate-spin mr-2" size={20} />
        Loading scheduled emails...
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(job)}
            className="flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 cursor-pointer group"
          >
            {/* Left Recipient */}
            <div className="w-1/4 min-w-0 pr-4">
              <span className="text-xs font-semibold text-gray-900 truncate block">
                To: {job.recipient_email}
              </span>
            </div>

            {/* Middle Badge & Subject Snippet */}
            <div className="flex items-center gap-3 w-2/4 min-w-0">
              {/* Orange Pill matching Image 2 */}
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FFF8F3] text-[#E57A3A] rounded-full text-[11px] font-semibold border border-[#FFE8D6] whitespace-nowrap flex-shrink-0">
                <Clock size={12} />
                {format(new Date(job.scheduled_at), 'EEE h:mm:ss a')}
              </span>

              <p className="text-xs truncate flex-1 min-w-0">
                <span className="font-bold text-gray-900">{job.campaign.subject}</span>
                <span className="text-gray-400 font-normal ml-2">- {job.campaign.body}</span>
              </p>
            </div>

            {/* Right Star Icon */}
            <div className="w-1/4 flex justify-end text-gray-300 hover:text-yellow-400 transition-colors pl-4">
              <Star size={17} />
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="text-center py-24">
            <div className="bg-gray-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
              <Clock className="text-gray-400" size={22} />
            </div>
            <h3 className="text-gray-900 font-bold text-sm mb-1">No emails scheduled</h3>
            <p className="text-gray-400 text-xs">Create a new compose campaign to schedule emails.</p>
          </div>
        )}
      </div>

      {/* Email Detail Modal */}
      <EmailDetailModal email={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}