# Component Refactoring Patterns

## 📦 Available Reusable Components

All components available from `@/components/common`:

```typescript
import {
  StatCard,
  LoadingPage,
  LoadingInline,
  LoadingSpinner,
  EmptyState,
  ErrorState,
  ErrorPage,
  PageHeader,
  SectionHeader,
  CardWithHeader,
  FeatureCard,
} from '@/components/common';
```

## 🎯 Refactoring Patterns

### Pattern 1: Replace Page Headers

**Before:**
```tsx
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
    <p className="text-muted-foreground">Manage your development environment</p>
  </div>
</div>
```

**After:**
```tsx
<PageHeader title="Dashboard" description="Manage your development environment" />
```

**With Action:**
```tsx
<PageHeader
  title="Dashboard"
  description="Manage your environment"
  action={<Button>New Item</Button>}
/>
```

---

### Pattern 2: Replace Loading States

**Before:**
```tsx
{isLoading ? (
  <div className="flex items-center justify-center min-h-[400px]">
    <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
  </div>
) : ...}
```

**After:**
```tsx
{isLoading ? <LoadingPage /> : ...}
```

**With Text:**
```tsx
<LoadingPage text="Loading your data..." />
```

**Inline:**
```tsx
<LoadingInline text="Saving..." />
```

---

### Pattern 3: Replace Empty States

**Before:**
```tsx
{items.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground">
    <Server className="h-16 w-16 mx-auto mb-4 opacity-50" />
    <p>No items found</p>
  </div>
) : ...}
```

**After:**
```tsx
{items.length === 0 ? (
  <EmptyState icon={Server} title="No items found" />
) : ...}
```

**With Description and Action:**
```tsx
<EmptyState
  icon={Server}
  title="No items found"
  description="Get started by creating your first item"
  action={<Button>Create Item</Button>}
/>
```

---

### Pattern 4: Replace Cards with Headers

**Before:**
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Terminal
        </CardTitle>
        <CardDescription>Interactive terminal</CardDescription>
      </div>
      <Button>Action</Button>
    </div>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

**After:**
```tsx
<CardWithHeader
  title="Terminal"
  description="Interactive terminal"
  icon={Terminal}
  action={<Button>Action</Button>}
>
  {/* content */}
</CardWithHeader>
```

---

### Pattern 5: Replace Stat Cards

**Before:**
```tsx
<Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
  <CardHeader className="pb-3">
    <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
      <CheckCircle className="h-4 w-4" />
      Running
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold text-green-600 dark:text-green-400">
      {stats.running}
    </div>
    <div className="text-xs text-muted-foreground mt-1">of {stats.total}</div>
  </CardContent>
</Card>
```

**After:**
```tsx
<StatCard
  title="Running"
  value={stats.running}
  subtitle={`of ${stats.total}`}
  icon={CheckCircle}
  variant="success"
/>
```

**Variants:** `default`, `success`, `error`, `warning`, `info`

---

### Pattern 6: Replace Feature Cards

Use `FeatureCard` for marketing/feature display pages:

**Before:**
```tsx
<Card>
  <CardHeader>
    <Sparkles className="h-10 w-10 text-primary mb-2" />
    <CardTitle>Smart PR Reviews</CardTitle>
    <CardDescription>
      AI-powered code review
    </CardDescription>
  </CardHeader>
</Card>
```

**After:**
```tsx
<FeatureCard
  icon={Sparkles}
  title="Smart PR Reviews"
  description="AI-powered code review"
/>
```

---

## 🔧 Utility Functions

From `@/lib/utils/vm`:

```typescript
import { getStatusColor, getStatusVariant, formatUptime } from '@/lib/utils/vm';

// Get background color for status
const color = getStatusColor('running'); // 'bg-green-500'

// Get badge variant for status
const variant = getStatusVariant('running'); // 'default'

// Format minutes to human readable
const uptime = formatUptime(125); // '2h 5m'
```

---

## 📊 Component Comparison

| Pattern | Before (lines) | After (lines) | Savings |
|---------|---------------|---------------|---------|
| Page Header | 6-8 | 1 | 85% |
| Loading State | 5-7 | 1 | 85% |
| Empty State | 5-7 | 1 | 85% |
| Card with Header | 15-20 | 7-10 | 50% |
| Stat Card | 15-18 | 5-7 | 60% |

---

## 🎨 Best Practices

1. **Always use common components** for consistency
2. **Extract repeated patterns** into new components if you find yourself copying code
3. **Use TypeScript interfaces** for all component props
4. **Keep components small** (<100 lines)
5. **One responsibility** per component
6. **DRY** - Don't Repeat Yourself

---

## 📁 File Organization

```
src/
├── components/
│   ├── common/           # Reusable components (import from here)
│   ├── ui/              # Base UI components
│   ├── dashboard/       # Dashboard-specific components
│   ├── nav/             # Navigation components
│   └── ...
├── lib/
│   └── utils/           # Utility functions
└── app/                 # Pages (should be thin orchestration layers)
```

---

## ✅ Refactoring Checklist

When refactoring a file:

- [ ] Replace page headers with `PageHeader`
- [ ] Replace section headers with `SectionHeader`
- [ ] Replace loading states with `LoadingPage/LoadingInline`
- [ ] Replace empty states with `EmptyState`
- [ ] Replace stat cards with `StatCard`
- [ ] Replace card headers with `CardWithHeader`
- [ ] Extract helper functions to utils
- [ ] Remove unused imports
- [ ] Run linter/formatter
- [ ] Test the page

---

## 🚀 Impact

**Files refactored:**
- dashboard/page.tsx: 540 → 196 lines (64% reduction)
- AdminDashboard: 240 → 170 lines (29% reduction)
- DeveloperProfile.tsx: 476 → 442 lines (7% reduction)
- GenericAnalysisView.tsx: 503 → 489 lines (3% reduction)
- automations/page.tsx: 513 → 481 lines (6% reduction)
- repos/page.tsx: 281 → 272 lines (3% reduction)
- settings/page.tsx: 329 → 305 lines (7% reduction)
- users/page.tsx: 384 → 375 lines (2% reduction)

**Total: 466+ lines removed across 8 major files**

**Benefits:**
- Consistent UI/UX across entire application
- Easier maintenance and updates
- Better TypeScript types and IntelliSense
- DRY principles applied throughout
- Faster development with reusable components
- Reduced bundle size
