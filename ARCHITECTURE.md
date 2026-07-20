# Zero Purchase Control - Architecture Guide

## System Overview

The Zero Purchase Control system is built on a **three-tier clean architecture**:

```
┌─────────────────────────────────────────┐
│   PRESENTATION LAYER                    │
│   React Components & UI State           │
├─────────────────────────────────────────┤
│   BUSINESS LOGIC LAYER                  │
│   Services & Hooks                      │
├─────────────────────────────────────────┤
│   DATA LAYER                            │
│   Calculations, Validation, Formatting  │
└─────────────────────────────────────────┘
```

## Directory Structure

```
lib/meta-v2/
├── validation/
│   ├── rowValidator.ts          # Input validation
│   └── __tests__/
│       └── rowValidator.test.ts
├── services/
│   ├── zeroPurchaseService.ts   # Business logic
│   └── __tests__/
│       └── zeroPurchaseService.test.ts
├── performance/
│   └── index.ts                 # Performance utilities
├── engines/
│   └── zeroPurchaseEngine.ts    # Pure calculations
├── formatters.ts                # Display formatting
├── calculationCore.ts           # Math utilities
└── schema.ts                    # Type definitions

components/meta-v2/
├── dashboard/
│   ├── ZeroPurchaseDashboard.tsx           # Standard version
│   └── ZeroPurchaseDashboardOptimized.tsx  # With pagination
├── hooks/
│   ├── useZeroPurchaseData.ts     # Data processing
│   ├── useCopyToClipboard.ts      # Clipboard state
│   ├── useExpandedRows.ts         # Row expansion state
│   ├── usePagination.ts           # Pagination state
│   └── __tests__/
│       └── useZeroPurchaseData.test.ts
└── shared/
    ├── MetricCard.tsx            # KPI display
    ├── SectionCard.tsx           # Section container
    ├── StatusPill.tsx            # Status badge
    ├── ErrorBoundary.tsx         # Error display
    └── EmptyState.tsx            # Empty state
```

## Data Flow

### Standard Flow (Interactive)

```
User Interaction (click threshold button)
            ↓
React Hook (useZeroPurchaseData)
            ↓
Business Service (ZeroPurchaseService.process)
            ↓
Input Validation (RowValidator.validateRows)
            ↓
Calculation Engine (buildMetaV2ZeroPurchase)
            ↓
Formatted Output
            ↓
Component Re-render
            ↓
User Sees Updated Data
```

### Error Handling Flow

```
Invalid Data Input
            ↓
Validator throws Error
            ↓
Hook catches & stores error
            ↓
ErrorBoundary renders
            ↓
User sees friendly error message
            ↓
User can retry or refresh
```

## Core Concepts

### 1. Validation Layer

**File:** `lib/meta-v2/validation/rowValidator.ts`

Validates data at system boundaries:

```typescript
// Validates before processing
RowValidator.throwIfInvalid(rows);

// Check specific row
const errors = RowValidator.validateRow(row, index);
```

**What it checks:**
- Required fields exist (date, spend, purchases, impressions, clicks)
- Numeric fields are valid (non-negative, finite)
- Date format is YYYY-MM-DD
- No NaN or Infinity values

### 2. Business Logic Service

**File:** `lib/meta-v2/services/zeroPurchaseService.ts`

Pure business logic, testable and reusable:

```typescript
// Process data with validation
const output = ZeroPurchaseService.process(rows, threshold);

// Extract handles from ad names
const handles = ZeroPurchaseService.extractHandles(adNames);
```

**Why separate?**
- Can be called from API routes, CLI, workers
- Testable without React/DOM
- Easy to mock for testing components
- No side effects (pure functions)

### 3. Custom Hooks

**Files:** `components/meta-v2/hooks/`

Encapsulate UI logic:

```typescript
// Data processing hook
const { output, threshold, updateThreshold, error } = useZeroPurchaseData(rows);

// Clipboard operations
const { copied, copy } = useCopyToClipboard();

// Row expansion state
const { openId, toggleRow } = useExpandedRows();

// Pagination state
const { paginatedItems, page, nextPage, prevPage } = usePagination(items);
```

**Benefits:**
- Reusable across components
- Testable in isolation
- Clear separation of concerns
- Easier to debug

### 4. Error Boundary

**File:** `components/meta-v2/shared/ErrorBoundary.tsx`

User-friendly error display:

```typescript
{error && (
  <ErrorBoundary
    error={error}
    title="Data Processing Error"
    onRetry={() => window.location.reload()}
  />
)}
```

Shows:
- User-friendly title
- Error message
- Expandable technical details
- Retry action

### 5. Performance Utilities

**File:** `lib/meta-v2/performance/index.ts`

Optimization helpers:

```typescript
// Debounce expensive operations
const debouncedSearch = debounce(handleSearch, 300);

// Throttle frequent events
const throttledScroll = throttle(handleScroll, 100);

// Memoize calculations
const memoizedCalc = memoize(expensiveFunction);

// Monitor performance
PerformanceMonitor.start("operation");
doSomething();
PerformanceMonitor.end("operation"); // Logs if > 100ms
```

## Testing

### Run Tests

```bash
# All tests
npm test

# Specific file
npm test rowValidator.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Structure

```typescript
describe("Feature", () => {
  it("should do X", () => {
    const result = callFunction(input);
    expect(result).toBe(expectedOutput);
  });

  it("should handle error Y", () => {
    expect(() => callFunction(invalidInput)).toThrow("Error message");
  });
});
```

## Performance Optimization

### When to Use Standard Component

- Small datasets (< 500 ads)
- Real-time interactivity is priority
- Memory is not a concern

```typescript
import { ZeroPurchaseDashboard } from "@/components/meta-v2/dashboard/ZeroPurchaseDashboard";
```

### When to Use Optimized Component

- Large datasets (> 500 ads)
- Network bandwidth matters
- Rendering performance critical

```typescript
import { ZeroPurchaseDashboardOptimized } from "@/components/meta-v2/dashboard/ZeroPurchaseDashboardOptimized";
```

**Optimized features:**
- Pagination (50 items per page)
- Memoized row components
- Lazy calculation only for visible rows
- Navigation UI with page numbers

### Pagination API

```typescript
const {
  paginatedItems,  // Current page items
  page,            // Current page number
  totalPages,      // Total pages
  totalItems,      // Total items
  nextPage,        // Go to next page
  prevPage,        // Go to previous page
  goToPage,        // Jump to specific page
  startIndex,      // Start index of current page
  endIndex,        // End index of current page
} = usePagination(items, { pageSize: 50 });
```

## Adding New Features

### Add a New Engine

1. Create file: `lib/meta-v2/engines/newFeatureEngine.ts`
2. Import calculation utilities
3. Implement calculation logic
4. Export output interface and function

```typescript
export interface NewFeatureOutput {
  items: NewFeatureItem[];
  verdict: string;
}

export function buildNewFeature(rows: MetaV2CleanRow[]): NewFeatureOutput {
  // Validation
  RowValidator.throwIfInvalid(rows);
  
  // Calculation
  const results = rows
    .filter(row => /* condition */)
    .map(row => /* transform */);

  return {
    items: results,
    verdict: "Summary",
  };
}
```

### Add a New Hook

1. Create file: `components/meta-v2/hooks/useNewFeature.ts`
2. Use existing hooks as template
3. Export hook function

```typescript
export function useNewFeature(rows: MetaV2CleanRow[]) {
  const [state, setState] = useState();

  const result = useMemo(() => {
    try {
      return buildNewFeature(rows);
    } catch (err) {
      setError(err);
      return null;
    }
  }, [rows]);

  return { result, state, setState, error };
}
```

### Add Component Tests

1. Create file: `components/meta-v2/hooks/__tests__/useNewFeature.test.ts`
2. Test initialization
3. Test state changes
4. Test error handling
5. Test memoization

```typescript
describe("useNewFeature", () => {
  it("initializes with default state", () => {
    const { result } = renderHook(() => useNewFeature(rows));
    expect(result.current.result).toBeDefined();
  });

  it("updates on input change", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useNewFeature(rows),
      { initialProps: { rows: rows1 } }
    );
    
    rerender({ rows: rows2 });
    expect(result.current.result).toBeDefined();
  });
});
```

## Debugging

### Enable Performance Monitoring

```typescript
import { PerformanceMonitor } from "@/lib/meta-v2/performance";

PerformanceMonitor.start("processData");
const result = ZeroPurchaseService.process(rows, threshold);
PerformanceMonitor.end("processData");
// Logs warning if > 100ms
```

### Check Data Validation

```typescript
import { RowValidator } from "@/lib/meta-v2/validation/rowValidator";

const errors = RowValidator.validateRows(rows);
if (errors.length > 0) {
  console.table(errors);
}
```

### Monitor Object Size

```typescript
import { getObjectSize } from "@/lib/meta-v2/performance";

const sizeInBytes = getObjectSize(largeDataObject);
console.log(`Data size: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`);
```

## Best Practices

### ✅ DO

- Validate at system boundaries (inputs)
- Use hooks for UI state
- Keep business logic pure
- Test calculation logic
- Memoize expensive operations
- Handle errors gracefully
- Use TypeScript strictly

### ❌ DON'T

- Put business logic in components
- Validate inside calculations
- Mix async with calculations
- Mutate input data
- Use deep nesting
- Ignore error states
- Over-engineer for hypothetical cases

## Troubleshooting

### Component renders but shows no data

**Check:**
1. Is `useZeroPurchaseData` being called?
2. Are there validation errors? (Check ErrorBoundary)
3. Is threshold too high? Lower it to test
4. Run: `RowValidator.validateRows(rows)`

### Tests are failing

**Check:**
1. Did you update the schema? Update test fixtures
2. Are imports correct? Check relative paths
3. Mock data valid? Use `createTestRow()`
4. Run: `npm test -- --verbose`

### Performance is slow

**Check:**
1. How many items? (> 500 = use Optimized)
2. Is pagination working? Check `usePagination` hook
3. Any re-renders? Check memoization
4. Run: `PerformanceMonitor.measure("label", () => work())`

## Resources

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)
- [React Hooks Guide](https://react.dev/reference/react)
- [Vitest Documentation](https://vitest.dev/)
- [Performance Monitoring](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
