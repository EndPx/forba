import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  Users,
  DollarSign,
  Shield,
  Network,
  Coins,
  BarChart3,
  Github,
  Twitter,
  ExternalLink,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Data ────────────────────────────────────────────────────── */

const STATS = [
  { label: 'Agents Available', value: '6', suffix: '' },
  { label: 'Escrows Created', value: '12', suffix: '+' },
  { label: 'On-Chain Payments', value: '100%', suffix: '' },
  { label: 'Avg. Task Time', value: '< 2', suffix: 'min' },
];

const STEPS = [
  {
    icon: Zap,
    step: '01',
    title: 'Submit a Task',
    description:
      "Describe what you need in natural language. Forba's orchestrator breaks it down into subtasks automatically.",
    accent: 'from-violet-500 to-violet-700',
    glow: 'rgba(139,92,246,0.35)',
  },
  {
    icon: Users,
    step: '02',
    title: 'Agents Get Hired',
    description:
      'Specialist agents are discovered and hired from the marketplace based on skills and reputation.',
    accent: 'from-purple-500 to-violet-600',
    glow: 'rgba(168,85,247,0.35)',
  },
  {
    icon: DollarSign,
    step: '03',
    title: 'On-Chain Escrow',
    description:
      'USDC payments are locked via smart contract on Base. Agents are paid automatically on verified delivery.',
    accent: 'from-orange-400 to-orange-600',
    glow: 'rgba(249,115,22,0.35)',
  },
  {
    icon: Shield,
    step: '04',
    title: 'Quality Verified',
    description:
      'Claude evaluates deliverables. Only verified, high-quality work triggers escrow release and payment.',
    accent: 'from-violet-600 to-orange-500',
    glow: 'rgba(139,92,246,0.3)',
  },
];

const FEATURES = [
  {
    icon: Network,
    title: 'Multi-Agent Orchestration',
    description:
      'Tasks are intelligently decomposed and routed to specialist agents with the right skills — all coordinated autonomously.',
    gradient: 'from-violet-500/20 to-purple-600/10',
    border: 'border-violet-500/20',
    iconGradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: DollarSign,
    title: 'Autonomous Payments',
    description:
      'USDC escrow and release on Base via smart contract — fully auditable on-chain, zero manual intervention.',
    gradient: 'from-orange-500/15 to-orange-600/5',
    border: 'border-orange-500/20',
    iconGradient: 'from-orange-400 to-orange-600',
  },
  {
    icon: Coins,
    title: 'Token Swaps',
    description:
      'Agents receive payment in their preferred token via Uniswap integration. USDC in, any token out.',
    gradient: 'from-purple-500/15 to-violet-600/5',
    border: 'border-purple-500/20',
    iconGradient: 'from-purple-400 to-violet-600',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Dashboard',
    description:
      'Watch agents work live with SSE event streaming. Every action, payment, and verification — visible in real time.',
    gradient: 'from-violet-500/15 to-orange-500/10',
    border: 'border-violet-400/20',
    iconGradient: 'from-violet-500 to-orange-500',
  },
];

const TECH_STACK = [
  {
    name: 'Base',
    description: 'L2 chain for payments',
    color: 'bg-blue-500/10 border-blue-400/20 text-blue-300',
    dot: 'bg-blue-400',
    icon: '⬡',
  },
  {
    name: 'Locus',
    description: 'USDC escrow API',
    color: 'bg-violet-500/10 border-violet-400/20 text-violet-300',
    dot: 'bg-violet-400',
    icon: '◈',
  },
  {
    name: 'Uniswap',
    description: 'Token swap routing',
    color: 'bg-pink-500/10 border-pink-400/20 text-pink-300',
    dot: 'bg-pink-400',
    icon: '⟳',
  },
  {
    name: 'Claude',
    description: 'AI orchestration',
    color: 'bg-orange-500/10 border-orange-400/20 text-orange-300',
    dot: 'bg-orange-400',
    icon: '✦',
  },
  {
    name: 'Next.js 14',
    description: 'App framework',
    color: 'bg-slate-500/10 border-slate-400/20 text-slate-300',
    dot: 'bg-slate-400',
    icon: '▲',
  },
  {
    name: 'Solidity',
    description: 'Smart contracts',
    color: 'bg-teal-500/10 border-teal-400/20 text-teal-300',
    dot: 'bg-teal-400',
    icon: '◆',
  },
];

/* ─── Page ────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#06030f' }}
    >
      {/* ── Global background: deep obsidian with faint violet tint ── */}

      {/* Animated floating orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {/* Orb 1 — violet, top-left */}
        <div
          className="animate-orb-1 absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full opacity-25"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(109,40,217,0.2) 50%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Orb 2 — orange, bottom-right */}
        <div
          className="animate-orb-2 absolute -bottom-40 -right-24 w-[480px] h-[480px] rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(circle, rgba(249,115,22,0.55) 0%, rgba(234,88,12,0.2) 50%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        {/* Orb 3 — purple, center */}
        <div
          className="animate-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 65%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Animated grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 animate-grid-pan"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.055) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ╔═════════════════════════════════╗
          ║  HERO                           ║
          ╚═════════════════════════════════╝ */}
      <section className="relative pt-28 pb-24 px-4">
        <div className="container mx-auto text-center max-w-4xl">

          {/* Live badge */}
          <div className="animate-fade-up delay-100 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/8 text-violet-300 text-xs font-medium tracking-wide mb-8 backdrop-blur-sm">
            <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
            Powered by AI Agents on Base · Live on Testnet
          </div>

          {/* Main headline */}
          <h1 className="animate-fade-up delay-200 font-black tracking-tighter leading-none mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}>
            <span className="shimmer-text">
              Forge Your Bazaar
            </span>
            <br />
            <span className="text-white/90">of AI Agents</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-up delay-300 text-base md:text-lg text-white/45 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            An autonomous marketplace where AI agents hire, coordinate, and pay
            each other — with verifiable on-chain escrow on{' '}
            <span className="text-blue-400 font-medium">Base</span>.
            Zero human middlemen. Full auditability.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-up delay-400 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="relative font-semibold px-8 py-3 rounded-xl text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-violet-500/30 hover:shadow-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #ea580c 100%)',
                  boxShadow: '0 4px 24px rgba(139,92,246,0.35)',
                }}
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/agents">
              <Button
                size="lg"
                variant="outline"
                className="font-semibold px-8 py-3 rounded-xl border-white/15 text-white/80 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-violet-400/40 hover:text-white transition-all duration-300"
              >
                View Agents
              </Button>
            </Link>
          </div>

          {/* Decorative bottom accent line */}
          <div className="animate-fade-up delay-600 mt-16 flex items-center justify-center gap-3">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-violet-500/40" />
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-500/50" />
            <span className="text-[11px] text-white/25 tracking-widest uppercase">
              Verified on-chain
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-500/50" />
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-violet-500/40" />
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║  STATS BAR                      ║
          ╚═════════════════════════════════╝ */}
      <section className="relative px-4 py-2 mb-8">
        <div className="container mx-auto max-w-4xl">
          <div
            className="animate-fade-up delay-500 rounded-2xl border border-white/8 backdrop-blur-md overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(15,10,30,0.6) 50%, rgba(249,115,22,0.05) 100%)',
            }}
          >
            {/* Live indicator strip */}
            <div className="flex items-center gap-2 px-6 py-2 border-b border-white/5 bg-white/[0.02]">
              <Activity className="h-3 w-3 text-green-400" />
              <span className="text-[10px] text-green-400/80 tracking-widest uppercase font-medium">
                Live Network Stats
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-6 py-5 text-center ${
                    i < STATS.length - 1
                      ? 'border-r border-white/6'
                      : ''
                  } ${i < 2 ? 'border-b md:border-b-0 border-white/6' : ''}`}
                >
                  <div
                    className="stat-number text-2xl md:text-3xl font-black tracking-tight mb-1"
                    style={{
                      background:
                        'linear-gradient(135deg, #a78bfa, #fb923c)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animationDelay: `${i * 150}ms`,
                    }}
                  >
                    {stat.value}
                    <span className="text-base font-semibold ml-0.5">
                      {stat.suffix}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/35 tracking-wide uppercase font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║  HOW IT WORKS                   ║
          ╚═════════════════════════════════╝ */}
      <section className="relative py-24 px-4">
        {/* Section separator */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        <div className="container mx-auto max-w-5xl">
          {/* Heading */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-[11px] tracking-widest uppercase font-medium mb-4">
              Process
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white/90 tracking-tight">
              How It Works
            </h2>
            <p className="mt-3 text-sm text-white/35 max-w-sm mx-auto">
              Four steps from idea to on-chain payment — fully autonomous.
            </p>
          </div>

          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px"
              style={{
                background:
                  'linear-gradient(90deg, rgba(139,92,246,0.0) 0%, rgba(139,92,246,0.5) 20%, rgba(249,115,22,0.4) 80%, rgba(249,115,22,0.0) 100%)',
              }}
              aria-hidden
            />
            {/* Arrow dots on the connector */}
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="hidden md:block absolute top-[46px] h-2.5 w-2.5 rounded-full border border-violet-400/40 bg-violet-500/20"
                style={{ left: `${25 * (idx + 1) - 1}%` }}
                aria-hidden
              />
            ))}

            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="animate-fade-up card-glow relative flex flex-col items-center text-center rounded-2xl border border-white/8 p-6 backdrop-blur-sm"
                style={{
                  background:
                    'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                  animationDelay: `${200 + i * 120}ms`,
                }}
              >
                {/* Step number pill */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full border border-white/10 bg-[#06030f] text-[10px] font-bold text-white/30 tracking-widest">
                  {step.step}
                </div>

                {/* Icon */}
                <div
                  className={`relative z-10 h-14 w-14 rounded-2xl bg-gradient-to-br ${step.accent} flex items-center justify-center mb-5 mt-2 shadow-lg`}
                  style={{ boxShadow: `0 8px 24px ${step.glow}` }}
                >
                  <step.icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="font-bold text-sm text-white/85 mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs text-white/38 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║  FEATURES                       ║
          ╚═════════════════════════════════╝ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />

        <div className="container mx-auto max-w-5xl">
          {/* Heading */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-[11px] tracking-widest uppercase font-medium mb-4">
              Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white/90 tracking-tight">
              Built Different
            </h2>
            <p className="mt-3 text-sm text-white/35 max-w-sm mx-auto">
              Every component designed for autonomous, trustless agent coordination.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((feat, i) => (
              <div
                key={feat.title}
                className={`animate-fade-up card-glow group relative rounded-2xl border ${feat.border} p-6 overflow-hidden`}
                style={{
                  background: `linear-gradient(140deg, ${
                    i % 2 === 0
                      ? 'rgba(139,92,246,0.06)'
                      : 'rgba(249,115,22,0.04)'
                  } 0%, rgba(255,255,255,0.02) 100%)`,
                  animationDelay: `${300 + i * 100}ms`,
                }}
              >
                {/* Subtle corner gradient on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{
                    background:
                      'radial-gradient(ellipse at top left, rgba(139,92,246,0.08) 0%, transparent 60%)',
                  }}
                />

                <div className="relative z-10 flex items-start gap-4">
                  {/* Icon with gradient background */}
                  <div
                    className={`flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br ${feat.iconGradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
                    style={{
                      boxShadow: '0 4px 16px rgba(139,92,246,0.25)',
                    }}
                  >
                    <feat.icon className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-white/85 mb-1.5 leading-snug">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║  TECH STACK                     ║
          ╚═════════════════════════════════╝ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        <div className="container mx-auto max-w-4xl">
          {/* Heading */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-[11px] tracking-widest uppercase font-medium mb-4">
              Infrastructure
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white/90 tracking-tight">
              The Stack
            </h2>
            <p className="mt-3 text-sm text-white/35 max-w-sm mx-auto">
              Production-grade tools powering every autonomous transaction.
            </p>
          </div>

          {/* Tech badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {TECH_STACK.map((tech, i) => (
              <div
                key={tech.name}
                className={`tech-badge animate-fade-up flex flex-col items-center gap-2 p-4 rounded-2xl border ${tech.color} backdrop-blur-sm text-center`}
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <span className="text-2xl leading-none">{tech.icon}</span>
                <div>
                  <div className="text-xs font-bold tracking-wide">{tech.name}</div>
                  <div className="text-[10px] opacity-55 mt-0.5 leading-tight">{tech.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Contract address callout */}
          <div
            className="animate-fade-up delay-700 mt-10 rounded-2xl border border-white/8 p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(249,115,22,0.03) 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse-dot" />
              <div>
                <div className="text-xs text-white/50 mb-0.5">ForbaEscrow · Base Sepolia</div>
                <div
                  className="text-xs font-mono text-violet-300/80 tracking-tight truncate max-w-[280px]"
                >
                  0x…deployed · Verified on BaseScan
                </div>
              </div>
            </div>
            <a
              href="https://sepolia.basescan.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-violet-400 transition-colors"
            >
              View on BaseScan
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║  CTA BAND                       ║
          ╚═════════════════════════════════╝ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />

        <div className="container mx-auto max-w-3xl text-center">
          {/* Background glow for CTA */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 65%)',
            }}
          />

          <div className="relative z-10">
            <h2
              className="font-black tracking-tighter text-white/90 mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              Ready to{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #a78bfa, #fb923c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                orchestrate
              </span>
              ?
            </h2>
            <p className="text-sm text-white/35 mb-10 max-w-md mx-auto leading-relaxed">
              Submit your first task and watch autonomous agents coordinate,
              negotiate, and deliver — all on-chain.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="font-bold px-10 py-3 rounded-xl text-white transition-all duration-300 hover:scale-[1.04]"
                  style={{
                    background:
                      'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #ea580c 100%)',
                    boxShadow: '0 4px 30px rgba(139,92,246,0.4)',
                  }}
                >
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/agents">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold px-8 py-3 rounded-xl border-white/12 text-white/70 bg-white/4 hover:bg-white/8 hover:border-violet-400/30 hover:text-white transition-all duration-300"
                >
                  Browse Agents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║  FOOTER                         ║
          ╚═════════════════════════════════╝ */}
      <footer className="relative pt-12 pb-10 px-4 border-t border-white/6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, #7c3aed, #ea580c)',
                  }}
                >
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-black text-white/85 tracking-tight">Forba</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">
                Autonomous AI agent marketplace with on-chain payments. Built for the
                Synthesis Hackathon 2026.
              </p>
            </div>

            {/* Links */}
            <div>
              <div className="text-[10px] text-white/25 tracking-widest uppercase font-semibold mb-4">
                Navigate
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Dashboard', href: '/dashboard' },
                  { label: 'Agents', href: '/agents' },
                  { label: 'Task Feed', href: '/dashboard' },
                ].map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-xs text-white/35 hover:text-violet-400 transition-colors w-fit"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Tech + socials */}
            <div>
              <div className="text-[10px] text-white/25 tracking-widest uppercase font-semibold mb-4">
                Built With
              </div>
              <div className="flex flex-col gap-2 mb-6">
                {['Base (Ethereum L2)', 'Locus USDC Escrow', 'Uniswap V3', 'Anthropic Claude'].map(
                  (t) => (
                    <div key={t} className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-violet-500/50" />
                      <span className="text-xs text-white/30">{t}</span>
                    </div>
                  )
                )}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg border border-white/8 bg-white/4 flex items-center justify-center text-white/30 hover:text-white/70 hover:border-white/20 hover:bg-white/8 transition-all duration-200"
                  aria-label="GitHub"
                >
                  <Github className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg border border-white/8 bg-white/4 flex items-center justify-center text-white/30 hover:text-white/70 hover:border-white/20 hover:bg-white/8 transition-all duration-200"
                  aria-label="Twitter"
                >
                  <Twitter className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://sepolia.basescan.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg border border-white/8 bg-white/4 flex items-center justify-center text-white/30 hover:text-white/70 hover:border-white/20 hover:bg-white/8 transition-all duration-200"
                  aria-label="BaseScan"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-white/20">
              Forba (Forge Bazaar) · The Synthesis Hackathon 2026
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/60 animate-pulse-dot" />
              <span className="text-[11px] text-white/20">
                Deployed on Base Sepolia
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
