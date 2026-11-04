"use client";
import { useState } from 'react';
import Link from 'next/link';
import { FlowDiagram } from '../components/FlowDiagram';
import { BehaviourGrid } from '../components/BehaviourGrid';
import { EmailCaptureModal } from '../components/EmailCaptureModal';
import { ArrowRight, ShieldCheck, Activity, EyeOff } from 'lucide-react';

export default function Home() {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Email Capture Modal */}
      <EmailCaptureModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="font-mono font-medium tracking-wide">FieldSight</div>
        <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          <Link href="#features" className="hover:text-text-primary transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-text-primary transition-colors">How it Works</Link>
          <Link href="#architecture" className="hover:text-text-primary transition-colors">Architecture</Link>
        </div>
        <button 
          onClick={() => setIsEmailModalOpen(true)}
          className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
        >
          Analyze Footage <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="px-6 py-24 max-w-7xl mx-auto">
          <div className="max-w-3xl mb-16">
            <h1 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight mb-6">
              From CCTV that records,<br />
              to AI that intervenes.
            </h1>
            <p className="text-xl text-text-secondary leading-relaxed mb-10">
              FieldSight is a computer vision platform that detects risky manual handling behaviours in real-time, preventing product damage before it happens.
            </p>
            <button 
              onClick={() => setIsEmailModalOpen(true)}
              className="inline-flex items-center gap-2 bg-text-primary text-background px-6 py-3 rounded font-medium hover:bg-white transition-colors"
            >
              Analyze Footage <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-surface border border-border rounded-lg p-8">
            <h3 className="text-text-primary font-medium mb-8 text-center">The FieldSight Advantage</h3>
            <FlowDiagram />
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border bg-surface/60">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="flex flex-col items-center text-center px-4">
              <EyeOff className="w-8 h-8 text-accent mb-4" />
              <div className="text-3xl font-mono font-medium text-text-primary mb-2">12</div>
              <div className="text-text-secondary text-sm uppercase tracking-wider">Behaviours Monitored</div>
            </div>
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <Activity className="w-8 h-8 text-risk-high mb-4" />
              <div className="text-3xl font-mono font-medium text-text-primary mb-2">Real-time</div>
              <div className="text-text-secondary text-sm uppercase tracking-wider">Detection & Tracking</div>
            </div>
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <ShieldCheck className="w-8 h-8 text-risk-critical mb-4" />
              <div className="text-3xl font-mono font-medium text-text-primary mb-2">0</div>
              <div className="text-text-secondary text-sm uppercase tracking-wider">False Negatives Tolerated</div>
            </div>
          </div>
        </section>

        {/* Behaviours */}
        <section id="features" className="px-6 py-24 max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">What it watches for</h2>
            <p className="text-text-secondary max-w-2xl">
              Our models are trained on specific warehouse handling patterns, classifying actions by their potential to cause structural damage to products.
            </p>
          </div>
          <BehaviourGrid />
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border bg-surface/60 px-6 py-24">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-semibold mb-16 text-center">How it works</h2>
            
            <div className="relative">
              {/* Desktop connecting line */}
              <div className="hidden md:block absolute top-6 left-12 right-12 h-px bg-border z-0" />
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
                {[
                  { num: "01", title: "Upload Footage", desc: "Connect CCTV streams or upload recorded MP4s." },
                  { num: "02", title: "AI Detects & Tracks", desc: "Workers and objects are continuously tracked across frames." },
                  { num: "03", title: "Behaviour Classification", desc: "Action sequences are evaluated for risk factors." },
                  { num: "04", title: "Supervisor Alerts", desc: "Review incidents with full context and ask AI questions." }
                ].map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center bg-surface/60 md:bg-transparent">
                    <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center font-mono text-sm text-text-primary mb-6 shadow-sm">
                      {step.num}
                    </div>
                    <h4 className="font-medium text-text-primary mb-2">{step.title}</h4>
                    <p className="text-sm text-text-secondary">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="px-6 py-24 max-w-7xl mx-auto border-t border-border">
          <h2 className="text-sm font-mono uppercase tracking-widest text-text-muted text-center mb-12">Technical Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded p-6">
              <h4 className="font-mono text-sm text-text-primary mb-2">CV Pipeline</h4>
              <p className="text-xs text-text-secondary">YOLOv8 + ByteTrack for high-speed object detection and persistent multi-object tracking.</p>
            </div>
            <div className="bg-surface border border-border rounded p-6">
              <h4 className="font-mono text-sm text-text-primary mb-2">Temporal Reasoning</h4>
              <p className="text-xs text-text-secondary">Gemini 2.5 Flash processing tracked frame sequences for nuanced behaviour understanding.</p>
            </div>
            <div className="bg-surface border border-border rounded p-6">
              <h4 className="font-mono text-sm text-text-primary mb-2">Risk Engine</h4>
              <p className="text-xs text-text-secondary">Deterministic scoring based on baseline severity and situational factors (height, duration).</p>
            </div>
            <div className="bg-surface border border-border rounded p-6">
              <h4 className="font-mono text-sm text-text-primary mb-2">Conversational AI</h4>
              <p className="text-xs text-text-secondary">RAG-powered assistant grounded strictly in detected event context for supervisor inquiry.</p>
            </div>
          </div>
        </section>

        {/* Responsible AI Banner */}
        <section className="bg-surface border-y border-border py-8 px-6 text-center">
          <div className="max-w-4xl mx-auto text-sm text-text-secondary">
            <strong className="text-text-primary">Responsible AI:</strong> FieldSight flags handling behaviour for process improvement, not individual employee punishment. All detections are classified as observed behaviour or potential risk — never confirmed damage without human review.
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 flex flex-col md:flex-row items-center justify-between border-t border-border text-xs text-text-muted font-mono">
        <div>FieldSight © 2025</div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <span className="hover:text-text-secondary cursor-pointer">Privacy Policy</span>
          <span>·</span>
          <span className="hover:text-text-secondary cursor-pointer">Data Minimization</span>
          <span>·</span>
          <span className="hover:text-text-secondary cursor-pointer">Contact</span>
        </div>
      </footer>
    </div>
  );
}
