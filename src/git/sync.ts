import { hasRemote, fetchOrigin, hasUnpushedCommits, mergeFastForward, pullRebase, pushOrigin } from './repo.js';

export async function sync(cwd: string, branch: string): Promise<void> {
  if (!(await hasRemote(cwd))) {
    return;
  }

  await fetchOrigin(cwd, branch);
  const unpushed = await hasUnpushedCommits(cwd, branch);

  if (!unpushed) {
    await mergeFastForward(cwd);
  } else {
    await pullRebase(cwd, branch);
  }
}

export async function pushWithRetry(cwd: string, branch: string, retries = 3): Promise<void> {
  if (!(await hasRemote(cwd))) {
    return;
  }

  let attempt = 0;
  while (attempt < retries) {
    try {
      await pushOrigin(cwd, branch);
      return;
    } catch (e) {
      attempt++;
      if (attempt >= retries) throw e;
      // Sync to get latest changes and rebase our commit
      await sync(cwd, branch);
    }
  }
}
