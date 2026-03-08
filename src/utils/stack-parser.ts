export interface StackFrame {
  func: string
  file: string
  line: number
  col: number
}

const CHROME_STACK_RE = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/

export function parseStack(stack: string | undefined | null): StackFrame[] {
  if (!stack) return []

  return stack
    .split('\n')
    .map((line) => {
      const match = CHROME_STACK_RE.exec(line)
      if (!match) return null
      return {
        func: match[1] || '<anonymous>',
        file: match[2],
        line: Number.parseInt(match[3], 10),
        col: Number.parseInt(match[4], 10),
      }
    })
    .filter((frame): frame is StackFrame => frame !== null)
}
