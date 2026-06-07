#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import path from 'node:path';
import { execa } from 'execa';
import { App } from './app.js';
import { isGitRepo, getIdentity, getCurrentBranch } from './git/repo.js';
import { readMessages } from './git/messages.js';

const cli = meow(
  `
	Usage
	  $ git-messenger

	Options
	  --repo <path>     Open chat in another local clone
	  --branch <name>   Use a non-default branch
	  --poll <seconds>  Sync interval, default 5
	  --once            Print messages and exit (no TUI)
	
	Examples
	  $ git-messenger
	  $ git-messenger init <url>
`,
  {
    importMeta: import.meta,
    flags: {
      repo: {
        type: 'string',
        shortFlag: 'r',
      },
      branch: {
        type: 'string',
        shortFlag: 'b',
      },
      poll: {
        type: 'number',
        shortFlag: 'p',
        default: 5,
      },
      once: {
        type: 'boolean',
        shortFlag: 'o',
        default: false,
      },
    },
  }
);

async function main() {
  const [command, ...args] = cli.input;

  let cwd = process.cwd();
  if (cli.flags.repo) {
    cwd = path.resolve(cwd, cli.flags.repo);
  }

  if (command === 'init') {
    const url = args[0];
    if (!url) {
      console.error('Error: missing url for init');
      process.exit(1);
    }
    const repoName = url.split('/').pop()?.replace(/\.git$/, '') || 'git-messenger-chat';
    cwd = path.resolve(cwd, repoName);
    try {
      await execa('git', ['clone', url, cwd], { stdio: 'inherit' });
    } catch {
      process.exit(1);
    }
  }

  // Hidden command for E2E testing
  if (command === 'send') {
    const body = args.join(' ');
    if (!body) process.exit(1);
    const { writeMessage } = await import('./git/messages.js');
    const { commitMessage } = await import('./git/repo.js');
    const { pushWithRetry } = await import('./git/sync.js');
    const id = await writeMessage(cwd, await getIdentity(cwd), body);
    await commitMessage(cwd, id);
    let branch = cli.flags.branch || await getCurrentBranch(cwd);
    await pushWithRetry(cwd, branch);
    process.exit(0);
  }

  if (!(await isGitRepo(cwd))) {
    console.error('Error: not a git repository.');
    console.error('Run `git init` or use `git-messenger init <url>`.');
    process.exit(1);
  }

  let identity: import('./types.js').Identity | undefined;
  try {
    identity = await getIdentity(cwd);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }

  let branch = cli.flags.branch;
  if (!branch) {
    try {
      branch = await getCurrentBranch(cwd);
    } catch (e: any) {
      console.error(e.message);
      process.exit(1);
    }
  }

  if (!identity || !branch) {
    process.exit(1);
  }

  if (cli.flags.once) {
    // Just read and print
    if (cli.flags.branch) {
      await execa('git', ['checkout', cli.flags.branch], { cwd });
    }
    const msgs = await readMessages(cwd);
    for (const msg of msgs) {
      console.log(`[${msg.ts}] ${msg.name} <${msg.author}>: ${msg.body}`);
    }
    process.exit(0);
  }

  const repoName = path.basename(cwd);

  // Clear screen
  console.clear();

  render(
    <App 
      cwd={cwd} 
      identity={identity} 
      repoName={repoName} 
      initialBranch={branch} 
      pollInterval={cli.flags.poll} 
    />
  );
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
