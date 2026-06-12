#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const TARGET_COMPONENTS = new Set(['Step', 'Tab', 'Accordion'])

function parseArgs(argv) {
  const parsed = {
    staged: false,
    diffRange: null,
    explicitFiles: [],
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--staged') {
      parsed.staged = true
      continue
    }

    if (arg === '--diff') {
      const range = argv[i + 1]
      if (!range) {
        throw new Error('Missing value for --diff')
      }
      parsed.diffRange = range
      i += 1
      continue
    }

    parsed.explicitFiles.push(arg)
  }

  return parsed
}

function listMdxFilesRecursive(dir) {
  const entries = readdirSync(dir)
  const files = []

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') {
      continue
    }

    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...listMdxFilesRecursive(fullPath))
      continue
    }

    if (fullPath.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }

  return files
}

function listMdxFilesFromGitDiff({ staged, diffRange }) {
  const args = ['diff']

  if (staged) {
    args.push('--cached')
  }

  args.push('--name-only', '--diff-filter=ACM')

  if (diffRange) {
    args.push(diffRange)
  }

  args.push('--', '*.mdx')

  const output = execFileSync('git', args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  }).trim()

  if (!output) {
    return []
  }

  return output
    .split('\n')
    .map((relativePath) => path.resolve(ROOT_DIR, relativePath))
    .filter((filePath) => filePath.endsWith('.mdx') && existsSync(filePath))
}

function resolveTargetFiles({ staged, diffRange, explicitFiles }) {
  if (explicitFiles.length > 0) {
    return explicitFiles
      .map((filePath) => path.resolve(ROOT_DIR, filePath))
      .filter((filePath) => filePath.endsWith('.mdx') && existsSync(filePath))
  }

  if (staged || diffRange) {
    return listMdxFilesFromGitDiff({ staged, diffRange })
  }

  return listMdxFilesRecursive(ROOT_DIR)
}

function getComponentRegions(lines) {
  const regions = []
  const stack = []
  const tokenRegex = /<\/?(Step|Tab|Accordion)\b[^>]*>/g

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    const tokens = [...line.matchAll(tokenRegex)]

    for (const token of tokens) {
      const tag = token[1]
      const rawToken = token[0]
      const isClose = rawToken.startsWith('</')
      const isSelfClosing = rawToken.endsWith('/>')

      if (!TARGET_COMPONENTS.has(tag) || isSelfClosing) {
        continue
      }

      if (!isClose) {
        stack.push({ tag, openLine: lineIndex })
        continue
      }

      let matchIndex = -1
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) {
          matchIndex = i
          break
        }
      }

      if (matchIndex === -1) {
        continue
      }

      const open = stack.splice(matchIndex, 1)[0]
      const start = open.openLine + 1
      const end = lineIndex - 1
      if (start <= end) {
        regions.push({ tag, start, end })
      }
    }
  }

  return regions
}

function isFenceDelimiter(line) {
  return /^\s*```/.test(line)
}

function isMarkdownBlockLine(line) {
  return (
    /^\s*\|.*\|\s*$/.test(line) ||
    /^\s*([-*+]|\d+\.)\s+/.test(line) ||
    /^\s*>\s+/.test(line) ||
    /^\s*#{1,6}\s+\S/.test(line)
  )
}

function isPotentiallyUnsafeIndentedBlock(lines, block) {
  if (block.start < 0 || block.start >= lines.length) {
    return false
  }

  return /^\s{4,}\S/.test(lines[block.start])
}

function findBlocksInRegion(lines, region) {
  const blocks = []
  let insideFence = false
  let fenceStart = -1
  let groupedStart = -1

  const flushGroupedBlock = (endIndex) => {
    if (groupedStart !== -1) {
      blocks.push({ start: groupedStart, end: endIndex })
      groupedStart = -1
    }
  }

  for (let lineIndex = region.start; lineIndex <= region.end; lineIndex += 1) {
    const line = lines[lineIndex]

    if (isFenceDelimiter(line)) {
      flushGroupedBlock(lineIndex - 1)

      if (!insideFence) {
        insideFence = true
        fenceStart = lineIndex
      } else {
        insideFence = false
        blocks.push({ start: fenceStart, end: lineIndex })
        fenceStart = -1
      }
      continue
    }

    if (insideFence) {
      continue
    }

    if (isMarkdownBlockLine(line)) {
      if (groupedStart === -1) {
        groupedStart = lineIndex
      }
      continue
    }

    flushGroupedBlock(lineIndex - 1)
  }

  if (insideFence && fenceStart !== -1) {
    blocks.push({ start: fenceStart, end: region.end })
  }

  if (groupedStart !== -1) {
    blocks.push({ start: groupedStart, end: region.end })
  }

  return blocks
}

function hasBlankBoundary(lines, block, region) {
  const hasBlankBefore =
    block.start - 1 >= region.start && lines[block.start - 1].trim() === ''
  const hasBlankAfter =
    block.end + 1 <= region.end && lines[block.end + 1].trim() === ''

  return { hasBlankBefore, hasBlankAfter }
}

function analyzeFile(filePath) {
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  const regions = getComponentRegions(lines)
  const issues = []

  for (const region of regions) {
    const blocks = findBlocksInRegion(lines, region)

    for (const block of blocks) {
      if (!isPotentiallyUnsafeIndentedBlock(lines, block)) {
        continue
      }

      const { hasBlankBefore, hasBlankAfter } = hasBlankBoundary(
        lines,
        block,
        region,
      )

      if (hasBlankBefore && hasBlankAfter) {
        continue
      }

      const reasons = []
      if (!hasBlankBefore) {
        reasons.push('missing blank line before block markdown')
      }
      if (!hasBlankAfter) {
        reasons.push('missing blank line after block markdown')
      }

      issues.push({
        lineNumber: block.start + 1,
        message: `${reasons.join(' and ')} inside <${region.tag}>`,
      })
    }
  }

  return issues
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetFiles = resolveTargetFiles(args)

  if (targetFiles.length === 0) {
    console.log('No MDX files to check.')
    process.exit(0)
  }

  const allIssues = []
  for (const filePath of targetFiles) {
    const issues = analyzeFile(filePath)
    for (const issue of issues) {
      allIssues.push({ filePath, ...issue })
    }
  }

  if (allIssues.length === 0) {
    console.log('MDX JSX block spacing check passed.')
    process.exit(0)
  }

  console.error('MDX JSX block spacing violations found:\n')
  for (const issue of allIssues) {
    const relativePath = path.relative(ROOT_DIR, issue.filePath)
    console.error(`${relativePath}:${issue.lineNumber} ${issue.message}`)
  }

  console.error(
    '\nFix: add an empty line before and after indented markdown block content inside Step/Tab/Accordion.',
  )
  process.exit(1)
}

main()
