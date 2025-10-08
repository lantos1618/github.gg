# Test PR Review Feature

This PR tests the automated AI-powered code review system.

## Features Added
- Automated PR analysis using Gemini AI
- Code quality scoring
- Security vulnerability detection
- Performance optimization suggestions
- Maintainability assessment

## Test Checklist
- [ ] PR opened triggers webhook
- [ ] AI analysis completes
- [ ] Comment posted to PR
- [ ] Comment includes all sections (code quality, security, performance, maintainability)
- [ ] Overall score displayed
- [ ] Recommendations provided

## Example Code for Testing

\`\`\`typescript
// This is a test function to trigger analysis
export function calculateSum(a: number, b: number): number {
  return a + b;
}

// Potential issue: no input validation
export function divide(a: number, b: number): number {
  return a / b; // Could throw error if b = 0
}
\`\`\`

## Expected Behavior
The AI should identify:
1. Missing input validation in divide function
2. Potential division by zero error
3. Lack of error handling
4. Need for JSDoc documentation
