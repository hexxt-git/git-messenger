import React from 'react';
import { Box, Text } from 'ink';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

export function HelpDialog() {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width={60}
    >
      <Text bold color="cyan">
        Help & Information (v{pkg.version})
      </Text>

      <Box flexDirection="column" marginY={1}>
        <Text color="yellow">How to use:</Text>
        <Text>
          git-messenger uses this git repository to sync messages. Write your message, hit Enter,
          and we'll automatically commit and push it.
        </Text>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="red">‼️ IMPORTANT ‼️</Text>
        <Text>
          Do not forget to give all participants write access to this git repository, otherwise they
          won't be able to send messages.
        </Text>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="yellow">Shortcuts:</Text>
        <Text>• Enter : Send message</Text>
        <Text>• Ctrl+B : Open channels (branches)</Text>
        <Text>• Ctrl+G : Toggle this help dialog</Text>
        <Text>• Ctrl+R : Force sync immediately</Text>
        <Text>• Ctrl+C/D/Esc : Quit</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press Esc or Ctrl+G to close</Text>
      </Box>
    </Box>
  );
}
