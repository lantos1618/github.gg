# 🚀 Payment Integration Checklist

## ✅ Automated Tests

Run these commands to verify your payment integration:

```bash
# Quick smoke test (Node.js - no dependencies)
npm run test:payment:node

# Full integration tests (requires bun)
npm run test:payment:full

# All tests
npm run test:all
```

## 🔧 Manual Testing Checklist

### 1. **Stripe Checkout Flow**
- [ ] **BYOK Plan**: Click "Get Started" → Stripe checkout opens → Complete payment → Redirected to settings with success
- [ ] **Pro Plan**: Click "Get Started" → Stripe checkout opens → Complete payment → Redirected to settings with success
- [ ] **Cancel Flow**: Start checkout → Cancel → Redirected to pricing with canceled message

### 2. **Webhook Processing**
- [ ] **Stripe CLI**: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] **Complete Payment**: Check webhook logs for `checkout.session.completed`
- [ ] **Database Update**: Verify subscription saved in `userSubscriptions` table
- [ ] **Status Check**: User shows as upgraded in UI after payment

### 3. **Plan Gating & Features**
- [ ] **Free Users**: See upgrade prompts, blocked from premium features
- [ ] **BYOK Users**: Can add API key, access private repos, see usage stats
- [ ] **Pro Users**: All BYOK features + managed AI credits
- [ ] **Plan Changes**: Upgrade/downgrade/cancel reflected in UI

### 4. **Billing Portal**
- [ ] **Manage Subscription**: Opens Stripe billing portal
- [ ] **Cancel Subscription**: User can cancel, status updates in DB and UI
- [ ] **Upgrade/Downgrade**: Plan changes work correctly
- [ ] **Payment Methods**: Can update payment methods

### 5. **API Key Management**
- [ ] **Save Key**: BYOK users can add Gemini API key
- [ ] **Encryption**: Key is encrypted in database
- [ ] **Validation**: Invalid keys are rejected
- [ ] **Usage Tracking**: Token usage is tracked and displayed

### 6. **Edge Cases**
- [ ] **Expired Subscriptions**: Users downgraded when subscription expires
- [ ] **Failed Payments**: Users notified, features restricted if needed
- [ ] **Webhook Failures**: System handles webhook errors gracefully
- [ ] **Network Issues**: Checkout/billing portal handles connection problems

## 🛠️ Environment Variables

Verify these are set in production:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BYOK_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## 📊 Database Schema

Verify these tables exist and have correct structure:

```sql
-- User subscriptions
userSubscriptions (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd)

-- API keys (encrypted)
userApiKeys (id, userId, encryptedGeminiApiKey)

-- Token usage tracking
tokenUsage (id, userId, totalTokens, isByok, createdAt)
```

## 🔒 Security Checklist

- [ ] **API Keys**: Encrypted at rest using proper encryption
- [ ] **Webhook Signatures**: Verified using Stripe webhook secret
- [ ] **Route Protection**: Premium features gated by subscription status
- [ ] **Input Validation**: All user inputs validated with Zod schemas
- [ ] **Error Handling**: No sensitive data leaked in error messages

## 🎯 Production Readiness

- [ ] **Stripe Live Keys**: Using live keys, not test keys
- [ ] **Webhook Endpoint**: Publicly accessible webhook URL
- [ ] **SSL/TLS**: HTTPS enabled for all payment flows
- [ ] **Error Monitoring**: Stripe errors logged and monitored
- [ ] **Backup Strategy**: Database backups configured
- [ ] **Rate Limiting**: API endpoints protected from abuse

## 🚨 Common Issues & Fixes

### Webhook Not Firing
```bash
# Check webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/stripe

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Check Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Subscription Not Saving
```bash
# Check database connection
npm run db:studio

# Verify webhook handler
tail -f logs/webhook.log

# Check subscription table
SELECT * FROM user_subscriptions WHERE user_id = 'your-user-id';
```

### Checkout Not Working
```bash
# Verify price IDs
echo $STRIPE_BYOK_PRICE_ID
echo $STRIPE_PRO_PRICE_ID

# Check Stripe dashboard
# https://dashboard.stripe.com/products

# Test with Stripe CLI
stripe checkout sessions create --price price_xxx
```

## 📈 Monitoring & Analytics

- [ ] **Stripe Dashboard**: Monitor payments, subscriptions, churn
- [ ] **Error Tracking**: Set up error monitoring (Sentry, etc.)
- [ ] **Usage Analytics**: Track feature usage by plan
- [ ] **Revenue Metrics**: Monitor MRR, ARR, conversion rates

## 🎉 Success Criteria

Your payment integration is ready when:

1. ✅ All automated tests pass
2. ✅ Manual checkout flow works end-to-end
3. ✅ Webhooks process correctly
4. ✅ Plan gating works as expected
5. ✅ Billing portal functions properly
6. ✅ Edge cases are handled
7. ✅ Production environment is configured
8. ✅ Security measures are in place

---

**Ready to deploy?** Run `npm run test:payment:node` one final time, then push to production! 🚀 