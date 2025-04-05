/* eslint-disable typescript/class-methods-use-this */

import { vi } from 'vitest'

let mockAppendLine = vi.fn()
let mockDispose = vi.fn()
let mockClear = vi.fn()
let mockShow = vi.fn()
let mockHide = vi.fn()
let mockReplace = vi.fn()
let mockAppend = vi.fn()

let mockOutputChannel = {
  onDidChangeLogLevel: vi.fn(),
  name: 'Mock Output Channel',
  appendLine: mockAppendLine,
  dispose: mockDispose,
  replace: mockReplace,
  append: mockAppend,
  clear: mockClear,
  logLevel: 'info',
  show: mockShow,
  hide: mockHide,
  trace: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

export class Position {
  public constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}

  public isBeforeOrEqual(): boolean {
    return false
  }

  public isAfterOrEqual(): boolean {
    return false
  }

  public isBefore(): boolean {
    return false
  }

  public isAfter(): boolean {
    return false
  }

  public isEqual(): boolean {
    return false
  }

  public translate(): this {
    return this
  }

  public with(): this {
    return this
  }
}

export class Range {
  public constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}

  public contains(_position: Position): boolean {
    return false
  }
}

export let window = {
  createOutputChannel: vi.fn().mockReturnValue(mockOutputChannel),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
}

export let workspace = {
  getConfiguration: vi.fn(),
  workspaceFolders: [],
}

export let TextDocument = vi.fn()

export default {
  TextDocument,
  workspace,
  Position,
  window,
  Range,
}

/* eslint-enable typescript/class-methods-use-this */
