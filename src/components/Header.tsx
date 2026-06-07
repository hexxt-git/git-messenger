import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  email: string;
  repo: string;
  branch: string;
  isBranchSelectorOpen: boolean;
}

export function Header({ email, repo, branch, isBranchSelectorOpen }: HeaderProps) {
  return (
    <Box borderStyle="single" borderColor="blue" paddingX={1} justifyContent="space-between">
      <Box>
        <Text color="blue">git-msg</Text>
        <Text color="gray"> · </Text>
        <Text>{email}</Text>
        <Text color="gray"> · </Text>
        <Text>repo:{repo}</Text>
        <Text color="gray"> · </Text>
        <Text color={isBranchSelectorOpen ? "green" : "white"}>branch:{branch}</Text>
      </Box>
      <Box>
        <Text color="gray">[Ctrl+B branches]</Text>
      </Box>
    </Box>
  );
}
