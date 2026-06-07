# git-msg — plan

A group-chat CLI that uses a git repo as the transport. Every message is a
commit; every sync is a `git fetch` + `git pull --rebase`. Designed for
networks that only allow outbound SSH to `github.com`.

## Concept

- One repo == one group chat.
- Each participant clones the repo locally; their `git config user.email`
  is their identity.
- Sending a message = write a file, commit, push.
- Receiving = periodic `git fetch` + fast-forward (or rebase) + re-read the
  message store.
- All transport is plain `git` over SSH — works anywhere `git push` works.

## Storage layout in the chat repo

To avoid merge conflicts when two participants send at once, **one file per
message**, never edited after creation:

```
messages/
  2026-06-07T15-04-12-123Z__a1b2c3d4.json
  2026-06-07T15-04-15-901Z__e5f6a7b8.json
README.md            (auto-generated, explains the repo)
.gitignore
```

File contents:

```json
{
  "v": 1,
  "id": "a1b2c3d4...",          // random, also in filename
  "author": "alice@example.com", // from git config user.email at send time
  "name": "Alice",               // from git config user.name (display only)
  "ts": "2026-06-07T15:04:12.123Z",
  "body": "hello world"
}
```

Why a file per message:

- Two simultaneous sends from different participants touch disjoint paths,
  so `git pull --rebase` auto-merges without conflict.
- Append-only single-log files (`chat.log`, `messages.jsonl`) would conflict
  on every concurrent send. Avoided.
- Filename is sortable by timestamp for cheap chronological reads.
- The author email is recorded *in* the JSON as well as the git commit,
  so we don't have to shell out to `git log` for every render.

The trust model is the same as git: commit author is advisory, anyone with
push access can write any author string. We surface the commit author from
`git log` alongside the JSON `author` and flag mismatches in the UI.

## Sync loop

Background interval (default every 5s, configurable):

1. `git fetch origin <branch>`
2. If local has no unpushed commits → `git merge --ff-only`.
   Else → `git pull --rebase origin <branch>` (rebases our local message
   commits on top of remote; since each commit only adds a new file, this
   never conflicts in practice).
3. Re-scan `messages/` for new files; emit them to the UI.

On send:

1. Write `messages/<ts>__<id>.json`.
2. `git add` + `git commit -m "msg: <id>"` with `--author` left to git config.
3. `git push origin <branch>`.
4. If push rejected (someone else pushed first): run sync loop, then retry
   push. Capped retries with exponential backoff.

The local message file is rendered optimistically before the push completes,
with a "sending" indicator until the push succeeds.

## TUI (React Ink)

Single-screen layout:

```
┌─ git-msg · alice@example.com · repo:team-chat · branch:main ────────┐
│                                                                     │
│  10:02  bob@…       hey are you on?                                 │
│  10:03  alice@…     yeah just synced                                │
│  10:05  carol@…     pushing a fix in a sec                          │
│  …                                                                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ● synced 2s ago · 3 participants · 142 msgs                         │
├─────────────────────────────────────────────────────────────────────┤
│ > _                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

Components:

- `<Header>` — your identity, repo name, branch.
- `<MessageList>` — scrollable; groups consecutive messages from the same
  author; shows local time; "sending…" / "failed ↺" indicators per message.
- `<StatusBar>` — sync state (idle / fetching / pushing / error), last sync
  age, participant count (distinct authors in `messages/`), total messages.
- `<Composer>` — single-line input (multiline via shift+enter later).

Keys:

- `Enter` — send
- `Ctrl+R` — force sync now
- `Ctrl+B` — open branch selector
- `Ctrl+L` — clear screen / scroll to bottom
- `Ctrl+C` / `Esc` — quit (Esc also closes any open dialog)
- `PgUp` / `PgDn` — scroll history

Out of scope for v1: editing, deleting, reactions, threads, attachments,
DMs, read receipts, typing indicators.

## Branch selector (channel switcher)

Branches double as separate chat "rooms" in the same repo. The header
shows a `[branch ▾]` button; clicking it (mouse not supported in Ink, so
`Ctrl+B` or focusing it with Tab + Enter) opens a modal overlay:

```
┌─ switch branch ──────────────────────┐
│  > main              (current)       │
│    team-standup       42 msgs        │
│    random             8 msgs         │
│    incident-2026-06   126 msgs       │
│  ─────────────────────────────────── │
│  + new branch…                       │
└──────────────────────────────────────┘
  ↑/↓ select · Enter open · Esc cancel
```

Behavior:

- On open: `git fetch --prune`, then list local + remote (`origin/*`)
  branches, deduped. Current branch marked.
- Message counts are best-effort: `git ls-tree -r --name-only <branch> --
  messages/ | wc -l`. Cached for the lifetime of the dialog.
- `Enter` on a branch:
  1. Block if there are unpushed commits — prompt to push or discard.
  2. `git checkout <name>` (creating a tracking branch if it only exists
     on `origin`).
  3. Reload `messages/` and resume the sync loop on the new branch.
- `+ new branch…` opens an inline prompt for the name, validates against
  `git check-ref-format --branch`, then creates an **orphan** branch so
  it starts with zero messages:

  ```
  git checkout --orphan <name>
  git rm -rf .                          # wipe working tree
  mkdir messages && touch messages/.gitkeep
  # auto-generated README.md explaining the chat
  git add . && git commit -m "chat: start <name>"
  git push -u origin <name>
  ```

  Then drop into the new (empty) chat. If push fails (no remote / no
  perms), the branch still exists locally and we surface the error in the
  status bar — same degradation path as a normal send.

State changes on switch:

- Messages in memory are cleared and re-read from disk for the new branch.
- The pending-send queue is per-branch (un-pushed commits naturally stay
  on whichever branch they were made on, so this falls out for free).
- Status bar `participants` and `msgs` counters recompute.

CLI shortcut to skip the dialog:

```
git-msg --branch <name>           # open directly on <name>
git-msg new-branch <name>         # create orphan branch and open
```

## CLI surface

```
git-msg                       # open chat in cwd (must be a git repo)
git-msg --repo <path>         # open chat in another local clone
git-msg init <url>            # clone <url> into ./<name> and open
git-msg --branch <name>       # use a non-default branch
git-msg --poll <seconds>      # sync interval, default 5
git-msg --once                # print messages and exit (no TUI, for piping)
```

No global config file in v1. Everything that needs to be persistent lives
in the repo itself or in `git config`.

## Project layout

```
git-msg/
  package.json
  tsconfig.json
  README.md
  src/
    cli.tsx                  # entrypoint, arg parsing, mounts <App>
    app.tsx                  # top-level Ink component, owns state
    components/
      Header.tsx
      MessageList.tsx
      Message.tsx
      StatusBar.tsx
      Composer.tsx
      BranchDialog.tsx       # branch selector modal + new-branch prompt
    git/
      repo.ts                # wraps git: identity, fetch, pull, push, commit
      messages.ts            # read/write messages/ dir, parse files
      branches.ts            # list/checkout/create-orphan branch helpers
      sync.ts                # the periodic fetch+merge loop
    types.ts                 # Message, Identity, SyncState
    util/
      id.ts                  # random id
      time.ts                # filename-safe timestamp
```

## Tech choices

- **TypeScript**, Node 20+.
- **ink** + **ink-text-input** for the TUI.
- **execa** for shelling out to `git` (simpler/more transparent than
  `simple-git` and avoids hiding errors).
- **meow** for arg parsing (Ink ecosystem standard, tiny).
- No test framework in v1; one manual smoke test against a throwaway repo.

## Edge cases to handle in v1

- Not in a git repo → friendly error, hint at `git-msg init <url>`.
- `user.email` not set → refuse to start, print the `git config` command.
- No remote / no upstream branch → still works locally, push step is a
  no-op with a status warning.
- Push rejected → fetch+rebase+retry up to N times, then surface error in
  status bar without crashing.
- Detached HEAD → refuse to start.
- Network down → sync errors degrade to status-bar warning; sends queue
  locally as un-pushed commits and flush on next successful push.
- Corrupt/non-JSON file in `messages/` → skip with a console warning, don't
  crash the UI.
- Clock skew between participants → we sort by the timestamp inside the
  JSON, falling back to commit time, so a wildly-wrong local clock only
  hurts that participant's outgoing messages.

## Explicit non-goals for v1

- End-to-end encryption. Anyone with repo access reads everything. (Future:
  symmetric key in `git config chat.key`, encrypt the `body` field.)
- History pruning / `git gc` of old messages. Repo grows forever.
- Notifications outside the running TUI.
- Web/mobile clients.

## Build & run

```
npm install
npm run build       # tsc → dist/
node dist/cli.js    # or `npm link` then `git-msg`
```

## Open questions for you

1. **Branch**: stick to `main`, or use a dedicated `chat` branch so the repo
   can also hold other content? I'd default to `main` and let `--branch`
   override.
2. **Sync interval**: 5s feels right for "decent UX" without hammering
   GitHub. OK?
3. **Encryption**: skip for v1 as above, or is that a hard requirement
   given the threat model (restricted network = probably also nosy
   network)?
4. **Message file format**: JSON as above, or newline-delimited so a human
   `cat` of the file is readable? JSON is easier to extend.
