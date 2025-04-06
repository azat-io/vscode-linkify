import type { DetectResult } from 'package-manager-detector'
import type { Stats } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detect } from 'package-manager-detector'
import cp from 'node:child_process'
import fs from 'node:fs/promises'

import { npmLink } from '../../extension/utilities/npm-link'

vi.mock('package-manager-detector')
vi.mock('node:child_process')
vi.mock('node:fs/promises')
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

describe('npmLink', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should link package to project successfully', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'npm',
      name: 'npm',
    })

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'npm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(fs.readFile).toHaveBeenCalledWith(
      '/path/to/package/package.json',
      'utf8',
    )
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should return error if package.json has no name field', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({}))

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(fs.readFile).toHaveBeenCalledWith(
      '/path/to/package/package.json',
      'utf8',
    )
    expect(result.success).toBeFalsy()
    expect(result.message).toContain('No package name found in package.json')
  })

  it('should return error if package name does not match', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'different-package-name' }),
    )

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(fs.readFile).toHaveBeenCalledWith(
      '/path/to/package/package.json',
      'utf8',
    )
    expect(result.success).toBeFalsy()
    expect(result.message).toContain(
      'Package name in package.json (different-package-name) does not match provided package name (package-name)',
    )
  })

  it('should handle yarn package manager correctly', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.22.0',
      agent: 'yarn',
      name: 'yarn',
    })

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'yarn link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'yarn link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle null result when detecting package manager and default to npm', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce(null)

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'npm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle result with null name when detecting package manager and default to npm', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.0.0',
      agent: 'npm',
      name: null,
    } as unknown as DetectResult)

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'npm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle error when detecting package manager and default to npm', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockRejectedValueOnce(new Error('Detection failed'))

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'npm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle error when detecting package manager and default to npm with string error', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    let error = 'Detection failed' as unknown as Error
    vi.mocked(detect).mockRejectedValueOnce(error)

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'npm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle string error when detecting package manager and default to npm', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockRejectedValueOnce('String error' as unknown as Error)

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'npm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle unknown package manager correctly (default to npm)', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      agent: 'unknown',
      version: '1.0.0',
      name: 'unknown',
    } as unknown as DetectResult)

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'npm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle bun package manager correctly', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.0.0',
      agent: 'bun',
      name: 'bun',
    })

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'bun link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'bun link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should handle pnpm package manager correctly', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'pnpm',
      name: 'pnpm',
    })

    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(null, 'pnpm link /path/to/package output', '')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(fs.stat).toHaveBeenCalledWith('/path/to/package')
    expect(fs.stat).toHaveBeenCalledWith('/path/to/package/package.json')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/path/to/project',
    })
    expect(cp.exec).toHaveBeenCalledWith(
      'pnpm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain(
      'Successfully linked package-name from /path/to/package to project at /path/to/project',
    )
  })

  it('should return error if package directory does not exist', async () => {
    vi.mocked(fs.stat).mockRejectedValueOnce(new Error('Directory not found'))

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
  })

  it('should return error if package directory does not exist with string error', async () => {
    let error = 'Directory not found' as unknown as Error
    vi.mocked(fs.stat).mockRejectedValueOnce(error)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
  })

  it('should return error if package path is not a directory', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({
      isDirectory: () => false,
    } as unknown as Stats)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Package directory does not exist')
  })

  it('should return error if package.json is not found', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
  })

  it('should return error if package.json is not a file', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => false } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('No package.json found')
  })

  it('should return error on command execution failure', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'npm',
      name: 'npm',
    })

    let error = new Error('Command failed')
    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(error, '', 'stderr output')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
    expect(result.error).toBeDefined()
  })

  it('should handle workspace error with "cannot find module" and "workspace:" message', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'pnpm',
      name: 'pnpm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('cannot find module with workspace: dependency'),
          '',
          'cannot find module with workspace: dependency',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'pnpm add --save /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'prod',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add when link fails with workspace error', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'pnpm',
      name: 'pnpm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'pnpm add --save /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'prod',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'pnpm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'pnpm add --save /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should handle normalizeDependencyType with undefined type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'npm',
      name: 'npm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'npm install --save /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'npm install --save /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
  })

  it('should handle normalizeDependencyType with unknown type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'npm',
      name: 'npm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'npm install --save /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      dependencyType: 'unknown-type',
      packageName: 'package-name',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'npm install --save /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
  })

  it('should handle unknown package manager in getAddCommand', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      agent: 'unknown-manager',
      name: 'unknown-manager',
      version: '1.0.0',
    } as unknown as DetectResult)

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'npm install --save-dev /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'dev',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'npm install --save-dev /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
  })

  it('should fallback to add with yarn package manager and peer dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.22.0',
      agent: 'yarn',
      name: 'yarn',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'yarn add --peer /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'peer',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'yarn link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'yarn add --peer /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with yarn package manager and optional dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.22.0',
      agent: 'yarn',
      name: 'yarn',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'yarn add --optional /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'optional',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'yarn link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'yarn add --optional /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with bun package manager and peer dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.0.0',
      agent: 'bun',
      name: 'bun',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'bun install --peer /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'peer',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'bun link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'bun install --peer /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with bun package manager and dev dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.0.0',
      agent: 'bun',
      name: 'bun',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'bun install --dev /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'dev',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'bun link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'bun install --dev /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with bun package manager and optional dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.0.0',
      agent: 'bun',
      name: 'bun',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'bun install /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      dependencyType: 'optionaldependencies',
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'bun link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'bun install /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with correct dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'pnpm',
      name: 'pnpm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'pnpm add --save-dev /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'dev',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'pnpm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'pnpm add --save-dev /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
  })

  it('should propagate non-workspace errors during link', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'pnpm',
      name: 'pnpm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(new Error('Some other error'), '', 'Some other error')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(cp.exec).toHaveBeenCalledTimes(1)
    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
  })

  it('should fallback to add with npm package manager and optional dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'npm',
      name: 'npm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          null,
          'npm install --save-optional /path/to/package output',
          '',
        )
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'optional',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'npm install --save-optional /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with npm package manager and peer dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'npm',
      name: 'npm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'npm install --save-peer /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      dependencyType: 'peerdependencies',
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'npm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'npm install --save-peer /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with pnpm package manager and optional dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'pnpm',
      name: 'pnpm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'pnpm add --save-optional /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'optional',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'pnpm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'pnpm add --save-optional /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with pnpm package manager and peer dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'pnpm',
      name: 'pnpm',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'pnpm add --save-peer /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'peer',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'pnpm link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'pnpm add --save-peer /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with bun package manager and prod dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.0.0',
      agent: 'bun',
      name: 'bun',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'bun install /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'prod',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'bun link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'bun install /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with yarn package manager and dev dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.22.0',
      agent: 'yarn',
      name: 'yarn',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'yarn add --dev /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      dependencyType: 'devdependencies',
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'yarn link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'yarn add --dev /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should fallback to add with yarn package manager and prod dependency type', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package' || filePath === '/path/to/project') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '1.22.0',
      agent: 'yarn',
      name: 'yarn',
    })

    let mockExec = vi.fn()
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(
          new Error('ERR_PNPM_WORKSPACE_PKG_NOT_FOUND'),
          '',
          'ERR_PNPM_WORKSPACE_PKG_NOT_FOUND',
        )
      },
    )
    mockExec.mockImplementationOnce(
      (
        _cmd,
        _options,
        callback: (
          error: Error | null,
          command: string,
          commandArguments: string,
        ) => void,
      ) => {
        callback(null, 'yarn add /path/to/package output', '')
      },
    )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
      dependencyType: 'prod',
    })

    expect(cp.exec).toHaveBeenCalledTimes(2)
    expect(cp.exec).toHaveBeenNthCalledWith(
      1,
      'yarn link /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(cp.exec).toHaveBeenNthCalledWith(
      2,
      'yarn add /path/to/package',
      { cwd: '/path/to/project', env: process.env },
      expect.any(Function),
    )
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('Successfully added')
    expect(result.message).toContain('fallback from link')
  })

  it('should return error on command execution failure with string error', async () => {
    vi.mocked(fs.stat).mockImplementation(filePath => {
      if (filePath === '/path/to/package') {
        return Promise.resolve({
          isDirectory: () => true,
        } as unknown as Stats)
      }
      if (filePath === '/path/to/package/package.json') {
        return Promise.resolve({ isFile: () => true } as unknown as Stats)
      }
      throw new Error('File not found')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({ name: 'package-name' }),
    )

    vi.mocked(detect).mockResolvedValueOnce({
      version: '8.0.0',
      agent: 'npm',
      name: 'npm',
    })

    let error = 'Command failed' as unknown as Error
    let mockExec = vi
      .fn()
      .mockImplementation(
        (
          _cmd,
          _options,
          callback: (
            error: Error | null,
            command: string,
            commandArguments: string,
          ) => void,
        ) => {
          callback(error, '', 'stderr output')
        },
      )
    vi.mocked(cp.exec).mockImplementation(mockExec)

    let result = await npmLink({
      packagePath: '/path/to/package',
      projectPath: '/path/to/project',
      packageName: 'package-name',
    })

    expect(result.success).toBeFalsy()
    expect(result.message).toBe(
      'Failed to create link: Command execution failed: \nstderr output',
    )
    expect(result.error).toBeDefined()
  })
})
