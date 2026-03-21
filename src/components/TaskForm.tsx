'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Send, Loader2 } from 'lucide-react';

const EXAMPLE_TASKS = [
  'Create a landing page for an AI-powered productivity tool',
  'Research the top 5 DeFi protocols and write a comparison report',
  'Write marketing copy for a new crypto wallet app launch',
  'Build a pricing page with 3 tiers for a SaaS product',
];

interface TaskFormProps {
  onSubmit: (description: string) => Promise<void>;
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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
  };

  return (
    <Card className="border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50/50 to-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          New Task
        </CardTitle>
        <CardDescription>
          Describe what you need. Forba will decompose it, hire specialist agents, and deliver results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., Create a landing page for an AI-powered note-taking app with research on competitors and marketing copy..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px] resize-none"
          maxLength={2000}
        />

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TASKS.map((example) => (
            <button
              key={example}
              onClick={() => setDescription(example)}
              className="text-xs px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
            >
              {example.substring(0, 40)}...
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {description.length}/2000 characters
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || loading}
            className="bg-gradient-to-r from-violet-600 to-orange-500 hover:from-violet-700 hover:to-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Task
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
