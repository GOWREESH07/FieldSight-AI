"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { getJobResults, getJobStatus } from '../../../lib/api';
import { JobResults, JobStatusResponse, getSeverityOrder } from '../../../lib/utils';
import { VideoPlayer } from '../../../components/VideoPlayer';
import { EventTimeline } from '../../../components/EventTimeline';
import { EventCard } from '../../../components/EventCard';
import { ChatPanel } from '../../../components/ChatPanel';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, Clock, MessageSquare, ListFilter, Bot, Mail } from 'lucide-react';
import { formatTimestamp } from '../../../lib/utils';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function ResultsDashboard({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const [results, setResults] = useState<JobResults | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPartial, setIsPartial] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'events' | 'chat'>('events');
  const [externalPrompt, setExternalPrompt] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const sortEvents = (data: JobResults) => {
    data.events.sort((a, b) => {
      const diff = getSeverityOrder(b.risk_level) - getSeverityOrder(a.risk_level);
      return diff !== 0 ? diff : a.timestamp_start - b.timestamp_start;
    });
    return data;
  };

  const fetchResults = useCallback(async () => {
    try {
      const data = await getJobResults(jobId);
      setResults(sortEvents(data));
      setIsPartial(false);
    } catch {
      // not ready yet — that's ok if we're still processing
    }
  }, [jobId]);

  // Poll status + partial results while processing
  useEffect(() => {
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        setJobStatus(status);

        if (status.status === 'done') {
          clearInterval(pollRef.current!);
          await fetchResults();
        } else if (status.status === 'error') {
          clearInterval(pollRef.current!);
          setError(status.error || 'Processing failed.');
        } else if (status.status === 'processing') {
          // Try to load partial results (events already classified)
          try {
            const partial = await getJobResults(jobId);
            if (partial.events.length > 0) {
              setResults(sortEvents(partial));
              setIsPartial(true);
            }
          } catch { /* no partial results yet — fine */ }
        }
      } catch (e) {
        console.error('Status poll error:', e);
      }
    };

    poll(); // immediate first check
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, fetchResults]);

  const seekVideo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, time - 0.5);
      videoRef.current.play().catch(() => {});
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <div className="bg-surface border border-border p-6 rounded max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-risk-critical mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2 text-text-primary">Processing Failed</h2>
          <p className="text-text-secondary text-sm font-mono mb-6">{error}</p>
          <Link href="/analyze" className="bg-text-primary text-surface px-4 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity">
            Try another video
          </Link>
        </div>
      </div>
    );
  }

  // Still waiting for first data
  if (!results && (!jobStatus || jobStatus.status === 'pending' || jobStatus.status === 'processing')) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <div className="font-mono text-sm text-text-secondary">
          {jobStatus?.stage === 'detecting_objects' && 'Detecting objects & tracking…'}
          {jobStatus?.stage === 'reasoning' && 'Analysing behaviour sequences…'}
          {jobStatus?.stage === 'scoring_risk' && 'Scoring risk…'}
          {(!jobStatus?.stage || jobStatus?.stage === 'extracting_frames') && 'Extracting frames…'}
        </div>
        <div className="text-xs text-text-muted font-mono">
          First results will appear as they are classified
        </div>
      </div>
    );
  }

  if (!results) return null;

  const { summary } = results;
  const isDone = jobStatus?.status === 'done' || !jobStatus;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between bg-surface sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/analyze" className="text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-mono text-sm tracking-wide">
            <span className="text-text-muted">Job </span>{jobId.slice(0, 8)}…
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Stage timings badge */}
          {jobStatus?.stage_timings && isDone && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <Clock className="w-3.5 h-3.5" />
              {Object.entries(jobStatus.stage_timings).map(([k, v]) => (
                <span key={k} className="bg-gray-100 border border-border px-1.5 py-0.5 rounded-sm">
                  {k.replace('_', ' ')}: {(v as number).toFixed(1)}s
                </span>
              ))}
            </div>
          )}
          {/* Nav AI Chatbot quick toggle */}
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? 'events' : 'chat')}
            className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
              activeTab === 'chat'
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-blue-50 text-accent border-accent/30 hover:bg-blue-100'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{activeTab === 'chat' ? 'View Events List' : 'AI Supervisor Chat'}</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto w-full">
        {/* Email Alert Confirmation Banner */}
        {isDone && results.alert_email && (
          <div className="w-full bg-emerald-50 border border-emerald-200 rounded px-4 py-2.5 text-xs font-mono flex items-center justify-between text-emerald-900 shadow-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Processing complete — risk alert sent to <strong className="text-emerald-950">{results.alert_email}</strong>
              </span>
            </div>
            <span className="text-[10px] text-emerald-800 uppercase tracking-widest bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300/60 font-semibold">
              Alert Dispatched
            </span>
          </div>
        )}

        <div className="flex flex-col xl:flex-row gap-6 w-full">
          {/* Left Column */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
          <VideoPlayer
            jobId={jobId}
            tracks={results.tracks}
            events={results.events}
            onTimeUpdate={setCurrentTime}
            videoRef={videoRef}
          />
          <EventTimeline
            events={results.events}
            duration={results.duration_seconds}
            onSeek={seekVideo}
            currentTime={currentTime}
          />

          {/* Summary cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3 text-text-primary">
              <span className={summary.total_events > 0 ? 'text-risk-high' : 'text-text-primary'}>
                {summary.total_events}
              </span>{' '}
              events caught for early intervention
              {isPartial && <span className="text-sm font-normal text-text-muted ml-2">(updating…)</span>}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Critical', value: summary.by_risk.critical, cls: 'text-risk-critical' },
                { label: 'High', value: summary.by_risk.high, cls: 'text-risk-high' },
                { label: 'Medium', value: summary.by_risk.medium, cls: 'text-risk-medium' },
                { label: 'Prevented (Est.)', value: summary.events_prevented_estimate, cls: 'text-accent' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-surface border border-border rounded p-4">
                  <div className="text-text-muted text-xs uppercase tracking-widest font-mono mb-1">{label}</div>
                  <div className={`text-2xl font-mono font-medium ${cls}`}>{value}</div>
                </div>
              ))}
            </div>

            <div className="bg-surface border border-border rounded p-4 text-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-text-muted">Most frequent: </span>
                <span className="text-text-primary font-medium">{summary.most_frequent_behaviour || '—'}</span>
              </div>
              <div className="text-text-muted font-mono text-xs">
                Duration: {results.duration_seconds.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed View (Events vs Chatbot) */}
        <div className="w-full xl:w-[460px] shrink-0 flex flex-col gap-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto scrollbar-thin">
          {/* Segmented Control Tabs */}
          <div className="flex bg-gray-100 p-1 rounded border border-border">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-2 px-3 text-xs font-mono font-medium rounded flex items-center justify-center gap-2 transition-all ${
                activeTab === 'events'
                  ? 'bg-white shadow-sm text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Events ({results.events.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-3 text-xs font-mono font-medium rounded flex items-center justify-center gap-2 transition-all ${
                activeTab === 'chat'
                  ? 'bg-white shadow-sm text-accent font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Chatbot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>
          </div>

          {/* TAB 1: Chatbot Tab */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col">
              <ChatPanel 
                jobId={jobId} 
                events={results.events} 
                externalPrompt={externalPrompt}
                onPromptHandled={() => setExternalPrompt(null)}
                className="h-[620px]"
              />
            </div>
          )}

          {/* TAB 2: Events Tab */}
          {activeTab === 'events' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary text-sm">Detected Incidents</h3>
                <span className="text-xs font-mono text-text-muted bg-gray-100 px-2 py-1 rounded border border-border">
                  {results.events.length} · by severity
                </span>
              </div>

              {/* Quick Prompt Banner to switch to Chat */}
              <button
                onClick={() => setActiveTab('chat')}
                className="w-full text-left p-3 rounded bg-blue-50/70 border border-blue-200/80 hover:bg-blue-100/70 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-text-primary">Ask AI Supervisor questions</div>
                    <div className="text-[11px] text-text-muted">Chat about sequences, causes, and prevention</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
                  Open Chat →
                </span>
              </button>

              <div className="flex flex-col gap-2">
                {results.events.length === 0 ? (
                  <div className="text-center p-8 bg-surface border border-border rounded text-text-secondary text-sm">
                    {isPartial ? 'Waiting for first classification…' : 'No risk events detected.'}
                  </div>
                ) : (
                  results.events.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onSelect={seekVideo}
                      onAskAi={(ev) => {
                        setActiveTab('chat');
                        setExternalPrompt(`Explain event '${ev.behaviour_label}' detected at ${formatTimestamp(ev.timestamp_start)} with risk score ${ev.risk_score.toFixed(1)}. What happened, why is it dangerous, and how to avoid it?`);
                      }}
                    />
                  ))
                )}
                
                <p className="text-center text-xs text-text-muted py-4 max-w-xs mx-auto font-mono">
                  Detections represent observed behaviour and potential risk. Human review required before any corrective action.
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      </main>

      {/* Floating Action Button to quickly open chat */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setActiveTab(activeTab === 'chat' ? 'events' : 'chat')}
          className="bg-accent text-white px-4 py-2.5 rounded shadow-lg hover:bg-blue-700 flex items-center gap-2 font-mono text-xs font-medium transition-all hover:scale-105 border border-blue-400"
        >
          <Bot className="w-4 h-4" />
          <span>{activeTab === 'chat' ? 'Close Chatbot' : '💬 Ask AI Supervisor'}</span>
          {activeTab !== 'chat' && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
          )}
        </button>
      </div>
    </div>
  );
}
