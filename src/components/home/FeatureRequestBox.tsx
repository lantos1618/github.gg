'use client';

import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, feature }),
      });

      if (!response.ok) {
        throw new Error('Failed to send feature request');
      }

      toast.success('Feature request sent successfully!');
      setEmail('');
      setFeature('');
    } catch (error) {
      toast.error('Failed to send feature request. Please try again.');
      console.error('Error sending feature request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="relative mt-20"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <motion.div
              className="inline-block mb-4"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Send className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              Have a Feature Request?
            </h3>
            <p className="text-gray-600">
              We'd love to hear your ideas! Share your thoughts and help us build something amazing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="feature" className="block text-sm font-medium text-gray-700 mb-1">
                Feature Request
              </label>
              <textarea
                id="feature"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                placeholder="Tell us about the feature you'd like to see..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Feature Request
                </>
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
