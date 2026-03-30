'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function FeatureRequestBox() {
  const [email, setEmail] = useState('');
  const [feature, setFeature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !feature) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feature-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, feature }),
      });
      if (!response.ok) throw new Error('Failed to send');
      toast.success('Feature request sent!');
      setEmail('');
      setFeature('');
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-16">
      <div className="w-[90%] max-w-[600px] mx-auto">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          Feature Request
        </div>
        <h3 className="text-[22px] font-semibold text-[#111] mb-2">
          Have an idea?
        </h3>
        <p className="text-[14px] text-[#666] leading-[1.6] mb-6">
          Share your thoughts or <a href="https://github.com/lantos1618/github.gg" target="_blank" rel="noopener noreferrer" className="text-[#111] hover:text-[#666] transition-colors font-medium">contribute directly on GitHub</a>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 border border-[#ddd] rounded text-[14px] text-[#333] placeholder:text-[#ccc] focus:border-[#111] focus:outline-none transition-colors"
            disabled={isSubmitting}
          />
          <textarea
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            placeholder="Tell us about the feature you'd like to see..."
            rows={3}
            className="w-full px-4 py-2.5 border border-[#ddd] rounded text-[14px] text-[#333] placeholder:text-[#ccc] focus:border-[#111] focus:outline-none transition-colors resize-none"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#111] text-white text-[14px] font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Feature Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
