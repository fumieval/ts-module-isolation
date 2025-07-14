export interface ModuleDependency {
  from: string;
  to: string;
  importType: 'import' | 'require' | 'dynamic';
  line: number;
}

export interface ModuleInfo {
  path: string;
  name: string;
  prefix: string;
  dependencies: ModuleDependency[];
}

export interface DependencyGraph {
  modules: Map<string, ModuleInfo>;
  prefixDependencies: Map<string, Set<string>>;
}

export interface FeedbackArc {
  from: string;
  to: string;
  violations: ModuleDependency[];
}

export interface AnalysisResult {
  graph: DependencyGraph;
  feedbackArcs: FeedbackArc[];
  violations: ModuleDependency[];
}