import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execa } from 'execa';

test('E2E: Client A sends message, Client B receives it', async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-msg-e2e-'));
  const remoteDir = path.join(tmpDir, 'remote.git');
  const clientA = path.join(tmpDir, 'clientA');
  const clientB = path.join(tmpDir, 'clientB');

  // Setup remote bare repo
  await execa('git', ['init', '--bare', '--initial-branch=main', remoteDir]);

  const cliPath = path.resolve(process.cwd(), 'dist/cli.js');

  // Helper to run cli
  const runCLI = async (cwd: string, args: string[]) => {
    return execa('node', [cliPath, ...args], { cwd });
  };

  // Setup Client A
  await execa('git', ['clone', remoteDir, clientA]);
  await execa('git', ['config', 'user.name', 'Alice'], { cwd: clientA });
  await execa('git', ['config', 'user.email', 'alice@example.com'], { cwd: clientA });

  // Initial commit to create the branch
  await fs.writeFile(path.join(clientA, 'README.md'), 'test repo');
  await execa('git', ['add', '.'], { cwd: clientA });
  await execa('git', ['commit', '-m', 'init'], { cwd: clientA });
  await execa('git', ['push', 'origin', 'main'], { cwd: clientA });

  // Setup Client B
  await execa('git', ['clone', remoteDir, clientB]);
  await execa('git', ['config', 'user.name', 'Bob'], { cwd: clientB });
  await execa('git', ['config', 'user.email', 'bob@example.com'], { cwd: clientB });

  // Client A sends a message
  await runCLI(clientA, ['send', 'hello from alice']);

  // Client B shouldn't see it yet without syncing
  let bOut = await runCLI(clientB, ['--once']);
  assert.doesNotMatch(bOut.stdout, /hello from alice/);

  // Client B manually triggers a pull via git (the app would do this via sync loop)
  // Or we can just import sync and run it, or write a `git-msg sync` command.
  // Actually the app would do it, let's just use `git pull` which mimics what sync does.
  await execa('git', ['pull', '--rebase', 'origin', 'main'], { cwd: clientB });

  // Client B checks messages again
  bOut = await runCLI(clientB, ['--once']);
  assert.match(bOut.stdout, /hello from alice/);

  // Client B sends a reply
  await runCLI(clientB, ['send', 'hey alice, it is bob']);

  // Client A fetches
  await execa('git', ['pull', '--rebase', 'origin', 'main'], { cwd: clientA });

  // Client A checks
  const aOut = await runCLI(clientA, ['--once']);
  assert.match(aOut.stdout, /hello from alice/);
  assert.match(aOut.stdout, /hey alice, it is bob/);

  // Cleanup
  await fs.rm(tmpDir, { recursive: true, force: true });
});
