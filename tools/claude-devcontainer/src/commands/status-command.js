import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getAllWorktrees, checkWorktreeStatus } from '../core/cleanup-utils.js';
import { safeGitExec } from '../core/secure-shell.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

// All display output goes to stderr so `eval $(wt status)` captures only the cd command
function print(msg = '') {
  process.stderr.write(msg + '\n');
}

function renderBar(score) {
  const max = 30;
  const width = 20;
  const filled = Math.min(Math.floor((score / max) * width), width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function ageColor(ageSeconds) {
  const day = 86400;
  const week = 604800;
  if (ageSeconds < day) return chalk.green;
  if (ageSeconds < week) return chalk.yellow;
  return chalk.gray;
}

function formatRelative(ageSeconds) {
  if (ageSeconds < 60) return 'just now';
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
  if (ageSeconds < 86400) return `${Math.floor(ageSeconds / 3600)}h ago`;
  if (ageSeconds < 604800) return `${Math.floor(ageSeconds / 86400)}d ago`;
  return `${Math.floor(ageSeconds / 604800)}w ago`;
}

// ── Git data ──────────────────────────────────────────────────────────────────

function getWorktreeGitData(wtPath) {
  let timestamp = 0;
  let relativeTime = 'never';
  let subject = '(no commits)';
  let ahead = 0;

  try {
    const ts = safeGitExec('log', ['--format=%ct', '-1'], { encoding: 'utf8', cwd: wtPath }).trim();
    timestamp = parseInt(ts, 10) || 0;

    relativeTime = safeGitExec('log', ['--format=%ar', '-1'], { encoding: 'utf8', cwd: wtPath }).trim();
    subject = safeGitExec('log', ['--format=%s', '-1'], { encoding: 'utf8', cwd: wtPath }).trim();
  } catch {
    // no commits or not a git repo
  }

  try {
    const aheadStr = execSync('git rev-list --count main..HEAD', {
      encoding: 'utf8',
      cwd: wtPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
    ahead = parseInt(aheadStr, 10) || 0;
  } catch {
    ahead = 0;
  }

  return { timestamp, relativeTime, subject, ahead };
}

// ── Claude session lookup ─────────────────────────────────────────────────────

function encodePath(wtPath) {
  return wtPath.replace(/\//g, '-');
}

function getClaudeSessionInfo(wtPath) {
  try {
    const claudeJson = path.join(os.homedir(), '.claude', '.claude.json');
    const raw = fs.readFileSync(claudeJson, 'utf8');
    const data = JSON.parse(raw);
    const project = data?.projects?.[wtPath];
    if (!project?.lastSessionId) return null;

    const sessionId = project.lastSessionId;
    const encoded = encodePath(wtPath);
    const sessionFile = path.join(os.homedir(), '.claude', 'projects', encoded, `${sessionId}.jsonl`);

    if (!fs.existsSync(sessionFile)) return null;

    const mtime = fs.statSync(sessionFile).mtime;
    const ageSeconds = Math.floor((Date.now() - mtime.getTime()) / 1000);

    // Scan first 10 lines for a slug
    let slug = null;
    const content = fs.readFileSync(sessionFile, 'utf8');
    const lines = content.split('\n').slice(0, 10);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.slug) { slug = entry.slug; break; }
      } catch { /* skip */ }
    }

    return { sessionId, slug, ageSeconds, mtime };
  } catch {
    return null;
  }
}

// ── Display ───────────────────────────────────────────────────────────────────

function renderWorktreeBlock(data, index) {
  const { wt, gitData, statusData, sessionInfo } = data;
  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = gitData.timestamp > 0 ? now - gitData.timestamp : Infinity;
  const color = ageColor(ageSeconds);

  const score = Math.min(
    gitData.ahead * 3 + statusData.stagedFiles.length * 2 + statusData.totalChanges,
    30
  );
  const bar = renderBar(score);

  const branch = wt.branch || chalk.yellow('(detached HEAD)');
  const mainTag = wt.isMainRepo ? chalk.dim(' [main]') : '';
  const relTime = gitData.timestamp > 0 ? gitData.relativeTime : 'no commits';

  const subjectTrunc = gitData.subject.length > 60
    ? gitData.subject.slice(0, 60) + '…'
    : gitData.subject;

  const statusStr = statusData.isClean
    ? chalk.dim('clean')
    : chalk.dim(`${statusData.totalChanges} file(s) changed`);

  const aheadStr = gitData.ahead > 0 ? chalk.dim(` · ${gitData.ahead} ahead`) : '';

  let sessionLine = '';
  if (sessionInfo) {
    const sessionAge = formatRelative(sessionInfo.ageSeconds);
    const sessionLabel = sessionInfo.slug
      ? `"${sessionInfo.slug.slice(0, 45)}"`
      : sessionInfo.sessionId.slice(0, 8) + '…';
    sessionLine = `\n  ${chalk.dim('🤖 Last session:')} ${chalk.dim(sessionLabel)}  ${chalk.dim(sessionAge)}`;
  }

  print(
    `  ${chalk.bold(`${index + 1}.`)} ${color(chalk.bold(branch))}${mainTag}\n` +
    `     ${chalk.dim(wt.path)}\n` +
    `     ${color('[' + bar + ']')}  ${chalk.dim(relTime)}\n` +
    `     ${chalk.dim('"' + subjectTrunc + '"')}\n` +
    `     ${statusStr}${aheadStr}${sessionLine}`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function handleStatus() {
  print('');
  print(chalk.blue('📊 Worktree Activity Status'));
  print(chalk.dim('─'.repeat(60)));
  print('');

  // 1. Gather all worktrees — suppress verbose git logger output
  let worktrees;
  try {
    const _log = console.log;
    console.log = () => {};
    worktrees = getAllWorktrees();
    console.log = _log;
  } catch (err) {
    print(chalk.red(`❌ Failed to list worktrees: ${err.message}`));
    process.exit(1);
  }

  if (worktrees.length === 0) {
    print(chalk.yellow('  No worktrees found.'));
    return;
  }

  print(chalk.dim(`  Gathering data for ${worktrees.length} worktree(s)…`));

  // 2. Collect data per worktree — silence verbose git logger (uses console.log → stdout)
  const _origLog = console.log;
  console.log = () => {};
  const allData = worktrees.map((wt) => {
    const gitData = getWorktreeGitData(wt.path);
    const statusData = checkWorktreeStatus(wt.path);
    const sessionInfo = getClaudeSessionInfo(wt.path);
    return { wt, gitData, statusData, sessionInfo };
  });
  console.log = _origLog;

  // 3. Sort by latest commit timestamp descending
  allData.sort((a, b) => b.gitData.timestamp - a.gitData.timestamp);

  // 4. Display
  print('');
  allData.forEach((data, i) => renderWorktreeBlock(data, i));
  print('');
  print(chalk.dim('─'.repeat(60)));
  print(chalk.dim('  Activity bar: █ = commits×3 + staged×2 + changes  (max 30)'));
  print('');

  // 5. Interactive selection
  const choices = allData.map((data, i) => {
    const branch = data.wt.branch || '(detached)';
    const now = Math.floor(Date.now() / 1000);
    const age = data.gitData.timestamp > 0
      ? formatRelative(now - data.gitData.timestamp)
      : 'no commits';
    const main = data.wt.isMainRepo ? ' [main]' : '';
    return {
      name: `${i + 1}. ${branch}${main}  ·  ${age}`,
      value: i,
      short: branch,
    };
  });
  choices.push({ name: chalk.dim('Cancel'), value: -1, short: 'cancel' });

  const { selectedIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedIndex',
      message: 'Select a worktree:',
      choices,
    },
  ]);

  if (selectedIndex === -1) {
    print(chalk.dim('  Cancelled.'));
    return;
  }

  const selected = allData[selectedIndex];
  const { wt, sessionInfo } = selected;

  // 6. Action menu
  const actionChoices = [];

  if (sessionInfo) {
    const label = sessionInfo.slug
      ? `"${sessionInfo.slug.slice(0, 50)}"`
      : sessionInfo.sessionId.slice(0, 8) + '…';
    actionChoices.push({
      name: `Resume last Claude session  ${chalk.dim('(' + label + ')')}`,
      value: 'resume',
    });
  }

  actionChoices.push(
    { name: 'Start new Claude session', value: 'new' },
    { name: `Switch to directory  ${chalk.dim('(outputs cd command)')}`, value: 'switch' },
    { name: chalk.dim('Cancel'), value: 'cancel' }
  );

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `What would you like to do with ${chalk.bold(wt.branch || '(detached)')}?`,
      choices: actionChoices,
    },
  ]);

  if (action === 'cancel') {
    print(chalk.dim('  Cancelled.'));
    return;
  }

  if (action === 'switch') {
    print(chalk.dim(`  Switching to ${wt.path}`));
    // stdout: the cd command for eval $(wt status)
    process.stdout.write(`cd ${wt.path}\n`);
    return;
  }

  // Spawn Claude in the selected worktree
  const claudeArgs = action === 'resume' && sessionInfo
    ? ['--resume', sessionInfo.sessionId]
    : [];

  print('');
  print(chalk.blue(`🚀 Launching Claude in ${chalk.bold(wt.branch || wt.path)}…`));
  print(chalk.dim(`   ${wt.path}`));
  print('');

  const child = spawn('claude', claudeArgs, {
    cwd: wt.path,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('error', (err) => {
    if (err.code === 'ENOENT') {
      process.stderr.write(chalk.red('\n❌ claude CLI not found in PATH. Is it installed?\n'));
    } else {
      process.stderr.write(chalk.red(`\n❌ Failed to launch Claude: ${err.message}\n`));
    }
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}
