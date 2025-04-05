import fs from 'node:fs/promises'
import * as vscode from 'vscode'
import path from 'node:path'

import { logger } from './logger'

/** Interface representing a dependency in package.json. */
export interface Dependency {
  /** Type of dependency (dependencies, devDependencies, etc.). */
  type:
    | 'optionalDependencies'
    | 'peerDependencies'
    | 'devDependencies'
    | 'dependencies'
  /** Version of the dependency. */
  version: string
  /** Name of the dependency. */
  name: string
}

/**
 * Gets the range of a dependency in the document.
 *
 * @param {vscode.TextDocument} document - The document containing the
 *   dependency.
 * @param {string} dependencyName - The name of the dependency to find.
 * @returns {vscode.Range | undefined} The range of the dependency or undefined
 *   if not found.
 */
let getDependencyRange = (
  document: vscode.TextDocument,
  dependencyName: string,
): vscode.Range | null => {
  let text = document.getText()
  let dependencyRegex = new RegExp(
    `["']${dependencyName}["']\\s*:\\s*["']([^"']*)["']`,
    'g',
  )
  let match = dependencyRegex.exec(text)

  if (match) {
    let startPos = document.positionAt(match.index)
    let endPos = document.positionAt(match.index + match[0].length)
    return new vscode.Range(startPos, endPos)
  }

  logger.info(
    `No range found for dependency: ${dependencyName} in document: ${
      document.uri.fsPath
    }`,
  )
  return null
}

/**
 * Parses the package.json file and returns all dependencies.
 *
 * @param {string} packageJsonPath - Path to the package.json file.
 * @returns {Dependency[]} Array of dependencies.
 */
let parseDependencies = async (
  packageJsonPath: string,
): Promise<Dependency[]> => {
  logger.info(`Parsing dependencies from package.json: ${packageJsonPath}`)

  try {
    let content = await fs.readFile(packageJsonPath, 'utf8')
    let packageJson = JSON.parse(content) as Record<string, unknown>
    let dependencies: Dependency[] = []

    let dependencyTypes: (
      | 'optionalDependencies'
      | 'peerDependencies'
      | 'devDependencies'
      | 'dependencies'
    )[] = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]

    for (let type of dependencyTypes) {
      let deps = packageJson[type] as Record<string, string> | undefined
      if (deps) {
        logger.info(`Found ${type}: ${JSON.stringify(deps)}`)
        for (let [name, version] of Object.entries(deps)) {
          dependencies.push({
            version,
            name,
            type,
          })
        }
      }
    }

    logger.info(`Total dependencies found: ${dependencies.length}`)
    return dependencies
  } catch (error) {
    logger.error(
      `Error parsing package.json: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    return []
  }
}

/**
 * Checks if the position is within a dependency in the document.
 *
 * @param {vscode.TextDocument} document - The document to check.
 * @param {vscode.Position} position - The position to check.
 * @returns {Dependency | undefined} The dependency at the position or undefined
 *   if not found.
 */
export let getDependencyAtPosition = async (
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<Dependency | null> => {
  if (path.basename(document.uri.fsPath) !== 'package.json') {
    logger.info(`Document is not package.json: ${document.uri.fsPath}`)
    return null
  }

  let packageJsonPath = document.uri.fsPath
  logger.info(`Package.json path: ${packageJsonPath}`)

  let dependencies = await parseDependencies(packageJsonPath)
  logger.info(`Found ${dependencies.length} dependencies in package.json`)

  for (let dependency of dependencies) {
    let range = getDependencyRange(document, dependency.name)
    logger.info(`Checking if position is in range for ${dependency.name}`)

    if (range?.contains(position)) {
      logger.info(`Found dependency at position: ${dependency.name}`)
      return dependency
    }
  }

  logger.info('No dependency found at position')
  return null
}
