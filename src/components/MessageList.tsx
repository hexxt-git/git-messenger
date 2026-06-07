import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types.js';

interface MessageListProps {
  messages: Message[];
  pendingIds: Set<string>;
  height?: number;
}

export function MessageList({ messages, pendingIds, height = 20 }: MessageListProps) {
  // Render only the messages that fit in the height (approx)
  // Each message takes 1 line for simplicity
  const displayMessages = messages.slice(-height);

  // Group consecutive messages by same author
  const groups: { authorEmail: string; authorName: string; msgs: Message[] }[] = [];
  
  for (const m of displayMessages) {
    if (groups.length > 0 && groups[groups.length - 1].authorEmail === m.author) {
      groups[groups.length - 1].msgs.push(m);
    } else {
      groups.push({ authorEmail: m.author, authorName: m.name, msgs: [m] });
    }
  }

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={5}>
      {groups.map((g, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text color="green">{g.authorName} <Text color="gray">&lt;{g.authorEmail}&gt;</Text></Text>
          {g.msgs.map(m => {
            const date = new Date(m.ts);
            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            const isPending = pendingIds.has(m.id);
            return (
              <Box key={m.id} paddingLeft={2}>
                <Box width={6}>
                  <Text color="gray">{timeStr}</Text>
                </Box>
                <Text>{m.body}</Text>
                {isPending && <Text color="yellow"> (sending...)</Text>}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
