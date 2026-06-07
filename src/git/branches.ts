import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function listBranches(cwd: string): Promise<string[]> {
  try {
    await execa('git', ['fetch', '--prune'], { cwd });
  } catch {
    // ignore fetch errors
  }

  const { stdout } = await execa('git', ['branch', '-a', '--format=%(refname:short)'], { cwd });
  const branches = stdout
    .split('\n')
    .map((b: string) => b.trim())
    .filter(Boolean)
    .map((b: string) => b.replace(/^origin\//, ''));

  return Array.from(new Set(branches));
}

export async function getMessageCountForBranch(cwd: string, branch: string): Promise<number> {
  try {
    const { stdout } = await execa('git', ['ls-tree', '-r', '--name-only', branch, '--', 'messages/'], { cwd });
    return stdout.split('\n').filter((l: string) => l.trim().endsWith('.json')).length;
  } catch {
    return 0;
  }
}

export async function checkoutBranch(cwd: string, branch: string): Promise<void> {
  await execa('git', ['checkout', branch], { cwd });
}

export async function createOrphanBranch(cwd: string, branch: string): Promise<void> {
  await execa('git', ['check-ref-format', '--branch', branch], { cwd });

  await execa('git', ['checkout', '--orphan', branch], { cwd });
  await execa('git', ['rm', '-rf', '.'], { cwd });
  
  await fs.mkdir(path.join(cwd, 'messages'), { recursive: true });
  await fs.writeFile(path.join(cwd, 'messages', '.gitkeep'), '');
  await fs.writeFile(path.join(cwd, 'README.md'), '# git-messenger chat branch\nThis is an auto-generated branch for a git-messenger chat group.\n');
  await execa('git', ['add', '.'], { cwd });
  await execa('git', ['commit', '-m', `chat: start ${branch}`], { cwd });
  try {
    await execa('git', ['push', '-u', 'origin', branch], { cwd });
  } catch {
    // ignore push error
  }
}
