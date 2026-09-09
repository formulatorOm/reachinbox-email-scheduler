'use client';

import { ArrowLeft, Paperclip, Clock, Upload, X, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface SenderAccount {
  id: string;
  email: string;
  sender_name: string;
}

export default function ComposePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.email || '1';

  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [recipientsList, setRecipientsList] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [delayBetween, setDelayBetween] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [startTime, setStartTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSendLater, setShowSendLater] = useState<boolean>(false);
  const [selectedPresetTime, setSelectedPresetTime] = useState<string>('');

  // Fetch senders for current user
  useEffect(() => {
    fetch(`http://localhost:5002/api/senders/${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSenders(data);
          setSelectedSenderId(data[0].id);
        }
      })
      .catch(() => {
        // Fallback sender
        setSenders([{ id: 'default-sender', email: userId, sender_name: session?.user?.name || 'Oliver' }]);
        setSelectedSenderId('default-sender');
      });
  }, [userId, session]);

  // CSV Lead list upload handler using PapaParse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const parsedEmails: string[] = [];
        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === 'string' && cell.includes('@') && cell.trim()) {
                parsedEmails.push(cell.trim());
              }
            });
          } else if (typeof row === 'object' && row !== null) {
            Object.values(row).forEach((val: any) => {
              if (typeof val === 'string' && val.includes('@') && val.trim()) {
                parsedEmails.push(val.trim());
              }
            });
          }
        });

        if (parsedEmails.length > 0) {
          const unique = Array.from(new Set([...recipientsList, ...parsedEmails]));
          setRecipientsList(unique);
          toast.success(`Parsed ${parsedEmails.length} email addresses from CSV!`);
        } else {
          toast.error('No valid email addresses found in file.');
        }
      },
      error: () => {
        toast.error('Error parsing CSV file.');
      },
    });
  };

  const handleAddSingleRecipient = () => {
    if (recipientInput.trim() && recipientInput.includes('@')) {
      if (!recipientsList.includes(recipientInput.trim())) {
        setRecipientsList([...recipientsList, recipientInput.trim()]);
      }
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipientsList(recipientsList.filter((e) => e !== emailToRemove));
  };

  const handleApplyPresetTime = (preset: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (preset === 'Tomorrow, 10:00 AM') {
      tomorrow.setHours(10, 0, 0, 0);
    } else if (preset === 'Tomorrow, 11:00 AM') {
      tomorrow.setHours(11, 0, 0, 0);
    } else if (preset === 'Tomorrow, 3:00 PM') {
      tomorrow.setHours(15, 0, 0, 0);
    } else {
      tomorrow.setHours(9, 0, 0, 0);
    }

    const isoStr = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setStartTime(isoStr);
    setSelectedPresetTime(preset);
  };

  const handleSubmit = async () => {
    let finalRecipients = [...recipientsList];
    if (recipientInput.trim() && recipientInput.includes('@')) {
      if (!finalRecipients.includes(recipientInput.trim())) {
        finalRecipients.push(recipientInput.trim());
      }
    }

    if (finalRecipients.length === 0) {
      toast.error('Please specify at least one recipient email.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Scheduling email campaign...');

    try {
      const res = await fetch('http://localhost:5002/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          senderAccountId: selectedSenderId || 'default-sender',
          subject,
          body,
          recipients: finalRecipients,
          delayBetween: Number(delayBetween) || 0,
          hourlyLimit: Number(hourlyLimit) || 100,
          startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Campaign scheduled successfully!', { id: toastId });
        router.push('/');
      } else {
        toast.error(data.error || 'Failed to schedule campaign.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error. Is backend running?', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white min-h-[750px] rounded-2xl shadow-xs border border-gray-200/80 p-8 flex flex-col justify-between relative">
      <div>
        {/* Header toolbar matching Images 1, 2 & 3 */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Compose New Email</h1>
          </div>

          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <Paperclip size={19} className="text-gray-400 cursor-pointer hover:text-gray-600" />
              {recipientsList.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#00A84F] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </div>
            
            <Clock
              size={19}
              onClick={() => setShowSendLater(!showSendLater)}
              className="text-gray-400 cursor-pointer hover:text-gray-600 transition"
            />
            
            <button
              onClick={() => setShowSendLater(!showSendLater)}
              disabled={isSubmitting}
              className="border border-[#00A84F] text-[#00A84F] px-6 py-2 rounded-full font-semibold text-sm hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Scheduling...' : 'Send Later'}
            </button>

            {/* SEND LATER POPOVER MODAL matching Image 1 */}
            {showSendLater && (
              <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                <h3 className="text-sm font-bold text-gray-900">Send Later</h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-gray-400">Pick date & time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setSelectedPresetTime('Custom');
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-green-500"
                  />
                </div>

                <div className="flex flex-col gap-1 border-t border-gray-100 pt-2 text-xs">
                  {['Tomorrow', 'Tomorrow, 10:00 AM', 'Tomorrow, 11:00 AM', 'Tomorrow, 3:00 PM'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyPresetTime(preset)}
                      className={`text-left py-2 px-3 rounded-lg transition font-medium ${
                        selectedPresetTime === preset ? 'bg-emerald-50 text-[#00A84F] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowSendLater(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSendLater(false);
                      toast.success(startTime ? `Scheduled for ${new Date(startTime).toLocaleString()}` : 'Date set!');
                    }}
                    className="border border-[#00A84F] text-[#00A84F] hover:bg-[#00A84F] hover:text-white text-xs font-semibold px-4 py-1.5 rounded-full transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* FROM SELECT */}
          <div className="flex items-center border-b border-gray-100 pb-4">
            <label className="w-28 text-xs font-bold text-gray-500 uppercase tracking-wider">From</label>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium text-gray-800 outline-none w-72 focus:border-green-500 transition"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sender_name} &lt;{s.email}&gt;
                </option>
              ))}
              {senders.length === 0 && <option value="default">oliver.brown@domain.io</option>}
            </select>
          </div>

          {/* TO RECIPIENTS matching Image 2 & 3 */}
          <div className="flex items-start border-b border-gray-100 pb-4 relative">
            <label className="w-28 text-xs font-bold text-gray-500 uppercase tracking-wider pt-2">To</label>
            <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0 pr-36">
              {recipientsList.slice(0, 3).map((email) => (
                <span
                  key={email}
                  className="bg-[#E8F5E9] text-[#00A84F] border border-[#C8E6C9] text-xs px-3 py-1 rounded-full flex items-center gap-1 font-semibold"
                >
                  {email}
                  <button onClick={() => handleRemoveRecipient(email)} className="hover:text-red-500 ml-1">
                    <X size={12} />
                  </button>
                </span>
              ))}

              {recipientsList.length > 3 && (
                <span className="bg-[#E8F5E9] text-[#00A84F] border border-[#C8E6C9] text-xs px-2.5 py-1 rounded-full font-bold">
                  +{recipientsList.length - 3}
                </span>
              )}

              <input
                type="email"
                placeholder={recipientsList.length === 0 ? "recipient@example.com (press Enter to add)" : "Add lead..."}
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSingleRecipient();
                  }
                }}
                className="flex-1 outline-none text-xs text-gray-800 placeholder-gray-400 py-1 min-w-[160px]"
              />
            </div>

            {/* CSV Lead Upload Button matching Image 2 & 3 */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-0 top-1 flex items-center gap-1.5 text-xs text-[#00A84F] font-semibold bg-white hover:bg-emerald-50 border border-transparent hover:border-emerald-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Upload size={14} /> Upload List
            </button>
          </div>

          {/* SUBJECT */}
          <div className="flex items-center border-b border-gray-100 pb-4">
            <label className="w-28 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</label>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 outline-none text-xs text-gray-800 placeholder-gray-400 font-medium"
            />
          </div>

          {/* THROTTLING CONFIG matching Images 1, 2 & 3 */}
          <div className="flex items-center gap-8 py-2">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600">Delay between 2 emails</label>
              <input
                type="number"
                min="0"
                placeholder="00"
                value={delayBetween || ''}
                onChange={(e) => setDelayBetween(Number(e.target.value))}
                className="w-16 bg-white border border-gray-200 rounded-xl p-2 text-center outline-none text-xs font-bold text-gray-800 focus:border-green-500 transition"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600">Hourly Limit</label>
              <input
                type="number"
                min="1"
                placeholder="00"
                value={hourlyLimit || ''}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-16 bg-white border border-gray-200 rounded-xl p-2 text-center outline-none text-xs font-bold text-gray-800 focus:border-green-500 transition"
              />
            </div>
          </div>

          {/* BODY EDITOR WITH RICH TOOLBAR matching Images 1, 2 & 3 */}
          <div className="mt-4 bg-[#F9FAFB] rounded-2xl border border-gray-200/80 min-h-[320px] p-6 flex flex-col">
            <p className="text-xs text-gray-400 mb-3 font-normal">Type Your Reply...</p>
            
            {/* RICH TOOLBAR matching Image 2 & 3 */}
            <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200/80 text-gray-400 text-xs mb-4 select-none shadow-2xs">
              <span className="hover:text-gray-800 cursor-pointer font-semibold">↩</span>
              <span className="hover:text-gray-800 cursor-pointer font-semibold">↪</span>
              <span className="h-4 w-px bg-gray-200 mx-1"></span>
              <span className="hover:text-gray-800 cursor-pointer font-bold">T<span className="text-[10px]">T</span> ↕</span>
              <span className="h-4 w-px bg-gray-200 mx-1"></span>
              <span className="font-bold hover:text-gray-800 cursor-pointer">B</span>
              <span className="italic hover:text-gray-800 cursor-pointer">I</span>
              <span className="underline hover:text-gray-800 cursor-pointer">U</span>
              <span className="h-4 w-px bg-gray-200 mx-1"></span>
              <span className="hover:text-gray-800 cursor-pointer font-semibold">≡ ↕</span>
              <span className="h-4 w-px bg-gray-200 mx-1"></span>
              <span className="hover:text-gray-800 cursor-pointer">½=</span>
              <span className="hover:text-gray-800 cursor-pointer">•=</span>
              <span className="hover:text-gray-800 cursor-pointer">&gt;|</span>
              <span className="hover:text-gray-800 cursor-pointer">|&lt;</span>
              <span className="hover:text-gray-800 cursor-pointer">“</span>
              <span className="hover:text-gray-800 cursor-pointer">📎</span>
              <span className="hover:text-gray-800 cursor-pointer line-through">S</span>
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full flex-1 bg-transparent border-none outline-none text-xs text-gray-800 placeholder-gray-400 resize-none font-sans leading-relaxed"
              rows={10}
            />
          </div>
        </div>
      </div>

      {/* Footer Submit Button */}
      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-[#00A84F] hover:bg-[#009245] active:bg-[#007D3B] text-white font-semibold py-2.5 px-8 rounded-full transition shadow-xs text-xs cursor-pointer disabled:opacity-50"
        >
          <Send size={15} />
          {isSubmitting ? 'Scheduling...' : 'Schedule Campaign'}
        </button>
      </div>
    </div>
  );
}