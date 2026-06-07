import { execa } from 'execa';
import type { Identity } from '../types.js';

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function getIdentity(cwd: string): Promise<Identity> {
  try {
    const { stdout: name } = await execa('git', ['config', 'user.name'], { cwd });
    const { stdout: email } = await execa('git', ['config', 'user.email'], { cwd });
    if (!email) throw new Error('user.email not set');
    return { name: name.trim(), email: email.trim() };
  } catch (e) {
    throw new Error('Could not read git identity. Please run `git config --global user.email "you@example.com"`');
  }
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['branch', '--show-current'], { cwd });
    if (!stdout.trim()) {
      throw new Error('Detached HEAD state is not supported');
    }
    return stdout.trim();
  } catch (e) {
    throw new Error('Could not determine current branch or in detached HEAD state');
  }
}

export async function hasUnpushedCommits(cwd: string, branch: string): Promise<boolean> {
  try {
    // Check if branch has an upstream
    await execa('git', ['rev-parse', '--abbrev-ref', `${branch}@{u}`], { cwd });
    const { stdout } = await execa('git', ['log', `${branch}@{u}..${branch}`, '--oneline'], { cwd });
    return stdout.trim().length > 0;
  } catch {
    // No upstream usually means we have unpushed commits (the whole branch)
    // or the branch doesn't exist remotely yet.
    return true;
  }
}

export async function fetchOrigin(cwd: string, branch: string): Promise<void> {
  await execa('git', ['fetch', 'origin', branch], { cwd });
}

export async function mergeFastForward(cwd: string): Promise<void> {
  await execa('git', ['merge', '--ff-only'], { cwd });
}

export async function pullRebase(cwd: string, branch: string): Promise<void> {
  await execa('git', ['pull', '--rebase', 'origin', branch], { cwd });
}

export async function pushOrigin(cwd: string, branch: string): Promise<void> {
  await execa('git', ['push', 'origin', branch], { cwd });
}

export async function commitMessage(cwd: string, id: string): Promise<void> {
  await execa('git', ['add', '.'], { cwd });
  await execa('git', ['commit', '-m', `msg: ${id}`], { cwd });
}

export async function hasRemote(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['remote'], { cwd });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
