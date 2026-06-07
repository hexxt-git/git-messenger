import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { SyncState } from '../types.js';

interface StatusBarProps {
  syncState: SyncState;
  lastSync: Date | null;
  participants: number;
  messages: number;
}

export function StatusBar({ syncState, lastSync, participants, messages }: StatusBarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  let lastSyncStr = 'never';
  if (lastSync) {
    const diffSecs = Math.floor((now.getTime() - lastSync.getTime()) / 1000);
    lastSyncStr = diffSecs < 60 ? `${diffSecs}s ago` : `${Math.floor(diffSecs / 60)}m ago`;
  }

  let syncIndicator = <Text color="green">●</Text>;
  let syncStateText = 'synced';
  if (syncState === 'fetching') {
    syncIndicator = <Text color="yellow">↻</Text>;
    syncStateText = 'fetching';
  } else if (syncState === 'pushing') {
    syncIndicator = <Text color="yellow">↑</Text>;
    syncStateText = 'pushing';
  } else if (syncState === 'error') {
    syncIndicator = <Text color="red">✖</Text>;
    syncStateText = 'error';
  }

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text>
        {syncIndicator} {syncStateText} {lastSync ? lastSyncStr : ''}
      </Text>
      <Text color="gray"> · </Text>
      <Text>{participants} participants</Text>
      <Text color="gray"> · </Text>
      <Text>{messages} msgs</Text>
    </Box>
  );
}
