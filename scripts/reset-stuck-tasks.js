#!/usr/bin/env node
/**
 * reset-stuck-tasks.js - Find and reset stuck tasks
 *
 * Tasks can get stuck in "in_progress" state if:
 * - Agent crashes/times out
 * - Session is terminated mid-task
 * - Network/API failure during execution
 *
 * Usage:
 *   node scripts/reset-stuck-tasks.js <case-dir>              # List stuck tasks
 *   node scripts/reset-stuck-tasks.js <case-dir> --reset      # Reset all stuck to pending
 *   node scripts/reset-stuck-tasks.js <case-dir> --reset T007 # Reset specific task
 *   node scripts/reset-stuck-tasks.js <case-dir> --complete T007 "reason"  # Mark as complete
 *
 * A task is considered "stuck" if:
 * - Status is "in_progress"
 * - No assigned_at timestamp OR assigned more than 4 hours ago
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STUCK_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

function findStuckTasks(caseDir) {
  const tasksDir = path.join(caseDir, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    console.error('Tasks directory not found:', tasksDir);
    return [];
  }

  const stuck = [];
  const now = Date.now();

  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    if (file === 'task-index.json') continue;

    try {
      const taskPath = path.join(tasksDir, file);
      const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

      if (task.status === 'in_progress') {
        const assignedAt = task.assigned_at ? new Date(task.assigned_at).getTime() : 0;
        const elapsed = now - assignedAt;

        // Stuck if no assigned_at or assigned > threshold ago
        if (!task.assigned_at || elapsed > STUCK_THRESHOLD_MS) {
          stuck.push({
            id: task.id,
            file: file,
            path: taskPath,
            assigned_at: task.assigned_at || null,
            elapsed_hours: task.assigned_at ? (elapsed / (60 * 60 * 1000)).toFixed(1) : 'unknown',
            question: task.question?.substring(0, 60) + '...'
          });
        }
      }
    } catch (e) {
      console.error(`Error reading ${file}:`, e.message);
    }
  }

  return stuck;
}

function resetTask(taskPath, newStatus = 'pending') {
  const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  const oldStatus = task.status;

  task.status = newStatus;
  task.reset_at = new Date().toISOString();
  task.reset_from = oldStatus;
  delete task.assigned_at;

  fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
  return { oldStatus, newStatus };
}

function completeTask(taskPath, reason) {
  const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  const oldStatus = task.status;

  task.status = 'completed';
  task.completed_at = new Date().toISOString();
  task.completion_reason = reason || 'Manually completed via reset-stuck-tasks.js';
  task.reset_from = oldStatus;

  fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
  return { oldStatus, newStatus: 'completed' };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node scripts/reset-stuck-tasks.js <case-dir>              # List stuck tasks');
    console.log('  node scripts/reset-stuck-tasks.js <case-dir> --reset      # Reset all to pending');
    console.log('  node scripts/reset-stuck-tasks.js <case-dir> --reset T007 # Reset specific task');
    console.log('  node scripts/reset-stuck-tasks.js <case-dir> --complete T007 "reason"');
    process.exit(1);
  }

  const caseDir = args[0];
  if (!fs.existsSync(caseDir)) {
    console.error('Case directory not found:', caseDir);
    process.exit(1);
  }

  const stuck = findStuckTasks(caseDir);

  if (args[1] === '--reset') {
    const targetTask = args[2];

    if (targetTask) {
      // Reset specific task
      const task = stuck.find(t => t.id === targetTask);
      if (!task) {
        // Check if task exists but isn't stuck
        const taskPath = path.join(caseDir, 'tasks', `${targetTask}.json`);
        if (fs.existsSync(taskPath)) {
          const result = resetTask(taskPath);
          console.log(`Reset ${targetTask}: ${result.oldStatus} -> ${result.newStatus}`);
        } else {
          console.error(`Task not found: ${targetTask}`);
          process.exit(1);
        }
      } else {
        const result = resetTask(task.path);
        console.log(`Reset ${task.id}: ${result.oldStatus} -> ${result.newStatus}`);
      }
    } else {
      // Reset all stuck tasks
      if (stuck.length === 0) {
        console.log('No stuck tasks found.');
        return;
      }

      console.log(`Resetting ${stuck.length} stuck tasks...`);
      for (const task of stuck) {
        const result = resetTask(task.path);
        console.log(`  ${task.id}: ${result.oldStatus} -> ${result.newStatus}`);
      }
    }
  } else if (args[1] === '--complete') {
    const targetTask = args[2];
    const reason = args[3] || 'Manually completed';

    if (!targetTask) {
      console.error('Must specify task ID for --complete');
      process.exit(1);
    }

    const taskPath = path.join(caseDir, 'tasks', `${targetTask}.json`);
    if (!fs.existsSync(taskPath)) {
      console.error(`Task not found: ${targetTask}`);
      process.exit(1);
    }

    const result = completeTask(taskPath, reason);
    console.log(`Completed ${targetTask}: ${result.oldStatus} -> ${result.newStatus}`);
    console.log(`Reason: ${reason}`);
  } else {
    // List stuck tasks
    if (stuck.length === 0) {
      console.log('No stuck tasks found.');
      return;
    }

    console.log(`Found ${stuck.length} stuck task(s):\n`);
    for (const task of stuck) {
      console.log(`  ${task.id}:`);
      console.log(`    Status: in_progress (stuck)`);
      console.log(`    Assigned: ${task.assigned_at || 'never'}`);
      console.log(`    Elapsed: ${task.elapsed_hours} hours`);
      console.log(`    Question: ${task.question}`);
      console.log('');
    }

    console.log('To reset all stuck tasks:');
    console.log(`  node scripts/reset-stuck-tasks.js ${caseDir} --reset`);
    console.log('');
    console.log('To reset a specific task:');
    console.log(`  node scripts/reset-stuck-tasks.js ${caseDir} --reset ${stuck[0]?.id}`);
  }
}

main();
