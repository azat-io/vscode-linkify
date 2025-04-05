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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
  })

  it('should return error if package directory does not exist with string error', async () => {
    let error = 'Directory not found' as unknown as Error
    vi.mocked(fs.stat).mockRejectedValueOnce(error)

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
  })

  it('should return error if package path is not a directory', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({
      isDirectory: () => false,
    } as unknown as Stats)

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

    expect(result.success).toBeFalsy()
    expect(result.message).toContain('Failed to create link')
    expect(result.error).toBeDefined()
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

    let result = await npmLink(
      '/path/to/package',
      '/path/to/project',
      'package-name',
    )

    expect(result.success).toBeFalsy()
    expect(result.message).toBe(
      'Failed to create link: Command execution failed: stderr output',
    )
    expect(result.error).toBeDefined()
  })
})
