import { detect } from 'package-manager-detector'
import cp from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { logger } from './logger'

/** Interface for link options. */
export interface LinkOptions {
  /** Type of dependency (dev, prod, peer, optional). */
  dependencyType?: string
  /** Name of the package to link. */
  packageName: string
  /** Path to the package to link. */
  packagePath: string
  /** Path to the current project. */
  projectPath: string
}

/** Interface for link operation result. */
export interface LinkResult {
  /** Whether the link operation was successful. */
  success: boolean
  /** Message describing the result of the operation. */
  message: string
  /** Error object if the operation failed. */
  error?: Error
}

/** Type for package manager commands */
type PackageManagerCommands = Record<
  PackageManager,
  Record<DependencyType, CommandGenerator>
>

/** Type for dependency types */
type DependencyType = 'optional' | 'peer' | 'prod' | 'dev'

/** Type for command generator function */
type CommandGenerator = (packagePath: string) => string

/** Type for package managers */
type PackageManager = 'yarn' | 'pnpm' | 'npm' | 'bun'

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
        reject(new Error(`Command execution failed: ${stdout}\n${stderr}`))
        return
      }

      resolve(stdout.trim())
    })
  })

/**
 * Normalizes the dependency type to a standard format.
 *
 * @param {string} dependencyType - The dependency type to normalize.
 * @returns {string} Normalized dependency type.
 */
let normalizeDependencyType = (dependencyType: string = 'prod'): string => {
  let lowerType = dependencyType.toLowerCase()

  switch (lowerType) {
    case 'optionaldependencies':
    case 'optional': {
      return 'optional'
    }
    case 'peerdependencies':
    case 'peer': {
      return 'peer'
    }
    case 'devdependencies':
    case 'dev': {
      return 'dev'
    }
    default: {
      return 'prod'
    }
  }
}

/** Command templates for different package managers and dependency types. */
let packageManagerCommands: PackageManagerCommands = {
  npm: {
    optional: (packagePath: string) =>
      `npm install --save-optional ${packagePath}`,
    peer: (packagePath: string) => `npm install --save-peer ${packagePath}`,
    dev: (packagePath: string) => `npm install --save-dev ${packagePath}`,
    prod: (packagePath: string) => `npm install --save ${packagePath}`,
  },
  pnpm: {
    optional: (packagePath: string) =>
      `pnpm add --save-optional ${packagePath}`,
    peer: (packagePath: string) => `pnpm add --save-peer ${packagePath}`,
    dev: (packagePath: string) => `pnpm add --save-dev ${packagePath}`,
    prod: (packagePath: string) => `pnpm add --save ${packagePath}`,
  },
  bun: {
    peer: (packagePath: string) => `bun install --peer ${packagePath}`,
    dev: (packagePath: string) => `bun install --dev ${packagePath}`,
    optional: (packagePath: string) => `bun install ${packagePath}`,
    prod: (packagePath: string) => `bun install ${packagePath}`,
  },
  yarn: {
    optional: (packagePath: string) => `yarn add --optional ${packagePath}`,
    peer: (packagePath: string) => `yarn add --peer ${packagePath}`,
    dev: (packagePath: string) => `yarn add --dev ${packagePath}`,
    prod: (packagePath: string) => `yarn add ${packagePath}`,
  },
}

/**
 * Gets the appropriate add command for the given package manager and dependency
 * type.
 *
 * @param {string} packageManager - The package manager to use.
 * @param {string} packagePath - Path to the package.
 * @param {string} dependencyType - Type of dependency (dev, prod, peer,
 *   optional).
 * @returns {string} The add command for the package manager.
 */
let getAddCommand = (
  packageManager: string,
  packagePath: string,
  dependencyType: string,
): string => {
  let normalizedType = normalizeDependencyType(dependencyType) as DependencyType
  let manager = packageManager as PackageManager

  if (!(manager in packageManagerCommands)) {
    manager = 'npm'
  }

  return packageManagerCommands[manager][normalizedType](packagePath)
}

/**
 * Checks if an error is related to workspace dependencies.
 *
 * @param {Error} error - The error to check.
 * @returns {boolean} Whether the error is related to workspace dependencies.
 */
let isWorkspaceError = (error: Error): boolean => {
  let errorMessage = error.message.toLowerCase()
  return (
    errorMessage.includes('workspace') ||
    errorMessage.includes('err_pnpm_workspace_pkg_not_found')
  )
}

/**
 * Validates the package directory and package.json. Checks if the package
 * directory exists, if package.json exists and is a file, if package.json has a
 * name field, and if the package name matches.
 *
 * @param {string} packagePath - Path to the package directory.
 * @param {string} packageName - Expected name of the package.
 * @returns {Promise<LinkResult | null>} Error result if validation fails, null
 *   if validation passes.
 */
let validatePackage = async (
  packagePath: string,
  packageName: string,
): Promise<LinkResult | null> => {
  try {
    let packagePathStats = await fs.stat(packagePath)
    let isPackagePathDirectory = packagePathStats.isDirectory()

    if (!isPackagePathDirectory) {
      return {
        message: `Package directory does not exist: ${packagePath}`,
        success: false,
      }
    }

    let packageJsonPath = path.join(packagePath, 'package.json')
    let packageJsonStats = await fs.stat(packageJsonPath)
    let isPackageJsonFile = packageJsonStats.isFile()

    if (!isPackageJsonFile) {
      return {
        message: `No package.json found in: ${packagePath}`,
        success: false,
      }
    }

    let packageJsonContent = await fs.readFile(packageJsonPath, 'utf8')
    let packageJson = JSON.parse(packageJsonContent) as { name?: string }

    if (!packageJson.name) {
      return {
        message: `No package name found in package.json: ${packageJsonPath}`,
        success: false,
      }
    }

    if (packageJson.name !== packageName) {
      return {
        message: `Package name in package.json (${
          packageJson.name
        }) does not match provided package name (${packageName})`,
        success: false,
      }
    }

    return null
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

/**
 * Creates a link command for the given package manager.
 *
 * @param {string} packageManager - The package manager to use (npm, yarn, pnpm,
 *   bun).
 * @param {string} packagePath - Path to the package directory to link.
 * @returns {string} The formatted link command for the specified package
 *   manager.
 */
let createLinkCommand = (
  packageManager: string,
  packagePath: string,
): string => {
  switch (packageManager) {
    case 'yarn':
      return `yarn link ${packagePath}`
    case 'pnpm':
      return `pnpm link ${packagePath}`
    case 'bun':
      return `bun link ${packagePath}`
    default:
      return `npm link ${packagePath}`
  }
}

/** Options for executing link with fallback */
interface LinkWithFallbackOptions {
  /** The package manager to use (npm, yarn, pnpm, bun) */
  packageManager: string
  /** Type of dependency (dev, prod, peer, optional) */
  dependencyType: string
  /** Path to the package directory to link */
  packagePath: string
  /** Path to the project directory where the package will be linked */
  projectPath: string
  /** Name of the package to link */
  packageName: string
}

/**
 * Executes the link command with fallback to add if needed. Attempts to link
 * the package first, and if that fails with a workspace error, falls back to
 * adding the package as a dependency.
 *
 * @param {LinkWithFallbackOptions} options - Options for the link operation.
 * @returns {Promise<LinkResult>} Result of the link operation.
 */
let executeLinkWithFallback = async (
  options: LinkWithFallbackOptions,
): Promise<LinkResult> => {
  let {
    packageManager,
    dependencyType,
    packagePath,
    projectPath,
    packageName,
  } = options
  let linkCommand = createLinkCommand(packageManager, packagePath)
  logger.info(`Command to link package: ${linkCommand}`)

  try {
    let output = await executeCommand(linkCommand, projectPath)
    return {
      message: `Successfully linked ${packageName} from ${packagePath} to project at ${projectPath}\n${output}`,
      success: true,
    }
  } catch (linkError) {
    if (linkError instanceof Error && isWorkspaceError(linkError)) {
      logger.info(`Link failed with workspace error, trying add as fallback`)

      let addCommand = getAddCommand(
        packageManager,
        packagePath,
        dependencyType,
      )
      logger.info(`Fallback command to add package: ${addCommand}`)

      let output = await executeCommand(addCommand, projectPath)
      return {
        message: `Successfully added ${packageName} from ${packagePath} to project at ${projectPath} (fallback from link)\n${output}`,
        success: true,
      }
    }

    throw linkError
  }
}

/**
 * Performs a complete link operation: creates a link for the package and links
 * it to the project. Falls back to add if link fails due to workspace
 * dependencies.
 *
 * @param {LinkOptions} options - Options for the link operation.
 * @returns {Promise<LinkResult>} Result of the link operation.
 */
export let npmLink = async (options: LinkOptions): Promise<LinkResult> => {
  let {
    dependencyType = 'prod',
    packageName,
    packagePath,
    projectPath,
  } = options

  try {
    let validationResult = await validatePackage(packagePath, packageName)
    if (validationResult) {
      return validationResult
    }

    let packageManager = await detectPackageManager(projectPath)

    return await executeLinkWithFallback({
      packageManager,
      dependencyType,
      packagePath,
      projectPath,
      packageName,
    })
  } catch (error) {
    let errorValue = error as Error
    return {
      message: `Failed to create link: ${errorValue.message}`,
      error: errorValue,
      success: false,
    }
  }
}
