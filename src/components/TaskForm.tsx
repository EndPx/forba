'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Send, Loader2, Lightbulb, Command, CornerDownLeft } from 'lucide-react';

const EXAMPLE_TASKS = [
  'Create a landing page for an AI-powered productivity tool with research on competitors',
  'Research the top 5 DeFi protocols and write a comparison report with pros/cons',
  'Write marketing copy for a new crypto wallet app — tagline, hero text, 3 feature blurbs',
  'Build a pricing page with 3 tiers (Starter, Pro, Enterprise) for a SaaS analytics tool',
];

interface TaskFormProps {
  onSubmit: (description: string) => Promise<void>;
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!description.trim() || loading) return;
    setLoading(true);
    try {
      await onSubmit(description.trim());
      setDescription('');
    } catch (error) {
      console.error('Failed to submit task:', error);
    } finally {
      setLoading(false);
    }
  }, [description, loading, onSubmit]);

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && focused) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused, handleSubmit]);

  const charPct = Math.min((description.length / 2000) * 100, 100);

  return (
    <Card
      className={`relative overflow-hidden border-2 transition-all duration-300 ${
        focused
          ? 'border-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_0_24px_rgba(139,92,246,0.12)]'
          : 'border-dashed border-violet-200/60'
      } bg-gradient-to-br from-violet-50/40 via-white to-orange-50/30`}
    >
      {/* Ambient glow strip */}
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent transition-opacity duration-300 ${
          focused ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          Dispatch a Task
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Describe your goal in plain language. Forba decomposes it, recruits specialist agents, and pays them autonomously via on-chain escrow.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="relative">
          <Textarea
            placeholder="e.g., Research the top crypto wallets of 2024, compare their UX, then write a 500-word blog post highlighting key differentiators..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`min-h-[120px] resize-none text-sm leading-relaxed pr-4 transition-all duration-200 bg-white/70 border-violet-100 focus:border-violet-300 focus-visible:ring-violet-200 placeholder:text-muted-foreground/50`}
            maxLength={2000}
            disabled={loading}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-md">
              <div className="flex items-center gap-2 text-violet-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Dispatching to agents...</span>
              </div>
            </div>
          )}
        </div>

        {/* Character bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-violet-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charPct > 80 ? 'bg-orange-400' : 'bg-gradient-to-r from-violet-400 to-violet-500'
              }`}
              style={{ width: `${charPct}%` }}
            />
          </div>
          <span className={`text-[10px] font-mono tabular-nums ${charPct > 80 ? 'text-orange-500' : 'text-muted-foreground'}`}>
            {description.length}/2000
          </span>
        </div>

        {/* Example chips */}
        <div>
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center gap-1.5 text-[11px] text-violet-500 hover:text-violet-700 transition-colors mb-2"
          >
            <Lightbulb className="h-3 w-3" />
            {showExamples ? 'Hide examples' : 'Show example tasks'}
          </button>
          {showExamples && (
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_TASKS.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setDescription(example);
                    setShowExamples(false);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-all duration-150 text-left"
                >
                  {example.substring(0, 52)}…
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 select-none">
            <Command className="h-3 w-3" />
            <span>+</span>
            <CornerDownLeft className="h-3 w-3" />
            <span className="ml-0.5">to submit</span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || loading}
            className="bg-gradient-to-r from-violet-600 to-orange-500 hover:from-violet-700 hover:to-orange-600 text-white shadow-sm hover:shadow-violet-200/60 hover:shadow-md transition-all duration-200 h-9 px-5 text-sm font-medium disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Dispatching…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-2" />
                Dispatch Task
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
