# ts-module-isolation

A TypeScript implementation of [fumieval/OrderOrder](https://github.com/fumieval/OrderOrder) for analysing module dependencies and preventing jumbling of directories.

## TL;DR

Try running `npx ts-module-isolation` in your project directory and you'll see what this is about.

## Overview

ts-module-isolation analyses TypeScript/JavaScript codebases to ensure directory dependencies form a directed acyclic graph (DAG). When a module in one directory imports from another directory, it can be thought of as a dependency relationship between those directories. Aligning these dependencies helps maintain clean, logical module hierarchies by detecting circular dependencies.

## Features

- **Dependency Analysis**: Analyses TypeScript/JavaScript imports to build module dependency graphs
- **Circular Dependency Detection**: Identifies feedback arcs that create cycles in module dependencies
- **Multiple Output Formats**: Supports text reports, JSON output, and Dot graph visualization
- **Detailed Reporting**: Provides actionable insights and recommendations for code organisation

## Installation

```bash
npm install ts-module-isolation
```

### Development Installation

```bash
git clone <repository-url>
cd ts-module-isolation
npm install
npm run build
```

## Usage

### CLI

```bash
# Analyse current directory (default)
npx ts-module-isolation

# Analyse specific directories
npx ts-module-isolation src/

# Multiple directories
npx ts-module-isolation src/ lib/

# Output to file
npx ts-module-isolation src/ -o report.txt

# Generate Dot graph to stdout
npx ts-module-isolation src/ --dot

# JSON output
npx ts-module-isolation src/ --json

# Verbose mode
npx ts-module-isolation src/ --verbose

# Exclude directories matching patterns
npx ts-module-isolation --exclude "test/**" --exclude "**/*.spec.ts"

# Multiple exclude patterns
npx ts-module-isolation src/ --exclude "node_modules/**" --exclude "dist/**"
```

## What it Detects

1. **Circular dependencies** between directories
2. **Feedback arcs** - edges that need to be removed to make the dependency graph acyclic  
3. **Module hierarchy violations** - when modules import in ways that break logical structure

## Example Output

```
ts-module-isolation Analysis Report
========================

Total modules analysed: 25
Total imports analysed: 45
Directories found: 5
Dependency violations found: 2
Feedback arcs detected: 1

❌ Directory dependencies contain cycles

Feedback Arc Set (edges to remove to make graph acyclic):
--------------------------------------------------------
ui/components -> core/utils
  ui/components/Button:15 imports core/utils/theme (import)
  ui/layouts/Header:8 imports core/config/settings (import)

Recommendations:
---------------
1. Consider restructuring modules to eliminate circular dependencies
2. Move shared code to a common base module
3. Use dependency injection to break tight coupling
4. Consider splitting large modules into smaller, focused ones
```

## Module Directory Rules

ts-module-isolation enforces the principle that if a module in directory `ui/components` imports from `core/utils`, then no module in `core/utils` should import from any module in `ui/components`. This ensures:

- Clear separation of concerns between directories
- Logical dependency hierarchies  
- Prevention of circular dependencies between module directories
- Maintainable code structure

**Directory prefixes are determined by directory structure:**
- `ui/components/Button.ts` → prefix: `ui/components` (directory)
- `src/parser.ts` → prefix: `src` (directory)
- `globals.ts` (in root) → prefix: `globals` (individual file)
- `index.ts` (in root) → prefix: `index` (individual file)

## Visualisation

Generate a DOT graph for visualisation:

```bash
npx ts-module-isolation src/ --dot > dependencies.dot
dot -Tpng dependencies.dot -o graph.png
```

Red edges indicate feedback arcs that should be removed to fix the module structure.

## Configuration

The tool can be configured through command-line options:

- `--output, -o`: Output results to a file instead of stdout
- `--json`: Output results in JSON format
- `--dot`: Export dependency graph in the Dot format to stdout
- `--verbose`: Enable verbose logging
- `--exclude <pattern>`: Exclude directories matching the glob pattern (can be specified multiple times)

## Exit Codes

- `0`: No violations found
- `1`: Violations or feedback arcs detected

## License

MIT

## Related Projects

- [fumieval/OrderOrder](https://github.com/fumieval/OrderOrder) - Original Haskell implementation
