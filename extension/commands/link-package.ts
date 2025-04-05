import * as vscode from 'vscode'

import { StorageService } from '../services/storage-service'
import { npmLink } from '../utilities/npm-link'

/** Interface for link package command arguments. */
export interface LinkPackageCommandArguments {
  /** Version of the package. */
  version: string
  /** Name of the package to link. */
  name: string
  /** Type of dependency. */
  type: string
}

/**
 * Registers the link package command and returns a disposable.
 *
 * This function registers a command that allows linking a package from a local
 * directory to the current project. It handles selecting the package directory,
 * linking the package, and saving the link information for future use.
 *
 * @param {vscode.ExtensionContext} context - The extension context.
 * @returns {vscode.Disposable} The disposable for the registered command.
 */
export let linkPackage = (
  context: vscode.ExtensionContext,
): vscode.Disposable =>
  vscode.commands.registerCommand(
    'linkify.linkPackage',
    async (arguments_: LinkPackageCommandArguments) => {
      await handleLinkPackage(context, arguments_)
    },
  )

/**
 * Handles the link package command.
 *
 * @param {vscode.ExtensionContext} context - The extension context.
 * @param {LinkPackageCommandArguments} arguments_ - The command arguments.
 * @returns {Promise<void>} Promise that resolves when the command is complete.
 */
let handleLinkPackage = async (
  context: vscode.ExtensionContext,
  arguments_: LinkPackageCommandArguments,
): Promise<void> => {
  let storageService = new StorageService(context)
  let packageName = arguments_.name

  let savedPackage = storageService.getLinkedPackage(packageName)
  let packagePath: string | null = null

  if (savedPackage) {
    let choice = await vscode.window.showQuickPick(
      [
        {
          description: `Last linked: ${savedPackage.linkedAt}`,
          label: `Use saved path: ${savedPackage.localPath}`,
          value: savedPackage.localPath,
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

    if (!choice) {
      return
    }

    if (choice.value === 'new') {
      packagePath = await selectPackagePath()
    } else {
      packagePath = choice.value
    }
  } else {
    packagePath = await selectPackagePath()
  }

  if (!packagePath) {
    return
  }

  let { workspaceFolders } = vscode.workspace
  if (!workspaceFolders || workspaceFolders.length === 0) {
    await vscode.window.showErrorMessage('No workspace folder is open')
    return
  }

  let projectPath = workspaceFolders[0]?.uri.fsPath
  if (!projectPath) {
    await vscode.window.showErrorMessage('Could not determine workspace path')
    return
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Linking package ${packageName}...`,
      cancellable: false,
    },
    async progress => {
      progress.report({ increment: 0 })

      try {
        let result = await npmLink(packagePath, projectPath, packageName)

        progress.report({ increment: 100 })

        if (result.success) {
          try {
            await storageService.saveLinkedPackage({
              linkedAt: new Date().toISOString(),
              localPath: packagePath,
              packageName,
            })
            void vscode.window.showInformationMessage(result.message)
          } catch (error) {
            void vscode.window.showErrorMessage(
              `Error saving package link: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
          }
        } else {
          void vscode.window.showErrorMessage(result.message)
        }
      } catch (error) {
        void vscode.window.showErrorMessage(
          `Error linking package: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    },
  )
}

/**
 * Prompts the user to select a package path.
 *
 * @returns {Promise<string | null>} The selected path or null if cancelled.
 */
let selectPackagePath = async (): Promise<string | null> => {
  let options: vscode.OpenDialogOptions = {
    title: 'Select the directory containing the package to link',
    openLabel: 'Select Package Directory',
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
  }

  let result = await vscode.window.showOpenDialog(options)
  if (!result || result.length === 0) {
    return null
  }
  return result[0]?.fsPath ?? null
}
