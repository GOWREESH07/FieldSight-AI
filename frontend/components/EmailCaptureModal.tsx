"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, X, AlertCircle, ShieldCheck } from 'lucide-react';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailCaptureModal({ isOpen, onClose }: EmailCaptureModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Pre-fill from sessionStorage if available
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('fieldsight_alert_email') : '';
      if (saved) setEmail(saved);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please provide an email address to receive your risk alert.');
      return;
    }

    if (!validateEmail(trimmed)) {
      setError('Please enter a valid email address (e.g. name@company.com).');
      return;
    }

    // Persist to session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fieldsight_alert_email', trimmed);
    }

    onClose();
    router.push(`/analyze?email=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* In-flow Dialog Card matching Light Ops aesthetic */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded shadow-xl overflow-hidden z-10 transition-all">
        {/* Header strip */}
        <div className="px-6 py-4 border-b border-border bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
              Risk Alert Setup
            </span>
            <span className="text-xs text-text-muted font-mono">Step 1 of 2</span>
          </div>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Where should we send your risk alert when processing is done?
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed mb-6">
            FieldSight runs automated computer vision reasoning over your footage. Once classified, a full supervisor incident summary and dashboard link will be dispatched to this address.
          </p>

          <div className="space-y-3 mb-6">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted">
              Supervisor Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                placeholder="supervisor@facility.godrej.com"
                className={`w-full bg-white border ${
                  error ? 'border-risk-critical focus:border-risk-critical' : 'border-border focus:border-accent'
                } rounded pl-9 pr-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all`}
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-risk-critical font-mono mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              className="w-full bg-accent text-white py-3 rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm font-mono text-sm"
            >
              Continue to Upload <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted font-mono text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Used strictly for job completion dispatch. No spam or marketing.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
