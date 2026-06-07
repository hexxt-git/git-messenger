import React, { useState, useEffect, useCallback } from 'react';
import { Box, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { MessageList } from './components/MessageList.js';
import { StatusBar } from './components/StatusBar.js';
import { Composer } from './components/Composer.js';
import { BranchDialog } from './components/BranchDialog.js';
import { HelpDialog } from './components/HelpDialog.js';
import type { Message, Identity, SyncState } from './types.js';
import { readMessages, writeMessage } from './git/messages.js';
import { sync as runSync, pushWithRetry } from './git/sync.js';
import { commitMessage } from './git/repo.js';
import { listBranches, checkoutBranch, createOrphanBranch } from './git/branches.js';

interface AppProps {
  cwd: string;
  identity: Identity;
  repoName: string;
  initialBranch: string;
  pollInterval: number;
}

export function App({ cwd, identity, repoName, initialBranch, pollInterval }: AppProps) {
  const { exit } = useApp();
  const [branch, setBranch] = useState(initialBranch);
  const [messages, setMessages] = useState<Message[]>([]);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Map<string, string>>(new Map());

  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);

  const loadMessages = useCallback(async () => {
    const msgs = await readMessages(cwd);
    setMessages(msgs);
  }, [cwd]);

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [loadMessages, branch]);

  // Sync loop
  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout;

    const doSync = async () => {
      if (syncState !== 'idle' && syncState !== 'error') return;
      try {
        setSyncState('fetching');
        await runSync(cwd, branch);
        if (mounted) {
          await loadMessages();
          setLastSync(new Date());
          setSyncState('idle');
        }
      } catch (e) {
        if (mounted) setSyncState('error');
      }
    };

    doSync();
    timer = setInterval(doSync, pollInterval * 1000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [cwd, branch, pollInterval, loadMessages]); // omitting syncState from deps to avoid constant resetting of interval

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd') || key.escape) {
      if (isBranchSelectorOpen) {
        setIsBranchSelectorOpen(false);
      } else if (isHelpOpen) {
        setIsHelpOpen(false);
      } else {
        exit();
        process.exit(0);
      }
      return;
    }

    if (key.ctrl && input === 'g') {
      setIsHelpOpen((prev) => !prev);
      return;
    }

    if (key.ctrl && input === 'b') {
      setIsBranchSelectorOpen(true);
      listBranches(cwd)
        .then((b) => setBranches(b))
        .catch(() => {});
    }

    if (key.ctrl && input === 'r') {
      // Force sync
      runSync(cwd, branch)
        .then(() => {
          loadMessages();
          setLastSync(new Date());
          setSyncState('idle');
        })
        .catch(() => setSyncState('error'));
    }
  });

  const handleSend = async (body: string) => {
    let id: string | undefined;
    try {
      id = await writeMessage(cwd, identity, body);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.add(id as string);
        return next;
      });
      await loadMessages(); // optimistically show it

      setSyncState('pushing');
      await commitMessage(cwd, id as string);
      await pushWithRetry(cwd, branch);

      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id as string);
        return next;
      });
      setLastSync(new Date());
      setSyncState('idle');
    } catch (e: any) {
      setSyncState('error');
      if (id) {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id as string);
          return next;
        });
        setFailedIds((prev) => {
          const next = new Map(prev);
          next.set(id as string, e.message || 'Unknown error');
          return next;
        });
      }
    }
  };

  const handleBranchSelect = async (newBranch: string) => {
    setIsBranchSelectorOpen(false);
    if (newBranch !== branch) {
      await checkoutBranch(cwd, newBranch);
      setBranch(newBranch);
    }
  };

  const handleCreateOrphan = async (newBranch: string) => {
    setIsBranchSelectorOpen(false);
    await createOrphanBranch(cwd, newBranch);
    setBranch(newBranch);
  };

  const uniqueAuthors = new Set(messages.map((m) => m.author)).size;

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24} width="100%">
      <Header
        email={identity.email}
        repo={repoName}
        branch={branch}
        isBranchSelectorOpen={isBranchSelectorOpen}
      />

      <Box flexGrow={1} flexDirection="column">
        {isHelpOpen ? (
          <Box flexGrow={1} justifyContent="center" alignItems="center">
            <HelpDialog />
          </Box>
        ) : isBranchSelectorOpen ? (
          <Box flexGrow={1} justifyContent="center" alignItems="center">
            <BranchDialog
              branches={branches}
              currentBranch={branch}
              onSelect={handleBranchSelect}
              onCreateOrphan={handleCreateOrphan}
              onClose={() => setIsBranchSelectorOpen(false)}
            />
          </Box>
        ) : (
          <MessageList
            messages={messages}
            pendingIds={pendingIds}
            failedIds={failedIds}
            height={(process.stdout.rows || 24) - 6}
          />
        )}
      </Box>

      <StatusBar
        syncState={syncState}
        lastSync={lastSync}
        participants={uniqueAuthors}
        messages={messages.length}
      />
      <Composer onSubmit={handleSend} disabled={isBranchSelectorOpen || isHelpOpen} />
    </Box>
  );
}
