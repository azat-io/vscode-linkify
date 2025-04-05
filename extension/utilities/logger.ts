import * as vscode from 'vscode'

/** Interface for the main logger. */
interface Logger {
  /**
   * Log an error message.
   *
   * @param {string} message - Message to log.
   * @param {boolean} [notify] - Whether to show notification.
   * @returns {void} Nothing.
   */
  error(message: string, notify?: boolean): void

  /**
   * Log an info message.
   *
   * @param {string} message - Message to log.
   * @param {boolean} [notify] - Whether to show notification.
   * @returns {void} Nothing.
   */
  info(message: string, notify?: boolean): void

  /**
   * Log a warning message.
   *
   * @param {string} message - Message to log.
   * @param {boolean} [notify] - Whether to show notification.
   * @returns {void} Nothing.
   */
  warn(message: string, notify?: boolean): void

  /**
   * General log method.
   *
   * @param {unknown[]} arguments_ - Messages to log.
   * @returns {void} Nothing.
   */
  log(...arguments_: unknown[]): void

  /**
   * Log a debug message.
   *
   * @param {string} message - Message to log.
   * @returns {void} Nothing.
   */
  debug(message: string): void

  /**
   * Initialize the logger and create output channel.
   *
   * @returns {void} Nothing.
   */
  init(): void
}

let outputChannel: vscode.OutputChannel | undefined

/**
 * Formats current date and time in a readable format.
 *
 * @returns {string} Formatted date string.
 */
let getFormattedDate = (): string =>
  new Intl.DateTimeFormat('en-US', {
    minute: 'numeric',
    second: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    day: 'numeric',
    hour12: false,
  }).format(new Date())

/**
 * Gets or creates VS Code output channel.
 *
 * @returns {vscode.OutputChannel} VS Code output channel instance.
 */
let getOutputChannel = (): vscode.OutputChannel => {
  outputChannel ??= vscode.window.createOutputChannel('Package Linker')
  return outputChannel
}

/**
 * Shows a VS Code information message and explicitly handles the promise.
 *
 * @param {string} message - Message to show.
 * @returns {void} Nothing.
 */
let showInformationMessage = (message: string): void => {
  void vscode.window.showInformationMessage(message)
}

/**
 * Shows a VS Code warning message and explicitly handles the promise.
 *
 * @param {string} message - Message to show.
 * @returns {void} Nothing.
 */
let showWarningMessage = (message: string): void => {
  void vscode.window.showWarningMessage(message)
}

/**
 * Shows a VS Code error message and explicitly handles the promise.
 *
 * @param {string} message - Message to show.
 * @returns {void} Nothing.
 */
let showErrorMessage = (message: string): void => {
  void vscode.window.showErrorMessage(message)
}

/**
 * Logger for the Package Linker extension.
 *
 * @example
 *   // Initialize the logger
 *   logger.init()
 *
 *   // Log messages
 *   logger.info('Processing started')
 *   logger.error('Failed to load file')
 */
export let logger: Logger = {
  /**
   * Log an info message.
   *
   * @param {string} message - Message to log.
   * @param {boolean} [notify] - Whether to show notification.
   * @returns {void} Nothing.
   */
  info: (message: string, notify = false): void => {
    let channel = getOutputChannel()
    channel.appendLine(`${getFormattedDate()}: [INFO] ${message}`)

    if (notify) {
      showInformationMessage(message)
    }
  },

  /**
   * Log a warning message.
   *
   * @param {string} message - Message to log.
   * @param {boolean} [notify] - Whether to show notification.
   * @returns {void} Nothing.
   */
  warn: (message: string, notify = false): void => {
    let channel = getOutputChannel()
    channel.appendLine(`${getFormattedDate()}: [WARN] ${message}`)

    if (notify) {
      showWarningMessage(message)
    }
  },

  /**
   * Log an error message.
   *
   * @param {string} message - Message to log.
   * @param {boolean} [notify] - Whether to show notification.
   * @returns {void} Nothing.
   */
  error: (message: string, notify = false): void => {
    let channel = getOutputChannel()
    channel.appendLine(`${getFormattedDate()}: [ERROR] ${message}`)

    if (notify) {
      showErrorMessage(message)
    }
  },

  /**
   * General log method (similar to original console.log).
   *
   * @param {unknown[]} arguments_ - Messages to log.
   * @returns {void} Nothing.
   */
  log: (...arguments_: unknown[]): void => {
    let channel = getOutputChannel()
    channel.appendLine(`${getFormattedDate()}: ${arguments_.join(' ')}`)
  },

  /**
   * Log a debug message.
   *
   * @param {string} message - Message to log.
   * @returns {void} Nothing.
   */
  debug: (message: string): void => {
    let channel = getOutputChannel()
    channel.appendLine(`${getFormattedDate()}: [DEBUG] ${message}`)
  },

  /**
   * Initialize the logger and create output channel.
   *
   * @returns {void} Nothing.
   */
  init: (): void => {
    let channel = getOutputChannel()
    channel.appendLine(`${getFormattedDate()}: Package Linker initialized`)
  },
}
