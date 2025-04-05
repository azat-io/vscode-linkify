import type { ExtensionContext } from 'vscode'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LinkedPackage } from '../../extension/services/storage-service'

import { StorageService } from '../../extension/services/storage-service'

type StorageMap = Record<string, unknown>

let createMockContext = (
  initialStorage: LinkedPackage[] = [],
): ExtensionContext => {
  let storage: StorageMap = {}
  storage['linkedPackages'] = initialStorage

  return {
    globalState: {
      update: vi.fn((key: string, value: LinkedPackage[]) => {
        storage[key] = value
        return Promise.resolve()
      }),
      get: vi.fn(
        <T>(key: string, defaultValue: T): T =>
          (storage[key] as T) ?? defaultValue,
      ),
    },
  } as unknown as ExtensionContext
}

describe('storageService', () => {
  let storageService: StorageService
  let mockContext: ExtensionContext

  let testPackage: LinkedPackage = {
    linkedAt: '2025-03-30T10:00:00.000Z',
    localPath: '/path/to/test-package',
    packageName: 'test-package',
  }

  let anotherPackage: LinkedPackage = {
    localPath: '/path/to/another-package',
    linkedAt: '2025-03-30T11:00:00.000Z',
    packageName: 'another-package',
  }

  beforeEach(() => {
    mockContext = createMockContext()
    storageService = new StorageService(mockContext)
  })

  describe('getLinkedPackages', () => {
    it('should return empty array when no packages are stored', () => {
      let packages = storageService.getLinkedPackages()
      expect(packages).toEqual([])
      expect(mockContext.globalState.get).toHaveBeenCalledWith(
        'linkedPackages',
        [],
      )
    })

    it('should return array of stored packages', () => {
      let initialPackages = [testPackage]
      mockContext = createMockContext(initialPackages)
      storageService = new StorageService(mockContext)

      let packages = storageService.getLinkedPackages()
      expect(packages).toEqual(initialPackages)
      expect(mockContext.globalState.get).toHaveBeenCalledWith(
        'linkedPackages',
        [],
      )
    })
  })

  describe('saveLinkedPackage', () => {
    it('should add new package to storage', async () => {
      await storageService.saveLinkedPackage(testPackage)

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'linkedPackages',
        [testPackage],
      )
    })

    it('should update existing package in storage', async () => {
      await storageService.saveLinkedPackage(testPackage)

      let updatedPackage = { ...testPackage, localPath: '/updated/path' }
      await storageService.saveLinkedPackage(updatedPackage)

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'linkedPackages',
        [updatedPackage],
      )
    })

    it('should store multiple packages', async () => {
      await storageService.saveLinkedPackage(testPackage)
      await storageService.saveLinkedPackage(anotherPackage)

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'linkedPackages',
        [testPackage, anotherPackage],
      )
    })
  })

  describe('getLinkedPackage', () => {
    it('should return undefined when package is not found', () => {
      let result = storageService.getLinkedPackage('non-existent-package')
      expect(result).toBeUndefined()
    })

    it('should return package by name', async () => {
      await storageService.saveLinkedPackage(testPackage)
      await storageService.saveLinkedPackage(anotherPackage)

      let result = storageService.getLinkedPackage(testPackage.packageName)
      expect(result).toEqual(testPackage)
    })
  })

  describe('removeLinkedPackage', () => {
    it('should not modify storage when package is not found', async () => {
      await storageService.removeLinkedPackage('non-existent-package')

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'linkedPackages',
        [],
      )
    })

    it('should remove package from storage', async () => {
      await storageService.saveLinkedPackage(testPackage)
      await storageService.saveLinkedPackage(anotherPackage)

      await storageService.removeLinkedPackage(testPackage.packageName)

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'linkedPackages',
        [anotherPackage],
      )
    })
  })
})
