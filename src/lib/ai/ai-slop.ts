import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Schema for AI slop detection
export const aiSlopSchema = z.object({
  metrics: z.array(z.object({
    metric: z.string(),
    score: z.number().min(0).max(100),
    reason: z.string(),
  })),
  markdown: z.string(),
  overallScore: z.number().min(0).max(100),
  aiGeneratedPercentage: z.number().min(0).max(100),
  detectedPatterns: z.array(z.string()),
});

export type AISlopData = z.infer<typeof aiSlopSchema>;

export interface AISlopAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
}

export interface AISlopAnalysisResult {
  analysis: AISlopData;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Detect AI-generated code and AI slop using Gemini AI
 */
export async function generateAISlopAnalysis({
  files,
  repoName,
}: AISlopAnalysisParams): Promise<AISlopAnalysisResult> {
  try {
    const prompt = `You are an expert code quality analyst specializing in detecting "code slop" - low-quality code patterns that are common in AI-generated codebases but also found in poorly written human code.

REPOSITORY: ${repoName}
FILES: ${files.length} files

TASK:
Analyze this codebase for CODE QUALITY ISSUES, focusing on patterns that reduce maintainability and add no real value.

🚩 PRIMARY SLOP PATTERNS TO DETECT:

**1. REPETITIVE CODE**
- Copy-pasted code blocks with minor variations
- Repeated logic that should be abstracted into reusable functions
- Duplicated utility functions across different files
- Multiple components doing the same thing slightly differently

**2. PERFORMATIVE CODE (Looks Smart, Adds No Value)**
- Over-engineered abstractions that don't solve actual problems
- Wrapper functions that just call another function with no added logic
- Complex type gymnastics that don't improve type safety
- Patterns borrowed from enterprise codebases that don't fit the project scale
- Unnecessary design patterns (factories, builders, strategies) for simple tasks

**3. UNNECESSARY COMPLEXITY**
- Overly nested ternaries or conditionals
- Functions with 10+ parameters when an object would do
- Excessive use of advanced language features where simple code would work
- State management overkill for simple UI state
- Over-defensive programming (try-catch everywhere, null checks for impossible cases)

**4. VALUELESS BOILERPLATE**
- Error handling that just logs and returns null (no actual recovery)
- Comments that restate what the code does ("// Set x to 5" above "x = 5")
- Generic variable names (data, result, temp, handler, processX, handleY)
- Wrapper components that just pass props through unchanged
- Helper functions that are more complex than using the language directly

**5. BAD ABSTRACTIONS**
- Generic "utility" functions that hide simple operations
- Premature abstractions (DRY taken too far)
- Leaky abstractions that don't actually hide complexity
- Inconsistent abstraction levels in the same function

**6. USELESS TESTS**
- Tests that pass but validate nothing meaningful (e.g., testing 1+1=2)
- Tests that only check if mocks work, not actual business logic
- Tests with no assertions or only trivial assertions
- Tests that duplicate what the type system already guarantees
- Test files with 100% coverage but 0% confidence in the code

**7. INCONSISTENT FILE STRUCTURE**
- Files placed outside the established directory structure (e.g., ./page when it should be in src/components/page)
- Mixing concerns - components in utils/, utils in components/
- Duplicate files in multiple locations with slight variations
- Breaking the project's organizational patterns
- Related files scattered across unrelated directories

FOCUS ON:
1. **Code Quality Issues** - Identify specific problems that reduce code quality
2. **Repetition & Duplication** - Find copied code that should be unified
3. **Real Examples** - Pull ACTUAL code snippets from the provided files (include file paths)
4. **Specific Fixes** - Show exact before/after for REAL code from this codebase, not generic examples

IMPORTANT: In your "How to Fix" section, use REAL CODE from the files provided. Include:
- File path where the issue was found
- The actual problematic code (before)
- The improved version (after)
- Why the fix matters

METRICS TO EVALUATE (0-100 scale, where 100 is best):
- Simplicity (avoiding over-engineering and unnecessary complexity)
- DRY Principle (proper abstraction without duplication)
- Clarity (code intent is obvious without comments)
- Maintainability (ease of understanding and modifying)
- Value-to-Complexity Ratio (code complexity justified by value delivered)

Your response must be a valid JSON object with this exact structure:
{
  "metrics": [
    {
      "metric": "Simplicity",
      "score": 65,
      "reason": "Multiple instances of over-engineered solutions for simple problems"
    }
  ],
  "markdown": "# 🚩 Code Quality Report

  ## 🎯 Overall Quality Score: 65/100
  ## ⚠️ Issues Found: Low-to-Moderate Code Slop

  ### 🔍 Key Findings
  - Significant code repetition that should be abstracted
  - Several performative abstractions that add complexity without value
  - Unnecessary defensive programming in non-critical paths

  ### 🚩 Code Slop Patterns Detected
  - **Repetitive Code**: Similar error handling logic duplicated across 15 files
  - **Performative Abstractions**: Wrapper functions that just forward arguments
  - **Valueless Boilerplate**: Generic try-catch blocks that only log errors
  - **Bad Naming**: Generic names like 'handleData', 'processResult' obscure intent
  - **Useless Tests**: Test files that achieve 80% coverage but only verify mocks work
  - **File Structure Chaos**: Components leaked outside src/ directory, breaking project organization

  ### 💼 Impact on Project
  - **Maintainability**: Medium risk - duplicated code makes updates error-prone
  - **Readability**: Code intent is obscured by unnecessary abstraction layers
  - **Developer Experience**: New developers will struggle to understand what code actually does vs. what it appears to do

  ### ✅ What Works Well
  - Core business logic is well-structured
  - Type safety is generally good
  - Module boundaries are clear

  ### 🛠️ How to Fix Code Slop

  #### 1. Eliminate Repetition in src/lib/api/handlers.ts
  **File:** src/lib/api/handlers.ts:45-52
  **Issue:** Same error handling pattern repeated in 8 different functions

  **Before:**
  \`\`\`typescript
  async function fetchUserData(id: string) {
    try {
      const result = await api.users.get(id);
      return result;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
  \`\`\`

  **After:** Extract to shared utility
  \`\`\`typescript
  // lib/utils/api.ts
  export async function withApiErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      logApiError(context, error);
      return null;
    }
  }

  // handlers.ts
  async function fetchUserData(id: string) {
    return withApiErrorHandling(
      () => api.users.get(id),
      'fetchUserData'
    );
  }
  \`\`\`
  **Why:** Reduces 40+ lines of duplicate code to a single reusable function. Easier to update error handling in one place.

  #### 2. Remove Useless Test in tests/utils.test.ts
  **File:** tests/utils.test.ts:12-16
  **Issue:** Test provides no value - only verifies mock behavior

  **Before:**
  \`\`\`typescript
  it('should call helper function', () => {
    const mockHelper = jest.fn();
    processData(mockHelper);
    expect(mockHelper).toHaveBeenCalled();
  });
  \`\`\`

  **After:** Test actual business logic
  \`\`\`typescript
  it('should calculate correct total when processing order', () => {
    const order = { items: [{ price: 10, qty: 2 }, { price: 5, qty: 1 }] };
    const result = processOrder(order);
    expect(result.total).toBe(25); // 10*2 + 5*1
    expect(result.itemCount).toBe(3);
  });
  \`\`\`
  **Why:** Original test gives false confidence. New test validates real business logic.

  #### 3. Fix File Structure Violation
  **Issue:** Component placed outside src/ directory

  **Before:**
  \`\`\`
  ./UserCard.tsx          ← Wrong! Outside src/
  src/components/
  \`\`\`

  **After:**
  \`\`\`
  src/components/UserCard.tsx  ← Correct location
  \`\`\`
  **Why:** Maintains consistent project structure, makes code easier to find.

  ### 📝 Recommendations
  1. **Consolidate Duplicated Logic**: Extract repeated patterns into shared utilities
  2. **Question Every Abstraction**: Does this wrapper/helper actually add value?
  3. **Use Domain Language**: Replace generic names with terms from your business domain
  4. **Fix File Structure**: Move misplaced files back into proper directories (all components in src/components/)
  5. **Rewrite Useless Tests**: Replace mock-only tests with real business logic validation
  6. **Simplify Error Handling**: Only add try-catch where you actually handle errors
  7. **Remove Obvious Comments**: Code should be self-documenting; comments should explain 'why', not 'what'",
  "overallScore": 65,
  "aiGeneratedPercentage": 45,
  "detectedPatterns": [
    "Duplicated error handling logic across multiple files",
    "Wrapper functions that add no value",
    "Generic naming (handleX, processY, dataObject)",
    "Performative abstractions that obscure simple operations",
    "Test files with high coverage but no real validation",
    "Files placed outside src/ directory breaking project structure"
  ]
}

---

ANALYZE THESE FILES:
${files.map(file => `\n--- ${file.path} ---\n${file.content}`).join('\n')}`;

    const { object, usage } = await generateObject({
      model: google('models/gemini-2.5-pro'),
      schema: aiSlopSchema,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    return {
      analysis: object,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
      },
    };
  } catch (error) {
    console.error('Gemini API error in AI slop detection:', error);
    throw error;
  }
}
