import type { LogOutputChannel } from 'vscode'

import {
  beforeEach,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import * as vscode from 'vscode'

import { logger } from '../../extension/utilities/logger'

let mockAppendLine = vi.fn()
let mockDispose = vi.fn()
let mockClear = vi.fn()

let mockOutputChannel = {
  appendLine: mockAppendLine,
  dispose: mockDispose,
  clear: mockClear,
} as unknown as LogOutputChannel

describe('logger', () => {
  let showInfoSpy: unknown
  let showWarnSpy: unknown
  let showErrorSpy: unknown

  beforeAll(() => {
    vi.spyOn(vscode.window, 'createOutputChannel').mockReturnValue(
      mockOutputChannel,
    )

    showInfoSpy = vi
      .spyOn(vscode.window, 'showInformationMessage')
      .mockResolvedValue({ title: 'test' })
    showWarnSpy = vi
      .spyOn(vscode.window, 'showWarningMessage')
      .mockResolvedValue({ title: 'test' })
    showErrorSpy = vi
      .spyOn(vscode.window, 'showErrorMessage')
      .mockResolvedValue({ title: 'test' })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should create an output channel when initialized', () => {
    logger.init()
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Linkify')
  })

  it('should log info message', () => {
    logger.info('Test info message')
    expect(mockAppendLine).toHaveBeenCalledTimes(1)
    expect(mockAppendLine).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] Test info message'),
    )
  })

  it('should log warning message', () => {
    logger.warn('Test warning message')
    expect(mockAppendLine).toHaveBeenCalledTimes(1)
    expect(mockAppendLine).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] Test warning message'),
    )
  })

  it('should log error message', () => {
    logger.error('Test error message')
    expect(mockAppendLine).toHaveBeenCalledTimes(1)
    expect(mockAppendLine).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] Test error message'),
    )
  })

  it('should log debug message', () => {
    logger.debug('Test debug message')
    expect(mockAppendLine).toHaveBeenCalledTimes(1)
    expect(mockAppendLine).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] Test debug message'),
    )
  })

  it('should log general message', () => {
    logger.log('Test', 'general', 'message')
    expect(mockAppendLine).toHaveBeenCalledTimes(1)
    expect(mockAppendLine).toHaveBeenCalledWith(
      expect.stringContaining('Test general message'),
    )
  })

  it('should show notification when notify flag is true', () => {
    logger.info('Test notification', true)
    expect(showInfoSpy).toHaveBeenCalledWith('Test notification')

    logger.warn('Test warning notification', true)
    expect(showWarnSpy).toHaveBeenCalledWith('Test warning notification')

    logger.error('Test error notification', true)
    expect(showErrorSpy).toHaveBeenCalledWith('Test error notification')
  })

  it('should not show notification when notify flag is false', () => {
    logger.info('Test without notification', false)
    expect(showInfoSpy).not.toHaveBeenCalled()

    logger.warn('Test without warning notification', false)
    expect(showWarnSpy).not.toHaveBeenCalled()

    logger.error('Test without error notification', false)
    expect(showErrorSpy).not.toHaveBeenCalled()
  })

  it('should include formatted date in log messages', () => {
    logger.info('Test date format')

    let dateRegex = /(?:\d{1,2}\/){2}\d{4}, \d{1,2}(?::\d{2}){2}/u
    expect(mockAppendLine).toHaveBeenCalledWith(
      expect.stringMatching(dateRegex),
    )
  })
})
