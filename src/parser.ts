import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { minimatch } from 'minimatch';
import { ModuleDependency, ModuleInfo } from './types';
import { extractModulePrefix } from './utils';

export class ModuleParser {
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  private readonly importRegex = /^import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"](.*?)['"];?$/gm;
  private readonly requireRegex = /(?:const|let|var)\s+.*?=\s*require\(['"](.*?)['"]?\)/g;
  private readonly dynamicImportRegex = /import\(['"](.*?)['"]?\)/g;

  parseDirectory(dirPath: string, excludePatterns: string[] = []): ModuleInfo[] {
    const modules: ModuleInfo[] = [];
    this.walkDirectory(dirPath, dirPath, modules, excludePatterns);
    return modules;
  }

  private walkDirectory(currentPath: string, basePath: string, modules: ModuleInfo[], excludePatterns: string[]): void {
    const entries = readdirSync(currentPath);
    
    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stat = statSync(fullPath);
      const relativePath = relative(basePath, fullPath);
      
      // Check if this path should be excluded
      if (this.isExcluded(relativePath, excludePatterns)) {
        continue;
      }
      
      if (stat.isDirectory()) {
        if (entry !== 'node_modules' && !entry.startsWith('.')) {
          this.walkDirectory(fullPath, basePath, modules, excludePatterns);
        }
      } else if (this.extensions.includes(extname(entry))) {
        const moduleInfo = this.parseFile(fullPath, basePath);
        if (moduleInfo) {
          modules.push(moduleInfo);
        }
      }
    }
  }

  private isExcluded(relativePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => minimatch(relativePath, pattern));
  }

  private parseFile(filePath: string, basePath: string): ModuleInfo | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relativePath = relative(basePath, filePath);
      const moduleName = this.pathToModuleName(relativePath);
      const prefix = extractModulePrefix(moduleName);
      
      const dependencies = this.extractDependencies(content, filePath, basePath);
      
      return {
        path: filePath,
        name: moduleName,
        prefix,
        dependencies
      };
    } catch (error) {
      console.warn(`Failed to parse file ${filePath}:`, error);
      return null;
    }
  }

  private pathToModuleName(relativePath: string): string {
    // Remove file extension and normalize path separators
    return relativePath
      .replace(/\.[^/.]+$/, '')
      .replace(/\\/g, '/'); // Normalize to forward slashes
  }


  private extractDependencies(content: string, filePath: string, basePath: string): ModuleDependency[] {
    const dependencies: ModuleDependency[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      let match;
      this.importRegex.lastIndex = 0;
      while ((match = this.importRegex.exec(line)) !== null) {
        const importPath = match[1];
        if (this.isLocalImport(importPath)) {
          const resolvedPath = this.resolveImportPath(importPath, filePath, basePath);
          if (resolvedPath) {
            dependencies.push({
              from: this.pathToModuleName(relative(basePath, filePath)),
              to: resolvedPath,
              importType: 'import',
              line: lineNumber
            });
          }
        }
      }
      
      this.requireRegex.lastIndex = 0;
      while ((match = this.requireRegex.exec(line)) !== null) {
        const requirePath = match[1];
        if (this.isLocalImport(requirePath)) {
          const resolvedPath = this.resolveImportPath(requirePath, filePath, basePath);
          if (resolvedPath) {
            dependencies.push({
              from: this.pathToModuleName(relative(basePath, filePath)),
              to: resolvedPath,
              importType: 'require',
              line: lineNumber
            });
          }
        }
      }
      
      this.dynamicImportRegex.lastIndex = 0;
      while ((match = this.dynamicImportRegex.exec(line)) !== null) {
        const dynamicPath = match[1];
        if (this.isLocalImport(dynamicPath)) {
          const resolvedPath = this.resolveImportPath(dynamicPath, filePath, basePath);
          if (resolvedPath) {
            dependencies.push({
              from: this.pathToModuleName(relative(basePath, filePath)),
              to: resolvedPath,
              importType: 'dynamic',
              line: lineNumber
            });
          }
        }
      }
    });
    
    return dependencies;
  }

  private isLocalImport(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../') || (!importPath.startsWith('@') && !importPath.includes('/'));
  }

  private resolveImportPath(importPath: string, currentFile: string, basePath: string): string | null {
    try {
      const currentDir = dirname(currentFile);
      let resolvedPath: string;
      
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        resolvedPath = join(currentDir, importPath);
      } else {
        resolvedPath = join(basePath, importPath);
      }
      
      for (const ext of this.extensions) {
        const fullPath = resolvedPath + ext;
        try {
          const stat = statSync(fullPath);
          if (stat.isFile()) {
            return this.pathToModuleName(relative(basePath, fullPath));
          }
        } catch { /* File doesn't exist, try next extension */ }
      }
      
      const indexPath = join(resolvedPath, 'index');
      for (const ext of this.extensions) {
        const fullPath = indexPath + ext;
        try {
          const stat = statSync(fullPath);
          if (stat.isFile()) {
            return this.pathToModuleName(relative(basePath, resolvedPath));
          }
        } catch { /* Index file doesn't exist, try next extension */ }
      }
      
      return null;
    } catch {
      return null;
    }
  }
}