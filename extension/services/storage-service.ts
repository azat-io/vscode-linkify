import type { ExtensionContext } from 'vscode'

/** Interface for storing information about linked packages. */
export interface LinkedPackage {
  /** Name of the package. */
  packageName: string
  /** Path to the local version of the package. */
  localPath: string
  /** Date when the package was last linked. */
  linkedAt: string
}

/** Service for managing linked packages storage. */
export class StorageService {
  private static readonly STORAGE_KEY = 'linkedPackages'
  private readonly context: ExtensionContext

  /**
   * Creates a new instance of the StorageService.
   *
   * @param {ExtensionContext} context - Extension context used for storage
   *   access.
   */
  public constructor(context: ExtensionContext) {
    this.context = context
  }

  /**
   * Saves linked package information to storage.
   *
   * @param {LinkedPackage} packageInfo - Information about the package to save.
   * @returns {Promise<void>} Promise that resolves when the operation is
   *   complete.
   */
  public async saveLinkedPackage(packageInfo: LinkedPackage): Promise<void> {
    let linkedPackages = this.getLinkedPackages()
    let existingIndex = linkedPackages.findIndex(
      package_ => package_.packageName === packageInfo.packageName,
    )

    if (existingIndex === -1) {
      linkedPackages.push(packageInfo)
    } else {
      linkedPackages[existingIndex] = packageInfo
    }

    await this.context.globalState.update(
      StorageService.STORAGE_KEY,
      linkedPackages,
    )
  }

  /**
   * Removes linked package information from storage.
   *
   * @param {string} packageName - Name of the package to remove.
   * @returns {Promise<void>} Promise that resolves when the operation is
   *   complete.
   */
  public async removeLinkedPackage(packageName: string): Promise<void> {
    let linkedPackages = this.getLinkedPackages()
    let filteredPackages = linkedPackages.filter(
      package_ => package_.packageName !== packageName,
    )

    await this.context.globalState.update(
      StorageService.STORAGE_KEY,
      filteredPackages,
    )
  }

  /**
   * Retrieves information about a linked package by name.
   *
   * @param {string} packageName - Name of the package to retrieve.
   * @returns {LinkedPackage | undefined} Package information or undefined if
   *   not found.
   */
  public getLinkedPackage(packageName: string): LinkedPackage | undefined {
    let linkedPackages = this.getLinkedPackages()
    return linkedPackages.find(package_ => package_.packageName === packageName)
  }

  /**
   * Retrieves all linked packages from storage.
   *
   * @returns {LinkedPackage[]} Array of linked packages.
   */
  public getLinkedPackages(): LinkedPackage[] {
    return this.context.globalState.get<LinkedPackage[]>(
      StorageService.STORAGE_KEY,
      [],
    )
  }
}
