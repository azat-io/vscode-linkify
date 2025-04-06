# VS Code Linkify

<img
  src="https://raw.githubusercontent.com/azat-io/vscode-linkify/main/assets/logo.png"
  alt="VS Code Linkify logo"
  align="right"
  height="140"
  width="140"
/>

[![Version](https://img.shields.io/visual-studio-marketplace/v/azat-io.vscode-linkify?color=2f73e7&labelColor=ffffff)](https://marketplace.visualstudio.com/items?itemName=azat-io.vscode-linkify)
[![Code Coverage](https://img.shields.io/codecov/c/github/azat-io/vscode-linkify.svg?color=2f73e7&labelColor=ffffff)](https://github.com/azat-io/vscode-linkify)
[![GitHub License](https://img.shields.io/badge/license-MIT-232428.svg?color=2f73e7&labelColor=ffffff)](https://github.com/azat-io/vscode-linkify/blob/main/license)

A VS Code extension that makes it super easy to link local npm packages to your project.

Link local npm packages directly from your editor without needing the terminal or memorizing complex commands.

## What is this extension for?

If you're developing multiple npm packages simultaneously or frequently testing changes in your libraries, you probably use these commands often:

```bash
npm link package-name
```

This can be inconvenient and time-consuming.

VS Code Linkify simplifies this process, allowing you to link packages directly from your editor without using the terminal or memorizing complex commands.

## Features

- **One-click linking.** Quickly link local npm packages.
- **Multiple package managers.** Automatically detects and supports npm, yarn, pnpm, and bun.
- **Remembers paths.** No need to repeatedly select package directories.
- **Hover integration.** Easily link packages by hovering over dependencies in `package.json`.
- **Smart error handling.** Automatically handles workspace dependency errors in pnpm projects.

## Installation

Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=azat-io.vscode-linkify) or search for "Linkify" in the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).

## How to use

Using this extension is very simple:

1. Open your project's `package.json`.
2. Hover over the dependency you want to link.
3. Click the "Link Package" button in the tooltip.
4. Select the directory of the local package.

The extension automatically completes the linking and notifies you upon successful completion!

<picture>
  <source
    srcset="https://raw.githubusercontent.com/azat-io/vscode-linkify/main/assets/demo-light.webp"
    media="(prefers-color-scheme: light)"
  />
  <source
    srcset="https://raw.githubusercontent.com/azat-io/vscode-linkify/main/assets/demo-dark.webp"
    media="(prefers-color-scheme: dark)"
  />
  <img
    src="https://raw.githubusercontent.com/azat-io/vscode-linkify/main/assets/demo-light.webp"
    alt="VS Code Linkify Demo"
  />
</picture>

## Use Cases

- **Monorepos:** easily test changes between different packages.
- **Library development:** instantly check how your library performs in your project.
- **Debugging dependencies:** quickly link local dependency versions for debugging.

## Troubleshooting

If you encounter any issues:

1. Make sure your package has a valid `package.json` file
2. Check that you have the necessary permissions to create symlinks
3. Verify that your package manager (npm, yarn, pnpm, or bun) is installed and accessible
4. **For pnpm workspace users:** If you encounter errors like `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` or issues with workspace dependencies, the extension will automatically try to use `pnpm add` as a fallback method

## Contributing

See [Contributing Guide](https://github.com/azat-io/vscode-linkify/blob/main/contributing.md).

You can also support this project by giving this repository a star on GitHub or rate this extension with five stars on [Marketplace](https://marketplace.visualstudio.com/items?itemName=azat-io.vscode-linkify).

## License

MIT &copy; [Azat S.](https://azat.io)
