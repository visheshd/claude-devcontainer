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

  // Effective timestamp: also consider git index mtime so unstaged/staged changes
  // rank dirty worktrees above clean ones that share the same base commit.
  let effectiveTimestamp = timestamp;
  try {
    const gitMarker = path.join(wtPath, '.git');
    let indexPath;
    if (fs.statSync(gitMarker).isFile()) {
      // Worktree: .git is a file with "gitdir: /path/to/gitdir"
      const gitdir = fs.readFileSync(gitMarker, 'utf8').replace('gitdir:', '').trim();
      indexPath = path.join(gitdir, 'index');
    } else {
      indexPath = path.join(gitMarker, 'index');
    }
    const indexMtime = Math.floor(fs.statSync(indexPath).mtimeMs / 1000);
    effectiveTimestamp = Math.max(timestamp, indexMtime);
  } catch { /* leave effectiveTimestamp = commit timestamp */ }

  return { timestamp, effectiveTimestamp, relativeTime, subject, ahead };
}

// ── Claude session lookup ─────────────────────────────────────────────────────

// Claude encodes paths by replacing every non-alphanumeric char with '-'
function encodePath(wtPath) {
  return wtPath.replace(/[^a-zA-Z0-9]/g, '-');
}

function getClaudeSessionInfo(wtPath) {
  try {
    const projectDir = path.join(os.homedir(), '.claude', 'projects', encodePath(wtPath));
    if (!fs.existsSync(projectDir)) return null;

    // Find the most recently modified .jsonl file — skip sub-directories
    const files = fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const full = path.join(projectDir, f);
        return { full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) return null;

    const { full: sessionFile, mtime } = files[0];
    const sessionId = path.basename(sessionFile, '.jsonl');
    const ageSeconds = Math.floor((Date.now() - mtime) / 1000);

    // Scan first 20 lines for a slug
    let slug = null;
    const content = fs.readFileSync(sessionFile, 'utf8');
    for (const line of content.split('\n').slice(0, 20)) {
      try {
        const entry = JSON.parse(line);
        if (entry.slug) { slug = entry.slug; break; }
      } catch { /* skip */ }
    }

    return { sessionId, slug, ageSeconds };
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

  // Branch name always bright so it's visible on any terminal background
  const branchLabel = wt.branch
    ? chalk.bold.white(wt.branch)
    : chalk.bold.yellow('(detached HEAD)');
  const mainTag = wt.isMainRepo ? chalk.dim(' [main]') : '';
  const relTime = gitData.timestamp > 0 ? gitData.relativeTime : 'no commits';

  const subjectTrunc = gitData.subject.length > 60
    ? gitData.subject.slice(0, 60) + '…'
    : gitData.subject;

  const statusStr = statusData.isClean
    ? chalk.dim('clean')
    : chalk.yellow(`${statusData.totalChanges} file(s) changed`);

  const aheadStr = gitData.ahead > 0 ? chalk.dim(` · ${gitData.ahead} ahead`) : '';

  let sessionLine = '';
  if (sessionInfo) {
    const sessionAge = formatRelative(sessionInfo.ageSeconds);
    const sessionLabel = sessionInfo.slug
      ? `"${sessionInfo.slug.slice(0, 45)}"`
      : sessionInfo.sessionId.slice(0, 8) + '…';
    sessionLine = `\n     ${chalk.cyan('🤖')} ${chalk.dim(sessionLabel)}  ${chalk.dim(sessionAge)}`;
  }

  print(
    `  ${chalk.bold(`${index + 1}.`)} ${branchLabel}${mainTag}\n` +
    `     ${chalk.dim(wt.path)}\n` +
    `     ${color('[' + bar + ']')}  ${color(relTime)}\n` +
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

  // 3. Sort by effective timestamp (commit or index mtime, whichever is newer),
  //    then by total file changes as tiebreaker so active dirty worktrees surface first.
  allData.sort((a, b) => {
    const tsDiff = b.gitData.effectiveTimestamp - a.gitData.effectiveTimestamp;
    if (tsDiff !== 0) return tsDiff;
    return b.statusData.totalChanges - a.statusData.totalChanges;
  });

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
