/**
 * Tests for v2 schema validation
 *
 * Validates that case files conform to the v2 architecture schema.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURES_DIR = path.join(__dirname, 'case');

/**
 * V2 Schema Definitions
 */
const V2_SCHEMA = {
  state: {
    required: ['case', 'topic', 'phase', 'iteration', 'next_source', 'gates'],
    phases: ['PLAN', 'BOOTSTRAP', 'QUESTION', 'FOLLOW', 'WRITE', 'VERIFY', 'COMPLETE'],
    gates: ['planning', 'questions', 'curiosity', 'reconciliation', 'article', 'sources', 'integrity', 'legal', 'balance', 'completeness', 'significance'],
  },
  sources: {
    required: ['sources'],
  },
  leads: {
    required: ['leads'],
    leadFields: ['id', 'lead', 'from', 'priority', 'status'],
    priorities: ['HIGH', 'MEDIUM', 'LOW'],
    statuses: ['pending', 'investigated', 'dead_end'],
  },
};

/**
 * Validate state.json against v2 schema
 */
function validateState(state) {
  const errors = [];

  // Check required fields
  for (const field of V2_SCHEMA.state.required) {
    if (!(field in state)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate phase
  if (state.phase && !V2_SCHEMA.state.phases.includes(state.phase)) {
    errors.push(`Invalid phase: ${state.phase}. Must be one of: ${V2_SCHEMA.state.phases.join(', ')}`);
  }

  // Validate iteration
  if (typeof state.iteration !== 'number' || state.iteration < 1) {
    errors.push(`Invalid iteration: ${state.iteration}. Must be a positive integer`);
  }

  // Validate next_source
  if (typeof state.next_source !== 'number' || state.next_source < 1) {
    errors.push(`Invalid next_source: ${state.next_source}. Must be a positive integer`);
  }

  // Validate gates
  if (state.gates) {
    const gateKeys = Object.keys(state.gates);
    if (gateKeys.length !== 11) {
      errors.push(`Invalid gate count: ${gateKeys.length}. Must have exactly 11 gates`);
    }
    for (const gate of V2_SCHEMA.state.gates) {
      if (!(gate in state.gates)) {
        errors.push(`Missing gate: ${gate}`);
      } else if (typeof state.gates[gate] !== 'boolean') {
        errors.push(`Invalid gate value for ${gate}: must be boolean`);
      }
    }
  }

  return errors;
}

/**
 * Validate sources.json against v2 schema
 */
function validateSources(sources) {
  const errors = [];

  if (!('sources' in sources)) {
    errors.push('Missing required field: sources');
  } else if (!Array.isArray(sources.sources)) {
    errors.push('sources must be an array');
  }

  return errors;
}

/**
 * Validate leads.json against v2 schema
 */
function validateLeads(leads) {
  const errors = [];

  if (!('leads' in leads)) {
    errors.push('Missing required field: leads');
  } else if (!Array.isArray(leads.leads)) {
    errors.push('leads must be an array');
  } else {
    // Validate each lead if present
    for (let i = 0; i < leads.leads.length; i++) {
      const lead = leads.leads[i];
      for (const field of V2_SCHEMA.leads.leadFields) {
        if (!(field in lead)) {
          errors.push(`Lead ${i}: missing required field: ${field}`);
        }
      }
      if (lead.priority && !V2_SCHEMA.leads.priorities.includes(lead.priority)) {
        errors.push(`Lead ${i}: invalid priority: ${lead.priority}`);
      }
      if (lead.status && !V2_SCHEMA.leads.statuses.includes(lead.status)) {
        errors.push(`Lead ${i}: invalid status: ${lead.status}`);
      }
    }
  }

  return errors;
}

// Tests

test('v2 fixture state.json is valid', async (t) => {
  const stateFile = path.join(FIXTURES_DIR, 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

  const errors = validateState(state);
  assert.equal(errors.length, 0, `state.json validation errors: ${errors.join('; ')}`);
});

test('v2 fixture sources.json is valid', async (t) => {
  const sourcesFile = path.join(FIXTURES_DIR, 'sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesFile, 'utf-8'));

  const errors = validateSources(sources);
  assert.equal(errors.length, 0, `sources.json validation errors: ${errors.join('; ')}`);
});

test('v2 fixture leads.json is valid', async (t) => {
  const leadsFile = path.join(FIXTURES_DIR, 'leads.json');
  const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));

  const errors = validateLeads(leads);
  assert.equal(errors.length, 0, `leads.json validation errors: ${errors.join('; ')}`);
});

test('validateState detects missing required fields', async (t) => {
  const invalidState = { case: 'test' };
  const errors = validateState(invalidState);

  assert.ok(errors.length > 0, 'Should detect missing fields');
  assert.ok(errors.some(e => e.includes('topic')), 'Should detect missing topic');
  assert.ok(errors.some(e => e.includes('phase')), 'Should detect missing phase');
  assert.ok(errors.some(e => e.includes('gates')), 'Should detect missing gates');
});

test('validateState detects invalid phase', async (t) => {
  const invalidState = {
    case: 'test',
    topic: 'Test',
    phase: 'INVALID_PHASE',
    iteration: 1,
    next_source: 1,
    gates: {},
  };
  const errors = validateState(invalidState);

  assert.ok(errors.some(e => e.includes('Invalid phase')), 'Should detect invalid phase');
});

test('validateState detects wrong gate count', async (t) => {
  const invalidState = {
    case: 'test',
    topic: 'Test',
    phase: 'BOOTSTRAP',
    iteration: 1,
    next_source: 1,
    gates: {
      questions: false,
      curiosity: false,
      // Missing 4 gates
    },
  };
  const errors = validateState(invalidState);

  assert.ok(errors.some(e => e.includes('gate count')), 'Should detect wrong gate count');
});

test('validateLeads detects invalid lead structure', async (t) => {
  const invalidLeads = {
    leads: [
      { id: 'L001' }, // Missing required fields
    ],
  };
  const errors = validateLeads(invalidLeads);

  assert.ok(errors.length > 0, 'Should detect invalid lead structure');
  assert.ok(errors.some(e => e.includes('lead')), 'Should detect missing lead field');
});

test('validateLeads detects invalid priority', async (t) => {
  const invalidLeads = {
    leads: [
      {
        id: 'L001',
        lead: 'Test lead',
        from: '01-follow-the-money',
        priority: 'URGENT', // Invalid
        status: 'pending',
      },
    ],
  };
  const errors = validateLeads(invalidLeads);

  assert.ok(errors.some(e => e.includes('invalid priority')), 'Should detect invalid priority');
});

test('v2 schema constants are correct', async (t) => {
  // Verify schema constants match CLAUDE.md documentation
  assert.equal(V2_SCHEMA.state.gates.length, 11, 'Should have 11 gates');
  assert.equal(V2_SCHEMA.state.phases.length, 7, 'Should have 7 phases');

  const expectedGates = ['planning', 'questions', 'curiosity', 'reconciliation', 'article', 'sources', 'integrity', 'legal', 'balance', 'completeness', 'significance'];
  assert.deepEqual(V2_SCHEMA.state.gates, expectedGates, 'Gates should match v2 spec');

  const expectedPhases = ['PLAN', 'BOOTSTRAP', 'QUESTION', 'FOLLOW', 'WRITE', 'VERIFY', 'COMPLETE'];
  assert.deepEqual(V2_SCHEMA.state.phases, expectedPhases, 'Phases should match v2 spec');
});

// Export validators for use in other tests
module.exports = {
  validateState,
  validateSources,
  validateLeads,
  V2_SCHEMA,
};
