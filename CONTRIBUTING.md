# Contributing to NODE Studio

Thanks for your interest in contributing! Here's how to get started.

## Setup

```sh
git clone https://github.com/david-8837/NODE.git
cd NODE
npm ci
npm run dev        # browser dev server at http://localhost:5173
npm run desktop:dev  # Electron + Vite together
```

Requires **Node.js 22+** and npm. Windows packaging also requires Rust.

## Development Checks

Before submitting a PR, make sure everything passes:

```sh
npm run lint       # TypeScript type-check
npm test           # Unit and integration tests
npm run build      # Production build
```

## Pull Request Guidelines

1. **Branch** off `main` and use a descriptive branch name (`fix/encoder-sync`, `feat/icon-search`).
2. **Test** your changes — add or update tests for any new logic.
3. **Keep PRs focused** — one feature or fix per PR.
4. **Describe** what your PR does and why.

## Code Style

- TypeScript for all source code in `src/`.
- Use meaningful variable and function names.
- Add comments for non-obvious logic, especially around HID protocol and native execution.

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Your OS and app version

## License

By contributing, you agree that your contributions are provided under the [NODE Studio Source Available License](LICENSE).
