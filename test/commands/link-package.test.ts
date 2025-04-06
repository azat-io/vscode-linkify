import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as vscode from 'vscode'

import type { LinkPackageCommandArguments } from '../../extension/commands/link-package'

import { StorageService } from '../../extension/services/storage-service'
import { linkPackage } from '../../extension/commands/link-package'
import { npmLink } from '../../extension/utilities/npm-link'

vi.mock('../../extension/services/storage-service', () => ({
  StorageService: vi.fn(),
}))

vi.mock('../../extension/utilities/npm-link', () => ({
  npmLink: vi.fn(),
}))

vi.mock('vscode', async () => {
  let actual = await vi.importActual<typeof vscode>('vscode')

  return {
    ...actual,
    window: {
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      showOpenDialog: vi.fn(),
      showQuickPick: vi.fn(),
      withProgress: vi.fn(),
    },
    ProgressLocation: {
      SourceControl: 2,
      Notification: 1,
      Window: 3,
    },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
    },
    Uri: {
      file: vi.fn((path: string) => ({ fsPath: path })),
    },
    commands: {
      registerCommand: vi.fn(),
    },
  }
})

interface MockStorageService {
  removeLinkedPackage: ReturnType<typeof vi.fn>
  saveLinkedPackage: ReturnType<typeof vi.fn>
  getLinkedPackages: ReturnType<typeof vi.fn>
  getLinkedPackage: ReturnType<typeof vi.fn>
  context: vscode.ExtensionContext
}

describe('link-package', () => {
  let mockContext: vscode.ExtensionContext
  let mockStorageServiceInstance = {} as MockStorageService

  beforeEach(() => {
    vi.resetAllMocks()

    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext

    mockStorageServiceInstance = {
      removeLinkedPackage: vi.fn(),
      saveLinkedPackage: vi.fn(),
      getLinkedPackages: vi.fn(),
      getLinkedPackage: vi.fn(),
      context: mockContext,
    }
    vi.mocked(StorageService).mockImplementation(
      () => mockStorageServiceInstance as unknown as StorageService,
    )

    vi.mocked(vscode.commands.registerCommand).mockReturnValue({
      dispose: vi.fn(),
    } as vscode.Disposable)
  })

  it('should register the link package command', () => {
    let disposable = linkPackage(mockContext)

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'linkify.linkPackage',
      expect.any(Function),
    )

    expect(disposable).toBeDefined()
    expect(disposable.dispose).toBeDefined()
  })

  describe('command handler', () => {
    let commandHandler: (
      arguments_: LinkPackageCommandArguments,
    ) => Promise<void>
    let mockArguments: LinkPackageCommandArguments

    beforeEach(() => {
      linkPackage(mockContext)
      commandHandler = vi.mocked(vscode.commands.registerCommand).mock
        .calls[0]![1] as (
        arguments_: LinkPackageCommandArguments,
      ) => Promise<void>

      mockArguments = {
        name: 'test-package',
        type: 'dependencies',
        version: '1.0.0',
      }
    })

    it('should prompt for new path if "Choose new path" is selected', async () => {
      let mockSavedPackage = {
        linkedAt: '2023-01-01T00:00:00.000Z',
        localPath: '/mock/saved/path',
        packageName: 'test-package',
      }
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(
        mockSavedPackage,
      )

      vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
        description: 'Select a new directory for the package',
        label: 'Choose new path',
        value: 'new',
      } as vscode.QuickPickItem & { value: string })

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      vi.mocked(npmLink).mockResolvedValue({
        message: 'Package linked successfully',
        success: true,
      })

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )

      await commandHandler(mockArguments)

      expect(vscode.window.showOpenDialog).toHaveBeenCalledWith({
        title: 'Select the directory containing the package to link',
        openLabel: 'Select Package Directory',
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
      })

      expect(npmLink).toHaveBeenCalledWith({
        projectPath: '/mock/workspace',
        dependencyType: 'dependencies',
        packagePath: '/mock/new/path',
        packageName: 'test-package',
      })
    })

    it('should prompt for path if no saved package is available', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      vi.mocked(npmLink).mockResolvedValue({
        message: 'Package linked successfully',
        success: true,
      })

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )
      await commandHandler(mockArguments)

      expect(vscode.window.showOpenDialog).toHaveBeenCalledWith({
        title: 'Select the directory containing the package to link',
        openLabel: 'Select Package Directory',
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
      })

      expect(npmLink).toHaveBeenCalledWith({
        projectPath: '/mock/workspace',
        dependencyType: 'dependencies',
        packagePath: '/mock/new/path',
        packageName: 'test-package',
      })
    })

    it('should handle errors during linking', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      vi.mocked(npmLink).mockRejectedValue(new Error('Mock error'))

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )

      await commandHandler(mockArguments)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error linking package: Mock error',
      )
    })

    it('should handle errors during linking with string error', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      let error = 'Mock error' as unknown as Error

      vi.mocked(npmLink).mockRejectedValue(error)

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )

      await commandHandler(mockArguments)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error linking package: Mock error',
      )
    })

    it('should handle unsuccessful linking', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      vi.mocked(npmLink).mockResolvedValue({
        message: 'Failed to link package',
        success: false,
      })

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )

      await commandHandler(mockArguments)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to link package',
      )

      expect(
        mockStorageServiceInstance.saveLinkedPackage,
      ).not.toHaveBeenCalled()
    })

    it('should handle errors during saving linked package', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      vi.mocked(npmLink).mockResolvedValue({
        message: 'Package linked successfully',
        success: true,
      })

      mockStorageServiceInstance.saveLinkedPackage.mockRejectedValue(
        new Error('Save error'),
      )

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )

      await commandHandler(mockArguments)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error saving package link: Save error',
      )
    })

    it('should handle errors during saving linked package with string error', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      vi.mocked(npmLink).mockResolvedValue({
        message: 'Package linked successfully',
        success: true,
      })

      let error = 'Save error' as unknown as Error

      mockStorageServiceInstance.saveLinkedPackage.mockRejectedValue(error)

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )

      await commandHandler(mockArguments)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error saving package link: Save error',
      )
    })

    it('should use saved package path if available and selected', async () => {
      let mockSavedPackage = {
        linkedAt: '2023-01-01T00:00:00.000Z',
        localPath: '/mock/saved/path',
        packageName: 'test-package',
      }
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(
        mockSavedPackage,
      )

      vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
        description: 'Last linked: 2023-01-01T00:00:00.000Z',
        value: '/mock/saved/path',
        label: 'Use saved path',
      } as vscode.QuickPickItem & { value: string })

      vi.mocked(npmLink).mockResolvedValue({
        message: 'Package linked successfully',
        success: true,
      })

      vi.mocked(vscode.window.withProgress).mockImplementation(
        async (_options, callback) =>
          callback(
            {
              report: vi.fn(),
            },
            {
              onCancellationRequested: vi.fn(),
              isCancellationRequested: false,
            },
          ),
      )

      await commandHandler(mockArguments)

      expect(mockStorageServiceInstance.getLinkedPackage).toHaveBeenCalledWith(
        'test-package',
      )

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        [
          {
            description: `Last linked: ${mockSavedPackage.linkedAt}`,
            label: `Use saved path: ${mockSavedPackage.localPath}`,
            value: mockSavedPackage.localPath,
          },
          {
            description: 'Select a new directory for the package',
            label: 'Choose new path',
            value: 'new',
          },
        ],
        {
          placeHolder: 'Select an option for linking the package',
        },
      )

      expect(npmLink).toHaveBeenCalledWith({
        packagePath: '/mock/saved/path',
        projectPath: '/mock/workspace',
        dependencyType: 'dependencies',
        packageName: 'test-package',
      })

      expect(mockStorageServiceInstance.saveLinkedPackage).toHaveBeenCalledWith(
        {
          linkedAt: '2023-01-01T00:00:00.000Z',
          localPath: '/mock/saved/path',
          packageName: 'test-package',
        },
      )

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Package linked successfully',
      )
    })

    it('should do nothing if user cancels quick pick', async () => {
      let mockSavedPackage = {
        linkedAt: '2023-01-01T00:00:00.000Z',
        localPath: '/mock/saved/path',
        packageName: 'test-package',
      }
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(
        mockSavedPackage,
      )

      // eslint-disable-next-line no-undefined
      vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined)

      await commandHandler(mockArguments)

      expect(npmLink).not.toHaveBeenCalled()
    })

    it('should do nothing if user cancels open dialog', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      // eslint-disable-next-line no-undefined
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined)

      await commandHandler(mockArguments)

      expect(npmLink).not.toHaveBeenCalled()
    })

    it('should show error if no workspace folder is open', async () => {
      // eslint-disable-next-line no-undefined
      vi.mocked(vscode.workspace).workspaceFolders = undefined

      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      await commandHandler(mockArguments)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'No workspace folder is open',
      )

      expect(npmLink).not.toHaveBeenCalled()
    })

    it('should show error if workspace folder path cannot be determined', async () => {
      vi.mocked(vscode.workspace).workspaceFolders = [
        // eslint-disable-next-line no-undefined
        { uri: { fsPath: undefined } } as unknown as vscode.WorkspaceFolder,
      ]

      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: '/mock/new/path' } as vscode.Uri,
      ])

      await commandHandler(mockArguments)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Could not determine workspace path',
      )

      expect(npmLink).not.toHaveBeenCalled()
    })

    it('should handle empty result from showOpenDialog', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([])

      await commandHandler(mockArguments)

      expect(npmLink).not.toHaveBeenCalled()
    })

    it('should handle null fsPath from showOpenDialog result', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        { fsPath: null } as unknown as vscode.Uri,
      ])

      await commandHandler(mockArguments)

      expect(npmLink).not.toHaveBeenCalled()
    })

    it('should handle undefined fsPath property in Uri object', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
        // eslint-disable-next-line no-undefined
        { fsPath: undefined } as unknown as vscode.Uri,
      ])

      await commandHandler(mockArguments)

      expect(npmLink).not.toHaveBeenCalled()
    })

    it('should handle edge case in selectPackagePath function', async () => {
      mockStorageServiceInstance.getLinkedPackage.mockReturnValue(null)

      vi.mocked(vscode.window.showOpenDialog).mockImplementation(() => {
        let mockResult = [{}] as vscode.Uri[]
        // eslint-disable-next-line no-undefined
        Object.defineProperty(mockResult[0], 'fsPath', { value: undefined })
        return Promise.resolve(mockResult)
      })

      await commandHandler(mockArguments)

      expect(npmLink).not.toHaveBeenCalled()
    })
  })
})
