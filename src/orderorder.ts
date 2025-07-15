import { ModuleParser } from './parser';
import { GraphAnalyzer } from './graph';
import { AnalysisResult, DependencyGraph, FeedbackArc } from './types';
import { extractModulePrefix } from './utils';

export class OrderOrder {
  private parser: ModuleParser;
  private analyzer: GraphAnalyzer;

  constructor() {
    this.parser = new ModuleParser();
    this.analyzer = new GraphAnalyzer();
  }

  analyze(directories: string[], excludePatterns: string[] = []): AnalysisResult {
    const allModules = directories.flatMap(dir => this.parser.parseDirectory(dir, excludePatterns));
    
    const graph = this.analyzer.buildGraph(allModules);
    const feedbackArcs = this.analyzer.findFeedbackArcs(graph);
    const violations = this.analyzer.detectViolations(graph);

    return {
      graph,
      feedbackArcs,
      violations
    };
  }

  generateReport(result: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('OrderOrder Analysis Report');
    lines.push('========================');
    lines.push('');
    
    const totalImports = Array.from(result.graph.modules.values())
      .reduce((sum, module) => sum + module.dependencies.length, 0);
    
    lines.push(`Total modules analyzed: ${result.graph.modules.size}`);
    lines.push(`Total imports analyzed: ${totalImports}`);
    lines.push(`Module prefixes found: ${result.graph.prefixDependencies.size}`);
    lines.push(`Dependency violations found: ${result.violations.length}`);
    lines.push(`Feedback arcs detected: ${result.feedbackArcs.length}`);
    lines.push('');
    
    if (this.analyzer.isAcyclic(result.graph)) {
      lines.push('✅ Module prefix dependencies form a DAG (no cycles detected)');
    } else {
      lines.push('❌ Module prefix dependencies contain cycles');
    }
    lines.push('');
    
    if (result.feedbackArcs.length > 0) {
      lines.push('Feedback Arc Set (edges to remove to make graph acyclic):');
      lines.push('--------------------------------------------------------');
      for (const arc of result.feedbackArcs) {
        lines.push(`${arc.from} -> ${arc.to}`);
        for (const violation of arc.violations) {
          lines.push(`  ${violation.from}:${violation.line} imports ${violation.to} (${violation.importType})`);
        }
        lines.push('');
      }
    }
    
    if (result.violations.length > 0) {
      lines.push('Dependency Violations:');
      lines.push('---------------------');
      
      // Group violations by prefix pairs and identify mutual violations
      const violationsByPrefix = new Map<string, typeof result.violations>();
      const processedPairs = new Set<string>();
      
      for (const violation of result.violations) {
        const key = `${extractModulePrefix(violation.from)} -> ${extractModulePrefix(violation.to)}`;
        if (!violationsByPrefix.has(key)) {
          violationsByPrefix.set(key, []);
        }
        violationsByPrefix.get(key)!.push(violation);
      }
      
      // Group mutual violations together
      for (const [prefixPair, violations] of violationsByPrefix) {
        if (processedPairs.has(prefixPair)) continue;
        
        const [fromPrefix, toPrefix] = prefixPair.split(' -> ');
        const reversePair = `${toPrefix} -> ${fromPrefix}`;
        const reverseViolations = violationsByPrefix.get(reversePair);
        
        if (reverseViolations) {
          // Mutual violation - show both directions together
          lines.push(`${prefixPair} (mutual dependency):`);
          for (const violation of violations) {
            lines.push(`  ${violation.from}:${violation.line} -> ${violation.to} (${violation.importType})`);
          }
          lines.push(`${reversePair}:`);
          for (const violation of reverseViolations) {
            lines.push(`  ${violation.from}:${violation.line} -> ${violation.to} (${violation.importType})`);
          }
          processedPairs.add(prefixPair);
          processedPairs.add(reversePair);
        } else {
          // One-way violation
          lines.push(`${prefixPair}:`);
          for (const violation of violations) {
            lines.push(`  ${violation.from}:${violation.line} -> ${violation.to} (${violation.importType})`);
          }
          processedPairs.add(prefixPair);
        }
        lines.push('');
      }
    }
    
    if (result.feedbackArcs.length === 0 && result.violations.length === 0) {
      lines.push('🎉 No violations found! Module structure follows proper hierarchy.');
    } else {
      lines.push('Recommendations:');
      lines.push('---------------');
      lines.push('1. Consider restructuring modules to eliminate circular dependencies');
      lines.push('2. Move shared code to a common base module');
      lines.push('3. Use dependency injection to break tight coupling');
      lines.push('4. Consider splitting large modules into smaller, focused ones');
    }
    
    return lines.join('\n');
  }

  generateDotGraph(graph: DependencyGraph, feedbackArcs: FeedbackArc[]): string {
    const lines: string[] = [];
    lines.push('digraph ModuleDependencies {');
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box];');
    lines.push('');
    
    const feedbackSet = new Set(feedbackArcs.map(arc => `${arc.from}->${arc.to}`));
    
    for (const [prefix, dependencies] of graph.prefixDependencies) {
      for (const dep of dependencies) {
        const edgeKey = `${prefix}->${dep}`;
        const style = feedbackSet.has(edgeKey) ? ' [color=red, style=bold]' : '';
        lines.push(`  "${prefix}" -> "${dep}"${style};`);
      }
    }
    
    lines.push('}');
    return lines.join('\n');
  }

}