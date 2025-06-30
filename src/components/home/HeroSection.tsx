'use client';

import { ScrollingRepos } from '@/components/ScrollingRepos';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Crown, Key } from 'lucide-react';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

export function HeroSection() {
  const { data: currentPlan } = trpc.user.getCurrentPlan.useQuery();
  
  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleUpgrade = (plan: 'byok' | 'pro') => {
    createCheckout.mutate({ plan });
  };

  return (
    <div className="relative flex items-center justify-center min-h-[80vh] p-8">
      <ScrollingRepos className="translate-y-40" />
      <motion.div
        className="relative z-10 max-w-3xl mx-auto text-center bg-gray-50/30 backdrop-blur-xl p-12 rounded-2xl shadow-lg border border-gray-200/50"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >
        <motion.h1
          className="text-6xl font-bold text-black mb-6 tracking-tight"
          variants={fadeUpVariants}
          transition={{ duration: 0.5 }}
        >
          github.gg
        </motion.h1>

        <motion.p
          className="text-2xl font-medium text-gray-900"
          variants={fadeUpVariants}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          The missing intelligence layer for GitHub.
        </motion.p>
        <motion.p
          className="text-lg text-gray-700 mt-4 max-w-xl mx-auto"
          variants={fadeUpVariants}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Analyze, visualize, and understand your repositories like never
          before.
        </motion.p>

        {/* Upgrade Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
          variants={fadeUpVariants}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {currentPlan?.plan !== 'byok' && (
            <Button 
              onClick={() => handleUpgrade('byok')}
              disabled={createCheckout.isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Key className="h-4 w-4" />
              {createCheckout.isPending ? 'Loading...' : 'Developer Plan - $6.90/mo'}
            </Button>
          )}
          
          {currentPlan?.plan !== 'pro' && (
            <Button 
              onClick={() => handleUpgrade('pro')}
              disabled={createCheckout.isPending}
              variant="outline"
              className="flex items-center gap-2 border-2 hover:bg-gray-50"
            >
              <Crown className="h-4 w-4" />
              {createCheckout.isPending ? 'Loading...' : 'Pro Plan - $20/mo'}
            </Button>
          )}
          
          {currentPlan?.plan && (
            <Button 
              variant="ghost"
              className="text-sm text-muted-foreground"
              onClick={() => window.location.href = '/settings'}
            >
              Manage Subscription
            </Button>
          )}
        </motion.div>

        {/* Plan Status */}
        {currentPlan?.plan && currentPlan.plan !== 'free' && (
          <motion.div
            className="mt-4 text-sm text-green-600"
            variants={fadeUpVariants}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            ✓ You&apos;re on the {currentPlan.plan} plan
          </motion.div>
        )}
      </motion.div>
    </div>
  );
} 