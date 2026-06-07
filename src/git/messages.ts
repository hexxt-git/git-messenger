import fs from 'node:fs/promises';
import path from 'node:path';
import type { Message, Identity } from '../types.js';
import { randomId } from '../util/id.js';
import { getFilenameSafeTimestamp } from '../util/time.js';

export async function ensureMessagesDir(cwd: string): Promise<string> {
  const messagesDir = path.join(cwd, 'messages');
  await fs.mkdir(messagesDir, { recursive: true });
  return messagesDir;
}

export async function readMessages(cwd: string): Promise<Message[]> {
  const messagesDir = await ensureMessagesDir(cwd);
  let files: string[];
  try {
    files = await fs.readdir(messagesDir);
  } catch {
    return [];
  }

  const messageFiles = files.filter(f => f.endsWith('.json')).sort();
  const messages: Message[] = [];

  for (const file of messageFiles) {
    try {
      const content = await fs.readFile(path.join(messagesDir, file), 'utf-8');
      const msg: Message = JSON.parse(content);
      messages.push(msg);
    } catch {
      // skip invalid/corrupted files
    }
  }

  return messages;
}

export async function writeMessage(cwd: string, identity: Identity, body: string): Promise<string> {
  const messagesDir = await ensureMessagesDir(cwd);
  const date = new Date();
  const ts = date.toISOString();
  const id = randomId();
  const safeTs = getFilenameSafeTimestamp(date);
  const filename = `${safeTs}__${id}.json`;

  const msg: Message = {
    v: 1,
    id,
    author: identity.email,
    name: identity.name,
    ts,
    body
  };

  await fs.writeFile(path.join(messagesDir, filename), JSON.stringify(msg, null, 2), 'utf-8');
  return id;
}
