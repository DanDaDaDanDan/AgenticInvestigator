# Test Suite

Tests for AgenticInvestigator v2 architecture.

## Running Tests

```bash
# Run all tests
npm test

# Run with verbose output
npm run test:verbose

# Run specific test file
node --test test/schema.test.js
```

## Test Files

| File | Purpose |
|------|---------|
| `init-case.test.js` | Tests case initialization via init-case.js |
| `schema.test.js` | Tests v2 schema validation (state.json, sources.json, leads.json) |
| `capture.test.js` | Tests capture.js utility functions and case resolution |

## Fixtures

`case/` - A minimal valid v2 case structure for schema testing.

## Requirements

- Node.js 18+ (uses built-in test runner)
- No external test dependencies required

## Adding Tests

1. Create `test/your-feature.test.js`
2. Use `node:test` and `node:assert/strict`
3. Tests are auto-discovered by the `*.test.js` pattern

Example:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');

test('description', async (t) => {
  assert.equal(1 + 1, 2);
});
```
