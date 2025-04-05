import type * as vscode from 'vscode'

import { hoverProvider } from './providers/hover-provider'
import { linkPackage } from './commands/link-package'
import { logger } from './utilities/logger'

/**
 * Activates the extension.
 *
 * @param {vscode.ExtensionContext} context - The extension context.
 * @returns {void} Nothing.
 */
export let activate = (context: vscode.ExtensionContext): void => {
  logger.init()

  let linkPackageCommandDisposable = linkPackage(context)
  context.subscriptions.push(linkPackageCommandDisposable)
  logger.info('Link package command registered')

  let packageHoverProviderDisposable = hoverProvider()
  context.subscriptions.push(packageHoverProviderDisposable)
  logger.info('Package hover provider registered')

  logger.info('Package Linker activated successfully')
}

/**
 * Deactivates the extension.
 *
 * @returns {void} Nothing.
 */
export let deactivate = (): void => {}
