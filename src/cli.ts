#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { OrderOrder } from './orderorder';

const program = new Command();

program
  .name('orderorder')
  .description('Analyze TypeScript/JavaScript module dependencies to prevent jumbling of module prefixes')
  .version('1.0.0')
  .argument('[directories...]', 'Source directories to analyze (defaults to current directory)')
  .option('-o, --output <file>', 'Write report to file instead of stdout')
  .option('--dot', 'Generate DOT graph output to stdout')
  .option('--json', 'Output results in JSON format')
  .option('--verbose', 'Show detailed analysis information')
  .option('--exclude <pattern>', 'Exclude directories matching the glob pattern (can be specified multiple times)', (value: string, previous: string[]) => {
    return previous ? [...previous, value] : [value];
  }, [] as string[])
  .action((directories: string[], options) => {
    // Default to current directory if no directories provided
    if (!directories || directories.length === 0) {
      directories = ['.'];
    }
    try {
      const orderorder = new OrderOrder();
      
      if (options.verbose) {
        console.log(`Analyzing directories: ${directories.join(', ')}`);
        if (options.exclude.length > 0) {
          console.log(`Excluding patterns: ${options.exclude.join(', ')}`);
        }
      }
      
      const result = orderorder.analyze(directories, options.exclude);
      
      if (options.json) {
        const totalImports = Array.from(result.graph.modules.values())
          .reduce((sum, module) => sum + module.dependencies.length, 0);
        
        const jsonOutput = {
          summary: {
            totalModules: result.graph.modules.size,
            totalImports: totalImports,
            prefixCount: result.graph.prefixDependencies.size,
            violationCount: result.violations.length,
            feedbackArcCount: result.feedbackArcs.length,
            isAcyclic: orderorder['analyzer'].isAcyclic(result.graph)
          },
          feedbackArcs: result.feedbackArcs,
          violations: result.violations,
          prefixDependencies: Object.fromEntries(
            Array.from(result.graph.prefixDependencies.entries()).map(
              ([key, value]) => [key, Array.from(value)]
            )
          )
        };
        
        const output = JSON.stringify(jsonOutput, null, 2);
        
        if (options.output) {
          writeFileSync(options.output, output);
          console.log(`JSON report written to ${options.output}`);
        } else {
          console.log(output);
        }
      } else {
        const report = orderorder.generateReport(result);
        
        if (options.output) {
          writeFileSync(options.output, report);
          console.log(`Report written to ${options.output}`);
        } else {
          console.log(report);
        }
      }
      
      if (options.dot) {
        const dotGraph = orderorder.generateDotGraph(result.graph, result.feedbackArcs);
        console.log(dotGraph);
        return;
      }
      
      const hasViolations = result.violations.length > 0 || result.feedbackArcs.length > 0;
      process.exit(hasViolations ? 1 : 0);
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();