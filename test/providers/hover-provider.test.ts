import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as vscode from 'vscode'

import type { Dependency } from '../../extension/utilities/get-dependency-at-position'

import { getDependencyAtPosition } from '../../extension/utilities/get-dependency-at-position'
import { hoverProvider } from '../../extension/providers/hover-provider'
import { logger } from '../../extension/utilities/logger'

vi.mock('../../extension/utilities/get-dependency-at-position', () => ({
  getDependencyAtPosition: vi.fn(),
}))

vi.mock('../../extension/utilities/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('vscode', async () => {
  let actual = await vi.importActual<typeof vscode>('vscode')

  class MockMarkdownString {
    public isTrusted: boolean = false
    public value: string

    private constructor(value: string = '', isTrusted: boolean = false) {
      this.value = value
      this.isTrusted = isTrusted
    }

    public appendMarkdown(value: string): this {
      this.value += value
      return this
    }
  }

  class MockHover {
    public contents: (vscode.MarkdownString | string)[]
    public range?: vscode.Range

    private constructor(
      contents: vscode.MarkdownString[],
      range?: vscode.Range,
    ) {
      this.contents = contents
      this.range = range
    }
  }

  let mockRegisterHoverProvider = vi.fn().mockReturnValue({
    dispose: vi.fn(),
  })

  return {
    ...actual,
    languages: {
      ...actual.languages,
      registerHoverProvider: mockRegisterHoverProvider,
    },
    MarkdownString: MockMarkdownString,
    Hover: MockHover,
  }
})

describe('hoverProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should register the hover provider with VS Code', () => {
    let mockDisposable = { dispose: vi.fn() }
    vi.mocked(vscode.languages.registerHoverProvider).mockReturnValueOnce(
      mockDisposable as unknown as vscode.Disposable,
    )

    let disposable = hoverProvider()

    expect(vscode.languages.registerHoverProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: '**/package.json',
        language: 'json',
      }),
      expect.any(Object),
    )

    expect(disposable).toBe(mockDisposable)
    expect(disposable.dispose).toBeDefined()
  })

  it('should return null for non-package.json files', async () => {
    let capturedProvider: vscode.HoverProvider | null = null

    vi.mocked(vscode.languages.registerHoverProvider).mockImplementationOnce(
      (_selector, provider) => {
        capturedProvider = provider
        return { dispose: vi.fn() } as vscode.Disposable
      },
    )

    hoverProvider()

    expect(capturedProvider).not.toBeNull()

    let mockDocument = {
      uri: { fsPath: '/path/to/test.js' },
      fileName: 'test.js',
      getText: vi.fn(),
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    let result = await capturedProvider!.provideHover(
      mockDocument,
      mockPosition,
      {} as vscode.CancellationToken,
    )

    expect(result).toBeNull()
    expect(logger.info).toHaveBeenCalledWith('Document is not package.json')
  })

  it('should return null when no dependency is found at position', async () => {
    let capturedProvider: vscode.HoverProvider | null = null

    vi.mocked(vscode.languages.registerHoverProvider).mockImplementationOnce(
      (_selector, provider) => {
        capturedProvider = provider
        return { dispose: vi.fn() } as vscode.Disposable
      },
    )

    hoverProvider()

    expect(capturedProvider).not.toBeNull()

    let mockDocument = {
      uri: { fsPath: '/path/to/package.json' },
      fileName: 'package.json',
      getText: vi.fn(),
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    vi.mocked(getDependencyAtPosition).mockResolvedValueOnce(null)

    let result = await capturedProvider!.provideHover(
      mockDocument,
      mockPosition,
      {} as vscode.CancellationToken,
    )

    expect(result).toBeNull()
    expect(getDependencyAtPosition).toHaveBeenCalledWith(
      mockDocument,
      mockPosition,
    )
    expect(logger.info).toHaveBeenCalledWith('No dependency found at position')
  })

  it('should return hover information when dependency is found', async () => {
    let capturedProvider: vscode.HoverProvider | null = null

    vi.mocked(vscode.languages.registerHoverProvider).mockImplementationOnce(
      (_selector, provider) => {
        capturedProvider = provider
        return { dispose: vi.fn() } as vscode.Disposable
      },
    )

    hoverProvider()

    expect(capturedProvider).not.toBeNull()

    let mockDocument = {
      uri: { fsPath: '/path/to/package.json' },
      fileName: 'package.json',
      getText: vi.fn(),
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    let mockDependency: Dependency = {
      name: 'test-package',
      type: 'dependencies',
      version: '1.0.0',
    }

    vi.mocked(getDependencyAtPosition).mockResolvedValueOnce(mockDependency)

    let result = await capturedProvider!.provideHover(
      mockDocument,
      mockPosition,
      {} as vscode.CancellationToken,
    )

    expect(result).not.toBeNull()
    expect(result).toBeInstanceOf(vscode.Hover)

    let hover = result!
    expect(hover.contents).toHaveLength(2)

    let infoContent = hover.contents[0] as vscode.MarkdownString
    expect(infoContent.value).toContain('**test-package**')
    expect(infoContent.value).toContain('1.0.0')
    expect(infoContent.value).toContain('Type: dependencies')

    let linkContent = hover.contents[1] as vscode.MarkdownString
    expect(linkContent.value).toContain('Link Package')
    expect(linkContent.value).toContain('command:linkify.linkPackage')
    expect(linkContent.isTrusted).toBeTruthy()

    expect(getDependencyAtPosition).toHaveBeenCalledWith(
      mockDocument,
      mockPosition,
    )
    expect(logger.info).toHaveBeenCalledWith('Returning hover content')
  })
})
