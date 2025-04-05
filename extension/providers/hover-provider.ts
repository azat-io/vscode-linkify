import * as vscode from 'vscode'

import { getDependencyAtPosition } from '../utilities/get-dependency-at-position'
import { logger } from '../utilities/logger'

/**
 * Registers a hover provider for package.json dependencies.
 *
 * The hover provider shows information about the dependency under the cursor
 * and provides a link to execute the linkPackage command.
 *
 * @returns {vscode.Disposable} The disposable for the registered provider.
 */
export let hoverProvider = (): vscode.Disposable => {
  logger.info('Creating and registering hover provider')

  let selector: vscode.DocumentSelector = {
    pattern: '**/package.json',
    language: 'json',
  }

  let provider: vscode.HoverProvider = {
    /**
     * Provides hover information for dependencies in package.json.
     *
     * @param {vscode.TextDocument} document - The document in which the hover
     *   was invoked.
     * @param {vscode.Position} position - The position at which the hover was
     *   invoked.
     * @param {vscode.CancellationToken} _token - A cancellation token.
     * @returns {vscode.ProviderResult<vscode.Hover>} A hover or null.
     */
    provideHover: async (
      document: vscode.TextDocument,
      position: vscode.Position,
      _token: vscode.CancellationToken,
    ): Promise<vscode.Hover | null> => {
      logger.info(`provideHover called for ${document.fileName}`)

      if (document.fileName.endsWith('package.json')) {
        logger.info(
          `Document is package.json, position: ${position.line}:${
            position.character
          }`,
        )

        let dependency = await getDependencyAtPosition(document, position)

        if (dependency) {
          logger.info(
            `Found dependency: ${dependency.name} (${dependency.version})`,
          )

          let infoContent = new vscode.MarkdownString()

          infoContent.appendMarkdown(
            `**${dependency.name}** (${dependency.version})\n\n`,
          )
          infoContent.appendMarkdown(`Type: ${dependency.type}\n\n`)

          let linkContent = new vscode.MarkdownString(
            `[$(link) Link Package](command:linkify.linkPackage?${encodeURIComponent(
              JSON.stringify({
                version: dependency.version,
                name: dependency.name,
                type: dependency.type,
              }),
            )})`,
            true,
          )
          linkContent.isTrusted = true

          logger.info('Returning hover content')
          return new vscode.Hover([infoContent, linkContent])
        }
        logger.info('No dependency found at position')
      } else {
        logger.info('Document is not package.json')
      }

      return null
    },
  }

  logger.info('Provider created, registering with VS Code')

  return vscode.languages.registerHoverProvider(selector, provider)
}
