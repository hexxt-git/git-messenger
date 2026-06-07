import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface BranchDialogProps {
  branches: string[];
  currentBranch: string;
  onSelect: (branch: string) => void;
  onCreateOrphan: (branch: string) => void;
  onClose: () => void;
}

export function BranchDialog({ branches, currentBranch, onSelect, onCreateOrphan, onClose }: BranchDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // The list includes "new branch" as the last option
  const options = [...branches, '+ new branch...'];

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (isCreating) {
      if (key.return) {
        if (newBranchName.trim()) {
          onCreateOrphan(newBranchName.trim());
        }
      } else if (key.backspace || key.delete) {
        setNewBranchName(prev => prev.slice(0, -1));
      } else if (input) {
        setNewBranchName(prev => prev + input);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(options.length - 1, prev + 1));
    } else if (key.return) {
      if (selectedIndex === options.length - 1) {
        setIsCreating(true);
      } else {
        onSelect(options[selectedIndex]);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1} width={50}>
      <Text bold color="yellow">switch branch</Text>
      <Box flexDirection="column" marginY={1}>
        {isCreating ? (
          <Box>
            <Text>New branch name: </Text>
            <Text color="cyan">{newBranchName}_</Text>
          </Box>
        ) : (
          options.map((opt, i) => {
            const isSelected = i === selectedIndex;
            const isCurrent = opt === currentBranch;
            return (
              <Box key={i}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '> ' : '  '}
                  {opt}
                </Text>
                {isCurrent && <Text color="gray"> (current)</Text>}
              </Box>
            );
          })
        )}
      </Box>
      <Text color="gray">↑/↓ select · Enter open · Esc cancel</Text>
    </Box>
  );
}
