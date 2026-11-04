"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadVideo } from '../../lib/api';
import { StatusPanel } from '../../components/StatusPanel';
import { UploadCloud, FileVideo, AlertCircle, Mail, Check } from 'lucide-react';
import Link from 'next/link';

export default function AnalyzePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [alertEmail, setAlertEmail] = useState<string>('');
  const [tempEmail, setTempEmail] = useState<string>('');
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qEmail = params.get('email');
      const sEmail = sessionStorage.getItem('fieldsight_alert_email');
      const initial = qEmail || sEmail || '';
      if (initial) {
        setAlertEmail(initial);
        setTempEmail(initial);
        setIsEditingEmail(false);
      } else {
        setIsEditingEmail(true);
      }
    }
  }, []);

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  const handleSaveEmail = () => {
    const trimmed = tempEmail.trim();
    if (!trimmed) {
      setEmailError('Please enter an email address.');
      return;
    }
    if (!validateEmail(trimmed)) {
      setEmailError('Please enter a valid email format.');
      return;
    }
    setEmailError(null);
    setAlertEmail(trimmed);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fieldsight_alert_email', trimmed);
    }
    setIsEditingEmail(false);
  };

  const handleFileChange = (selectedFile: File | undefined) => {
    setError(null);
    if (!selectedFile) return;
    
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, MOV, AVI).');
      return;
    }
    
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await uploadVideo(file, alertEmail || undefined);
      setJobId(res.job_id);
    } catch (err: any) {
      setError(`Upload failed: ${err?.message || 'Check browser console for details'}`);
      setIsUploading(false);
    }
  };

  const handleComplete = (completedJobId: string) => {
    router.push(`/analyze/${completedJobId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between bg-surface/50">
        <Link href="/" className="font-mono font-medium tracking-wide text-text-primary hover:text-accent transition-colors">
          FieldSight
        </Link>
        <div className="text-sm text-text-secondary font-mono">New Analysis</div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold mb-3">Analyze Footage</h1>
            <p className="text-text-secondary">
              Upload CCTV footage or warehouse recordings for real-time risk assessment.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-risk-critical/10 border border-risk-critical/30 rounded p-4 text-risk-critical font-mono text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {jobId ? (
            <StatusPanel jobId={jobId} onComplete={handleComplete} />
          ) : (
            <div className="space-y-4">
              {/* Alert Email Banner / Inline Editor */}
              {alertEmail && !isEditingEmail ? (
                <div className="bg-surface border border-border rounded p-3 text-xs font-mono flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Mail className="w-3.5 h-3.5 text-accent" />
                    <span>Alerts will be sent to: <strong className="text-text-primary">{alertEmail}</strong></span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setTempEmail(alertEmail); setIsEditingEmail(true); }} 
                    className="text-accent hover:underline font-medium hover:text-blue-700 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                        Alert Notification Email
                      </span>
                    </div>
                    {alertEmail && (
                      <button 
                        type="button" 
                        onClick={() => setIsEditingEmail(false)}
                        className="text-[11px] text-text-muted hover:text-text-primary font-mono"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="email"
                      value={tempEmail}
                      onChange={e => { setTempEmail(e.target.value); setEmailError(null); }}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSaveEmail())}
                      placeholder="supervisor@facility.godrej.com"
                      className="flex-1 bg-white border border-border rounded px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                    <button 
                      type="button"
                      onClick={handleSaveEmail}
                      className="bg-accent text-white px-3.5 py-2 rounded text-xs font-mono font-medium hover:bg-blue-700 transition-colors shrink-0"
                    >
                      Save Email
                    </button>
                  </div>
                  {emailError && (
                    <div className="text-[11px] text-risk-critical mt-1 font-mono">{emailError}</div>
                  )}
                </div>
              )}

              <div 
                className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-text-muted hover:bg-gray-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept="video/mp4,video/quicktime,video/x-msvideo" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full aspect-video bg-black rounded mb-4 overflow-hidden border border-border relative group">
                      <video src={previewUrl} className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-medium bg-black/60 px-3 py-1.5 rounded">Change Video</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-text-primary font-mono text-sm">
                      <FileVideo className="w-4 h-4 text-accent" />
                      {file?.name}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {(file!.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-12 h-12 text-text-muted mb-4" />
                    <div className="text-text-primary font-medium mb-1">Drop footage here or click to browse</div>
                    <div className="text-text-secondary text-sm">MP4, MOV, or AVI up to 100MB</div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!file || isUploading}
                className="w-full bg-accent text-white py-3 rounded font-medium hover:bg-accent/90 disabled:opacity-50 disabled:hover:bg-accent transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? 'Starting...' : 'Start Analysis →'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
