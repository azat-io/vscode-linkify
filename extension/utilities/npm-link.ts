import { detect } from 'package-manager-detector'
import cp from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { logger } from './logger'

/** Interface for link operation result. */
export interface LinkResult {
  /** Whether the link operation was successful. */
  success: boolean
  /** Message describing the result of the operation. */
  message: string
  /** Error object if the operation failed. */
  error?: Error
}

/**
 * Detects the package manager used in the project.
 *
 * @param {string} projectPath - Path to the project.
 * @returns {Promise<string>} Detected package manager (npm, yarn, pnpm).
 */
let detectPackageManager = async (projectPath: string): Promise<string> => {
  try {
    let result = await detect({ cwd: projectPath })
    return result?.name ?? 'npm'
  } catch (error) {
    logger.error(
      `Error detecting package manager: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    return 'npm'
  }
}

/**
 * Executes a command in a specific directory.
 *
 * @param {string} command - Command to execute.
 * @param {string} cwd - Working directory.
 * @returns {Promise<string>} Command output.
 */
let executeCommand = (command: string, cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    logger.info(`Executing command: "${command}" in directory: ${cwd}`)

    cp.exec(command, { env: process.env, cwd }, (error, stdout, stderr) => {
      if (stdout) {
        logger.info(`Error executing command stdout: ${stdout.trim()}`)
      }
      if (stderr) {
        logger.error(`Error executing command stderr: ${stderr.trim()}`)
      }

      if (error) {
        logger.error(`Command execution error: ${error.message}`)
        reject(new Error(`Command execution failed: ${stderr}`))
        return
      }

      resolve(stdout.trim())
    })
  })

/**
 * Performs a complete link operation: creates a link for the package and links
 * it to the project.
 *
 * @param {string} packagePath - Path to the package to link.
 * @param {string} projectPath - Path to the current project.
 * @param {string} packageName - Name of the package to link.
 * @returns {Promise<LinkResult>} Result of the link operation.
 */
export let npmLink = async (
  packagePath: string,
  projectPath: string,
  packageName: string,
): Promise<LinkResult> => {
  try {
    if (!(await fs.stat(packagePath)).isDirectory()) {
      return {
        message: `Package directory does not exist: ${packagePath}`,
        success: false,
      }
    }

    let packageJsonPath = path.join(packagePath, 'package.json')
    if (!(await fs.stat(packageJsonPath)).isFile()) {
      return {
        message: `No package.json found in: ${packagePath}`,
        success: false,
      }
    }

    let packageManager = await detectPackageManager(projectPath)

    let linkCommand = ''
    switch (packageManager) {
      case 'yarn':
        linkCommand = `yarn link ${packagePath}`
        break
      case 'pnpm':
        linkCommand = `pnpm link ${packagePath}`
        break
      case 'bun':
        linkCommand = `bun link ${packagePath}`
        break
      default:
        linkCommand = `npm link ${packagePath}`
        break
    }

    logger.info(`Command to link package: ${linkCommand}`)

    let output = await executeCommand(linkCommand, projectPath)

    return {
      message: `Successfully linked ${packageName} from ${packagePath} to project at ${projectPath}\n${output}`,
      success: true,
    }
  } catch (error) {
    return {
      message: `Failed to create link: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: error instanceof Error ? error : new Error(String(error)),
      success: false,
    }
  }
}
