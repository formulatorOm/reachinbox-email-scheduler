'use client';
import { ArrowLeft, Star, Folder, Trash2, X, Paperclip } from 'lucide-react';
import { format } from 'date-fns';

interface EmailDetailModalProps {
  email: {
    id: string;
    recipient_email: string;
    scheduled_at?: string;
    sent_at?: string;
    status?: string;
    campaign: {
      subject: string;
      body: string;
    };
  } | null;
  onClose: () => void;
}

export default function EmailDetailModal({ email, onClose }: EmailDetailModalProps) {
  if (!email) return null;

  const dateStr = email.sent_at || email.scheduled_at || new Date().toISOString();
  const formattedDate = format(new Date(dateStr), 'MMM d, h:mm a');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header toolbar matching Image 4 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 truncate max-w-xl">
              {email.campaign.subject}
            </h2>
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              ID: {email.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <button className="p-2 hover:text-yellow-400 hover:bg-gray-50 rounded-full transition">
              <Star size={18} />
            </button>
            <button className="p-2 hover:text-gray-600 hover:bg-gray-50 rounded-full transition">
              <Folder size={18} />
            </button>
            <button className="p-2 hover:text-red-500 hover:bg-gray-50 rounded-full transition">
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:text-gray-700 hover:bg-gray-100 rounded-full transition ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1">
          {/* Sender & Recipient Metadata */}
          <div className="flex items-start justify-between pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                {(email.recipient_email[0] || 'R').toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">ReachInbox Sender</span>
                  <span className="text-xs text-gray-400">&lt;sender@outboxlabs.com&gt;</span>
                </div>
                <p className="text-xs text-gray-500">to <span className="font-medium text-gray-700">{email.recipient_email}</span></p>
              </div>
            </div>
            <span className="text-xs font-medium text-gray-400">{formattedDate}</span>
          </div>

          {/* Email Body */}
          <div className="prose max-w-none text-gray-800 text-sm leading-relaxed whitespace-pre-wrap py-2">
            {email.campaign.body}
          </div>

          {/* Sample Card / Attachment indicator if present */}
          <div className="pt-6 border-t border-gray-100">
            <div className="p-4 bg-amber-50/60 border border-amber-200/60 rounded-lg flex items-center gap-3 text-xs text-amber-900 font-medium">
              <span className="bg-amber-100 p-1.5 rounded-full text-amber-700">⚡</span>
              <span><strong>Scheduled Email Dispatch:</strong> Sent automatically via ReachInbox BullMQ Queue.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
