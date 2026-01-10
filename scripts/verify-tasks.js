#!/usr/bin/env node
/**
 * verify-tasks.js - Verify task integrity and required task coverage
 *
 * This is a verifier intended for generate-gaps.js consumption.
 *
 * Usage:
 *   node verify-tasks.js <case_dir>
 *   node verify-tasks.js <case_dir> --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json')
  };
}

let config = null;
try {
  config = require('./config');
} catch (_) {}

const REQUIRED_PERSPECTIVES = Array.isArray(config?.perspectives?.required)
  ? config.perspectives.required
  : [];

function normalizePerspective(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const key = raw
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const aliases = {
    blindspots: 'blind_spots',
    blind_spot: 'blind_spots',
    blind_spots: 'blind_spots',
    counter_factual: 'counterfactual',
    counterfactuals: 'counterfactual',
    counterfactual: 'counterfactual'
  };

  return aliases[key] || key;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function run(caseDir) {
  const startTime = Date.now();
  const tasksDir = path.join(caseDir, 'tasks');
  const gaps = [];

  if (!fs.existsSync(tasksDir)) {
    gaps.push({
      type: 'TASK_INCOMPLETE',
      object: { dir: 'tasks/' },
      message: 'tasks/ directory not found',
      suggested_actions: ['generate_tasks']
    });
  }

  const taskFiles = fs.existsSync(tasksDir)
    ? fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'))
    : [];

  const tasks = [];
  for (const file of taskFiles) {
    const filePath = path.join(tasksDir, file);
    try {
      const task = readJson(filePath);
      const id = task.id || path.basename(file, '.json');
      tasks.push({ file, id, task });
    } catch (e) {
      gaps.push({
        type: 'TASK_INCOMPLETE',
        object: { file: `tasks/${file}` },
        message: `Failed to parse tasks/${file}: ${e.message}`,
        suggested_actions: ['fix_task_json']
      });
    }
  }

  const mainTasks = tasks.filter(t => String(t.id || '').startsWith('T'));
  const adversarialTasks = tasks.filter(t => String(t.id || '').startsWith('A'));

  const highPriorityIncomplete = [];
  const completedMissingFindings = [];

  for (const { id, task } of tasks) {
    const status = (task.status || '').toLowerCase();
    const priority = String(task.priority || '').toUpperCase();

    if (priority === 'HIGH' && status !== 'completed') {
      highPriorityIncomplete.push({ id, status: status || 'unknown' });
      gaps.push({
        type: 'TASK_INCOMPLETE',
        object: { task_id: id, status: status || 'unknown', priority: 'HIGH' },
        message: `HIGH priority task ${id} not completed (status=${status || 'unknown'})`,
        suggested_actions: ['execute_task']
      });
    }

    if (status === 'completed') {
      const findingsRel = task.findings_file || task.output_file || `findings/${id}-findings.md`;
      const findingsPath = path.join(caseDir, findingsRel);
      if (!fs.existsSync(findingsPath)) {
        completedMissingFindings.push({ id, findings_file: findingsRel });
        gaps.push({
          type: 'TASK_INCOMPLETE',
          object: { task_id: id, findings_file: findingsRel },
          message: `Task ${id} marked completed but findings file missing: ${findingsRel}`,
          suggested_actions: ['write_findings', 'revert_task_status']
        });
      }
    }
  }

  // Adversarial requirements: must exist and be completed
  if (adversarialTasks.length === 0) {
    gaps.push({
      type: 'ADVERSARIAL_INCOMPLETE',
      object: {},
      message: 'No adversarial tasks (A###.json) found',
      suggested_actions: ['run_adversarial_pass']
    });
  } else {
    const incompleteAdv = adversarialTasks
      .filter(t => String(t.task.status || '').toLowerCase() !== 'completed')
      .map(t => ({ id: t.id, status: (t.task.status || 'unknown') }));

    if (incompleteAdv.length > 0) {
      gaps.push({
        type: 'ADVERSARIAL_INCOMPLETE',
        object: { tasks: incompleteAdv.map(t => t.id) },
        message: `${incompleteAdv.length} adversarial tasks not completed: ${incompleteAdv.map(t => `${t.id}(${t.status})`).join(', ')}`,
        suggested_actions: ['complete_adversarial_tasks']
      });
    }
  }

  // Curiosity requirement: 2+ per cycle (heuristic: present in task list)
  const curiosityTasks = tasks.filter(t => {
    const task = t.task;
    const perspectiveKey = normalizePerspective(task.perspective);
    return task.type === 'curiosity' || perspectiveKey === 'curiosity';
  });
  if (curiosityTasks.length < 2) {
    gaps.push({
      type: 'CURIOSITY_DEFICIT',
      object: { current: curiosityTasks.length, required: 2 },
      message: `Only ${curiosityTasks.length} curiosity tasks; require >=2 per cycle`,
      suggested_actions: ['generate_curiosity_tasks']
    });
  }

  // Required perspectives coverage
  if (REQUIRED_PERSPECTIVES.length > 0) {
    const covered = new Set(
      tasks
        .map(t => normalizePerspective(t.task.perspective))
        .filter(Boolean)
    );

    for (const required of REQUIRED_PERSPECTIVES) {
      const key = normalizePerspective(required);
      if (key && !covered.has(key)) {
        gaps.push({
          type: 'PERSPECTIVE_MISSING',
          object: { perspective: required },
          message: `No task addresses '${required}' perspective`,
          suggested_actions: ['create_perspective_task']
        });
      }
    }
  }

  const stats = {
    total: tasks.length,
    main_tasks: mainTasks.length,
    adversarial_tasks: adversarialTasks.length,
    completed: tasks.filter(t => String(t.task.status || '').toLowerCase() === 'completed').length,
    high_priority_incomplete: highPriorityIncomplete.length,
    completed_missing_findings: completedMissingFindings.length,
    curiosity_tasks: curiosityTasks.length
  };

  const passed = gaps.length === 0;
  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    stats,
    gaps
  };

  return output;
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Task Verification');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(`Total tasks: ${output.stats.total}`);
  console.log(`High priority incomplete: ${output.stats.high_priority_incomplete}`);
  console.log(`Adversarial tasks: ${output.stats.adversarial_tasks}`);
  console.log(`Curiosity tasks: ${output.stats.curiosity_tasks}`);
  console.log('');
  console.log(output.passed ? 'PASS: tasks are consistent' : `FAIL: ${output.gaps.length} gap(s) found`);
}

function cli() {
  const { caseDir, jsonOutput } = parseCliArgs(process.argv);
  if (!caseDir) {
    console.error('Usage: node verify-tasks.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = run(caseDir);
  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHuman(output);
  }

  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}
