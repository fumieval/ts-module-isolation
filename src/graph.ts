import { ModuleInfo, DependencyGraph, FeedbackArc, ModuleDependency } from './types';
import { extractModulePrefix } from './utils';

export class GraphAnalyzer {
  buildGraph(modules: ModuleInfo[]): DependencyGraph {
    const moduleMap = new Map<string, ModuleInfo>();
    const prefixDependencies = new Map<string, Set<string>>();
    
    for (const module of modules) {
      moduleMap.set(module.name, module);
    }
    
    for (const module of modules) {
      for (const dep of module.dependencies) {
        const fromPrefix = extractModulePrefix(dep.from);
        const toPrefix = extractModulePrefix(dep.to);
        
        if (fromPrefix !== toPrefix) {
          if (!prefixDependencies.has(fromPrefix)) {
            prefixDependencies.set(fromPrefix, new Set());
          }
          prefixDependencies.get(fromPrefix)!.add(toPrefix);
        }
      }
    }
    
    return {
      modules: moduleMap,
      prefixDependencies
    };
  }

  findFeedbackArcs(graph: DependencyGraph): FeedbackArc[] {
    const feedbackArcs: FeedbackArc[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const prefixes = Array.from(graph.prefixDependencies.keys());
    
    for (const prefix of prefixes) {
      if (!visited.has(prefix)) {
        this.dfsForCycles(prefix, graph, visited, recursionStack, feedbackArcs);
      }
    }
    
    return feedbackArcs;
  }

  private dfsForCycles(
    current: string,
    graph: DependencyGraph,
    visited: Set<string>,
    recursionStack: Set<string>,
    feedbackArcs: FeedbackArc[]
  ): void {
    visited.add(current);
    recursionStack.add(current);
    
    const dependencies = graph.prefixDependencies.get(current) || new Set();
    
    for (const neighbor of dependencies) {
      if (!visited.has(neighbor)) {
        this.dfsForCycles(neighbor, graph, visited, recursionStack, feedbackArcs);
      } else if (recursionStack.has(neighbor)) {
        const violations = this.findViolations(current, neighbor, graph);
        feedbackArcs.push({
          from: current,
          to: neighbor,
          violations
        });
      }
    }
    
    recursionStack.delete(current);
  }

  private findViolations(fromPrefix: string, toPrefix: string, graph: DependencyGraph): ModuleDependency[] {
    const violations: ModuleDependency[] = [];
    
    for (const [, module] of graph.modules) {
      if (extractModulePrefix(module.name) === fromPrefix) {
        for (const dep of module.dependencies) {
          if (extractModulePrefix(dep.to) === toPrefix) {
            violations.push(dep);
          }
        }
      }
    }
    
    return violations;
  }

  detectViolations(graph: DependencyGraph): ModuleDependency[] {
    const violations: ModuleDependency[] = [];
    const stronglyConnectedComponents = this.findStronglyConnectedComponents(graph);
    
    for (const component of stronglyConnectedComponents) {
      if (component.size > 1) {
        for (const [, module] of graph.modules) {
          const modulePrefix = extractModulePrefix(module.name);
          if (component.has(modulePrefix)) {
            for (const dep of module.dependencies) {
              const depPrefix = extractModulePrefix(dep.to);
              if (component.has(depPrefix) && modulePrefix !== depPrefix) {
                violations.push(dep);
              }
            }
          }
        }
      }
    }
    
    return violations;
  }

  private findStronglyConnectedComponents(graph: DependencyGraph): Set<string>[] {
    const visited = new Set<string>();
    const stack: string[] = [];
    const prefixes = Array.from(graph.prefixDependencies.keys());
    
    for (const prefix of prefixes) {
      if (!visited.has(prefix)) {
        this.fillOrder(prefix, graph, visited, stack);
      }
    }
    
    const transposedGraph = this.transposeGraph(graph);
    visited.clear();
    const components: Set<string>[] = [];
    
    while (stack.length > 0) {
      const vertex = stack.pop()!;
      if (!visited.has(vertex)) {
        const component = new Set<string>();
        this.dfsComponent(vertex, transposedGraph, visited, component);
        components.push(component);
      }
    }
    
    return components;
  }

  private fillOrder(vertex: string, graph: DependencyGraph, visited: Set<string>, stack: string[]): void {
    visited.add(vertex);
    const dependencies = graph.prefixDependencies.get(vertex) || new Set();
    
    for (const neighbor of dependencies) {
      if (!visited.has(neighbor)) {
        this.fillOrder(neighbor, graph, visited, stack);
      }
    }
    
    stack.push(vertex);
  }

  private transposeGraph(graph: DependencyGraph): Map<string, Set<string>> {
    const transposed = new Map<string, Set<string>>();
    
    for (const [from, dependencies] of graph.prefixDependencies) {
      for (const to of dependencies) {
        if (!transposed.has(to)) {
          transposed.set(to, new Set());
        }
        transposed.get(to)!.add(from);
      }
    }
    
    return transposed;
  }

  private dfsComponent(
    vertex: string,
    transposed: Map<string, Set<string>>,
    visited: Set<string>,
    component: Set<string>
  ): void {
    visited.add(vertex);
    component.add(vertex);
    
    const dependencies = transposed.get(vertex) || new Set();
    for (const neighbor of dependencies) {
      if (!visited.has(neighbor)) {
        this.dfsComponent(neighbor, transposed, visited, component);
      }
    }
  }


  isAcyclic(graph: DependencyGraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const prefixes = Array.from(graph.prefixDependencies.keys());
    
    for (const prefix of prefixes) {
      if (!visited.has(prefix)) {
        if (this.hasCycleDFS(prefix, graph, visited, recursionStack)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private hasCycleDFS(
    current: string,
    graph: DependencyGraph,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(current);
    recursionStack.add(current);
    
    const dependencies = graph.prefixDependencies.get(current) || new Set();
    
    for (const neighbor of dependencies) {
      if (!visited.has(neighbor)) {
        if (this.hasCycleDFS(neighbor, graph, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(current);
    return false;
  }
}