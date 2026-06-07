import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface ComposerProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSubmit, disabled }: ComposerProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (text: string) => {
    if (text.trim() && !disabled) {
      onSubmit(text);
      setValue('');
    }
  };

  return (
    <Box paddingX={1}>
      <Text color="cyan">{'> '}</Text>
      <Box flexGrow={1}>
        {disabled ? (
          <Text color="gray">...</Text>
        ) : (
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder="Type a message..."
          />
        )}
      </Box>
    </Box>
  );
}
