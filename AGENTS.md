# AGENTS.md

Personal repository of niels288. It follows the same working agreements as the
NGBLU engineering baseline (RFC 0001), adapted for a solo private repository.

## Working agreements

- **Language.** Issues, PRs, commits, code comments and developer docs in
  English. `README.md` and end-user text (Homey UI, locales `nl`) in Dutch.
- **Issue first.** Every change starts with an issue carrying exactly one type
  label (`bug`, `enhancement`, `documentation`, `refactor`, `architecture`)
  plus `needs-triage`. The PR closes it with `Closes #<n>`.
- **Every change goes through a PR** to `main`, docs and one-liners included.
  `.githooks/pre-push` refuses a direct push to `main`
  (`git config core.hooksPath .githooks`).
- **PR titles are Conventional Commits**: `type(scope): description`, types
  `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `arch`.
- **Squash merge only**, branch deleted on merge (`gh pr merge --squash
  --delete-branch`, run from the main checkout, never from a worktree).
- **Self-merge once CI is green**, except a Critical Change (see profile).
- **Worktree per issue** on branch `issue-<n>-<slug>`; the main checkout stays
  on `main`. Commit, rebase on `main`, then push.
- **Decisions** go in `docs/adr/`, domain terms in `CONTEXT.md`, changes in
  GitHub Releases.

## Repo Profile

baseline: full (personal)

- **CI**: `check` = Biome, `test` = `npm test` (node:test, no Homey runtime
  needed) + `homey app validate`.
- **Version** lives in `.homeycompose/app.json` (Homey convention), not in a
  `VERSION` file. `app.json` at the root is generated: never edit it by hand.
- **Critical Change** (do not self-merge without testing on the real
  gateway): anything that **writes** to EMS-ESP. Writing changes a family's
  heating; it ships only after it was validated against real data.
- **Test gateway**: EMS-ESP 3.6.3 at `10.99.1.253`, reachable from
  `10.0.10.0/24` over the site-to-site tunnel. Read freely; never POST to it
  without the owner's explicit go-ahead.
- Keep it small: no option, layer or abstraction without a present need.
