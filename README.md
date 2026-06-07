git-messenger

> A group-chat CLI that uses a git repo as the transport.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Ink](https://img.shields.io/badge/React_Ink-000000?style=for-the-badge&logo=react&logoColor=61DAFB)

`git-messenger` is a terminal-based chat client that uses regular Git commits and pushes to sync messages. It was specifically designed for environments and networks that only allow outbound SSH access (e.g., to `github.com`). If you can `git push`, you can chat!

<img width="800" height="600" alt="git-messenger" src="https://github.com/user-attachments/assets/a5e213a2-77e1-429c-b5ec-eaf1763cd3d7" />

## Features

- **Decentralized via Git**: One repository equals one group chat.
- **Channels**: Branches double as separate chat "rooms". Create orphan branches on the fly to start new topics.
- **Conflict-Free**: Each message is a unique file. `git pull --rebase` automatically merges everything smoothly.
- **Interactive TUI**: Built with React Ink, featuring real-time syncing, branch switching, and status indicators.
- **Zero Server Setup**: Relies entirely on your Git host (GitHub, GitLab, self-hosted, etc.).

## Installation

Ensure you have Node.js 20+ installed.

```bash
npm install -g git-messenger
```

## Usage

‼️ **Important**: Do not forget to give all participants write access to the git repo! ‼️

Start a chat in any existing Git repository:

```bash
git-messenger
```

Or, initialize a new chat repository from a remote URL:

```bash
git-messenger init git@github.com:your-username/my-secret-chat.git
```

### Options

```
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
```

### TUI Shortcuts

- **`Enter`**: Send your drafted message.
- **`Ctrl+B`**: Open the branch/channel selector. (Use `↑`/`↓` to select, `Enter` to open, or create a `+ new branch...`).
- **`Ctrl+R`**: Force sync immediately.
- **`Ctrl+C` / `Esc`**: Quit.

## How it Works

Every participant clones the repository locally. `git-messenger` reads your identity directly from `git config user.email` and `user.name`.

When you send a message:

1. It writes a unique JSON file to the `messages/` directory (e.g. `2026-06-07T15-04-12__a1b2c3d4.json`).
2. It runs `git add` and `git commit`.
3. It pushes to the remote via `git push`.

In the background, `git-messenger` automatically polls the remote every 5 seconds. It runs `git fetch` and then either a fast-forward merge or a `git pull --rebase` if you have local unpushed messages. Since every message is a unique file, rebase conflicts do not occur!

## Testing

`git-messenger` includes an automated end-to-end testing suite that creates isolated temporary git repositories, mimics two separate clients interacting, and verifies message syncing logic.

To run the E2E tests:

```bash
npm test
```

## License

ISC
