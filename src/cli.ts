#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { OrderOrder } from './orderorder';

const program = new Command();

program
  .name('orderorder')
  .description('Analyze TypeScript/JavaScript module dependencies to prevent jumbling of module prefixes')
  .version('1.0.0')
  .argument('<directories...>', 'Source directories to analyze')
  .option('-o, --output <file>', 'Write report to file instead of stdout')
  .option('--dot <file>', 'Generate DOT graph file for visualization')
  .option('--json', 'Output results in JSON format')
  .option('--verbose', 'Show detailed analysis information')
  .action((directories: string[], options) => {
    try {
      const orderorder = new OrderOrder();
      
      if (options.verbose) {
        console.log(`Analyzing directories: ${directories.join(', ')}`);
      }
      
      const result = orderorder.analyze(directories);
      
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
        writeFileSync(options.dot, dotGraph);
        console.log(`DOT graph written to ${options.dot}`);
        console.log('Generate visualization with: dot -Tpng output.dot -o graph.png');
      }
      
      const hasViolations = result.violations.length > 0 || result.feedbackArcs.length > 0;
      process.exit(hasViolations ? 1 : 0);
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();