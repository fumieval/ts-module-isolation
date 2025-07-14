import { dirname } from 'path';

export function extractModulePrefix(modulePath: string): string {
  // Get directory part of the path
  const dir = dirname(modulePath).replace(/\\/g, '/'); // Normalize to forward slashes
  
  // If directory is current directory or empty, use the full module path as prefix
  if (dir === '.' || dir === '' || dir === '/') {
    return modulePath;
  }
  
  return dir;
}