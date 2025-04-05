import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import vscode from 'vscode'

import { getDependencyAtPosition } from '../../extension/utilities/get-dependency-at-position'

vi.mock('node:fs/promises')
vi.mock('node:path', async () => {
  let actual = await vi.importActual('node:path')
  return {
    ...actual,
    basename: vi.fn(),
  }
})
vi.mock('../../extension/utilities/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    init: vi.fn(),
    log: vi.fn(),
  },
}))

describe('getDependencyAtPosition', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return null for non-package.json files', async () => {
    let mockDocument = {
      uri: {
        fsPath: '/path/to/index.ts',
      },
    }

    vi.spyOn(path, 'basename').mockReturnValue('index.ts')

    let result = await getDependencyAtPosition(
      mockDocument as unknown as vscode.TextDocument,
      {} as vscode.Position,
    )

    expect(result).toBeNull()
  })

  it('should return dependency when position is within dependency range', async () => {
    let mockDependency = {
      type: 'dependencies' as const,
      name: 'test-package',
      version: '^1.0.0',
    }

    let originalModule = await import(
      '../../extension/utilities/get-dependency-at-position'
    )
    let spy = vi.spyOn(originalModule, 'getDependencyAtPosition')

    spy.mockResolvedValueOnce(mockDependency)

    let mockDocument = {
      uri: { fsPath: '/path/to/package.json' },
    } as unknown as vscode.TextDocument
    let mockPosition = new vscode.Position(2, 10)

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).not.toBeNull()
    expect(result?.name).toBe('test-package')
    expect(result?.version).toBe('^1.0.0')
    expect(result?.type).toBe('dependencies')

    spy.mockRestore()
  })

  it('should test error handling in fs.readFile', async () => {
    let mockDocument = {
      uri: {
        fsPath: '/path/to/package.json',
      },
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    vi.spyOn(path, 'basename').mockReturnValue('package.json')

    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Read error'))

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).toBeNull()
  })

  it('should test error handling in fs.readFile with string error', async () => {
    let mockDocument = {
      uri: {
        fsPath: '/path/to/package.json',
      },
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    vi.spyOn(path, 'basename').mockReturnValue('package.json')

    let error = 'Read error' as unknown as Error
    vi.mocked(fs.readFile).mockRejectedValueOnce(error)

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).toBeNull()
  })

  it('should return null when dependency range is found but does not contain position', async () => {
    let mockDocument = {
      getText: vi.fn().mockReturnValue(`{
  "dependencies": {
    "test-package": "^1.0.0"
  }
}`),
      positionAt: vi.fn().mockImplementation(() => new vscode.Position(2, 4)),
      uri: {
        fsPath: '/path/to/package.json',
      },
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    vi.spyOn(path, 'basename').mockReturnValue('package.json')

    vi.mocked(fs.readFile).mockResolvedValueOnce(`{
  "dependencies": {
    "test-package": "^1.0.0"
  }
}`)

    let execSpy = vi.spyOn(RegExp.prototype, 'exec')
    execSpy.mockReturnValueOnce({
      0: '"test-package": "^1.0.0"',
      index: 0,
    } as unknown as RegExpExecArray)

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).toBeNull()
  })

  it('should return null when dependency range is not found', async () => {
    let mockDocument = {
      getText: vi.fn().mockReturnValue(`{
  "dependencies": {
    test-package: ^1.0.0
  }
}`),
      uri: {
        fsPath: '/path/to/package.json',
      },
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(2, 10)

    vi.spyOn(path, 'basename').mockReturnValue('package.json')

    vi.mocked(fs.readFile).mockResolvedValueOnce(`{
  "dependencies": {
    "test-package": "^1.0.0"
  }
}`)

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).toBeNull()
  })

  it('should return null when no dependencies are found', async () => {
    let mockDocument = {
      uri: {
        fsPath: '/path/to/package.json',
      },
      getText: vi.fn().mockReturnValue(`{}`),
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    vi.spyOn(path, 'basename').mockReturnValue('package.json')

    vi.mocked(fs.readFile).mockResolvedValueOnce(`{}`)

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).toBeNull()
  })

  it('should handle unexpected errors in getDependencyAtPosition', async () => {
    let mockDocument = {
      getText: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error')
      }),
      uri: {
        fsPath: '/path/to/package.json',
      },
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    vi.spyOn(path, 'basename').mockReturnValue('package.json')

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).toBeNull()
  })

  it('should handle errors gracefully', async () => {
    let mockDocument = {
      uri: {
        fsPath: '/path/to/package.json',
      },
    } as unknown as vscode.TextDocument

    let mockPosition = new vscode.Position(0, 0)

    vi.spyOn(path, 'basename').mockReturnValue('package.json')

    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Read error'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).toBeNull()
  })

  it('should return dependency if position is inside range', async () => {
    let fileContent = `{
      "dependencies": {
        "test-package": "^1.0.0"
      }
    }`

    let mockPosition = new vscode.Position(2, 10)

    let mockDocument = {
      positionAt: vi.fn().mockReturnValue(new vscode.Position(2, 5)),
      getText: vi.fn().mockReturnValue(fileContent),
      uri: { fsPath: '/path/to/package.json' },
    } as unknown as vscode.TextDocument

    vi.spyOn(path, 'basename').mockReturnValue('package.json')
    vi.mocked(fs.readFile).mockResolvedValueOnce(fileContent)

    vi.spyOn(vscode.Range.prototype, 'contains').mockReturnValue(true)

    let result = await getDependencyAtPosition(mockDocument, mockPosition)

    expect(result).not.toBeNull()
    expect(result?.name).toBe('test-package')
    expect(result?.version).toBe('^1.0.0')
    expect(result?.type).toBe('dependencies')
  })
})
