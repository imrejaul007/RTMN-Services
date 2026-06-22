/**
 * HIB Code Intelligence - Code Analyzer Service
 * Analyzes code quality, complexity, bugs, and security issues
 */

import acorn from 'acorn';
import type { CodeAnalysis, Bug, SecurityIssue, BestPractice, Suggestion } from '../types';

interface AnalysisOptions {
  checkSecurity?: boolean;
  checkBestPractices?: boolean;
  maxComplexity?: number;
}

export class CodeAnalyzer {
  /**
   * Analyze code and return comprehensive analysis
   */
  analyze(code: string, filePath: string, options: AnalysisOptions = {}): CodeAnalysis {
    const language = this.detectLanguage(filePath);
    const linesOfCode = this.countLines(code);
    const complexity = this.calculateComplexity(code, language);
    const bugs = this.findBugs(code, language);
    const securityIssues = options.checkSecurity !== false
      ? this.findSecurityIssues(code, language)
      : [];
    const bestPractices = options.checkBestPractices !== false
      ? this.checkBestPractices(code, language)
      : [];
    const suggestions = this.generateSuggestions(bugs, securityIssues, bestPractices, complexity);

    return {
      filePath,
      language,
      linesOfCode,
      complexity,
      maintainability: this.calculateMaintainability(complexity, linesOfCode),
      bugs,
      securityIssues,
      bestPractices,
      suggestions,
    };
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      py: 'Python',
      java: 'Java',
      go: 'Go',
      rs: 'Rust',
      rb: 'Ruby',
      php: 'PHP',
      cs: 'C#',
      cpp: 'C++',
      c: 'C',
    };
    return languageMap[ext || ''] || 'Unknown';
  }

  /**
   * Count non-empty lines of code
   */
  private countLines(code: string): number {
    return code.split('\n').filter(line => line.trim().length > 0).length;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(code: string, language: string): number {
    if (language === 'TypeScript' || language === 'JavaScript') {
      return this.calculateJSComplexity(code);
    }
    // Simple heuristic for other languages
    const controlFlowPatterns = [
      /\bif\b/g, /\belse\b/g, /\bfor\b/g, /\bwhile\b/g,
      /\bswitch\b/g, /\bcase\b/g, /\bcatch\b/g, /\b\?\b/g
    ];
    let complexity = 1;
    for (const pattern of controlFlowPatterns) {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    }
    return complexity;
  }

  /**
   * Calculate JavaScript/TypeScript complexity using AST
   */
  private calculateJSComplexity(code: string): number {
    try {
      const ast = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
      });

      let complexity = 1;

      const walk = (node: acorn.Node) => {
        if (!node) return;

        // Check for control flow nodes
        const type = node.type;

        if (['IfStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement',
             'WhileStatement', 'DoWhileStatement', 'CatchClause', 'ConditionalExpression',
             'LogicalExpression'].includes(type)) {
          complexity++;
        }

        // Recurse into child nodes
        for (const key of Object.keys(node)) {
          const value = (node as any)[key];
          if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
              value.forEach(item => {
                if (item && typeof item === 'object' && item.type) {
                  walk(item as acorn.Node);
                }
              });
            } else if (value.type) {
              walk(value as acorn.Node);
            }
          }
        }
      };

      walk(ast as unknown as acorn.Node);
      return complexity;
    } catch {
      // Fallback to simple counting if AST parsing fails
      return 1 + (code.match(/\bif\b/g)?.length || 0);
    }
  }

  /**
   * Calculate maintainability index (0-100)
   */
  private calculateMaintainability(complexity: number, linesOfCode: number): number {
    // Halstead metrics simplified
    const volume = linesOfCode * Math.log2(complexity + 1);
    const maintainability = Math.max(0, Math.min(100,
      171 - 5.2 * Math.log(volume + 1) - 0.23 * complexity
    ));
    return Math.round(maintainability);
  }

  /**
   * Find potential bugs in code
   */
  private findBugs(code: string, language: string): Bug[] {
    const bugs: Bug[] = [];

    if (language === 'TypeScript' || language === 'JavaScript') {
      // Check for common bugs
      bugs.push(...this.findJSBugs(code));
    }

    return bugs;
  }

  /**
   * Find JavaScript/TypeScript bugs
   */
  private findJSBugs(code: string): Bug[] {
    const bugs: Bug[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Assignment in condition
      if (/\bif\s*\([^=!]=/.test(line)) {
        bugs.push({
          line: lineNum,
          severity: 'high',
          type: 'AssignmentInCondition',
          message: 'Assignment used in condition. Did you mean to compare?',
          suggestion: 'Use === or !== for comparison',
        });
      }

      // TODO comments
      if (/\bTODO\b|\bFIXME\b|\bBUG\b/i.test(line)) {
        bugs.push({
          line: lineNum,
          severity: 'medium',
          type: 'UnresolvedTodo',
          message: 'Unresolved TODO/FIXME comment found',
        });
      }

      // Empty catch block
      if (/\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
        bugs.push({
          line: lineNum,
          severity: 'low',
          type: 'EmptyCatchBlock',
          message: 'Empty catch block may swallow errors',
          suggestion: 'Add error logging or handling',
        });
      }

      // Console.log in code
      if (/\bconsole\.(log|debug|info)\b/.test(line)) {
        bugs.push({
          line: lineNum,
          severity: 'low',
          type: 'ConsoleStatement',
          message: 'Console statement found in code',
          suggestion: 'Use a proper logging library',
        });
      }

      // Double equals without type coercion intent
      if (/\b==\s*(?!null|undefined)/.test(line) && !/\b===\b/.test(line)) {
        bugs.push({
          line: lineNum,
          severity: 'medium',
          type: 'LooseEquality',
          message: 'Using == instead of === may cause type coercion issues',
          suggestion: 'Use === for strict equality comparison',
        });
      }
    });

    return bugs;
  }

  /**
   * Find security issues in code
   */
  private findSecurityIssues(code: string, language: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Hardcoded secrets
      if (/\b(password|secret|api_key|apikey|token)\s*=\s*['"][^'"]+['"]/i.test(line)) {
        issues.push({
          line: lineNum,
          severity: 'critical',
          cwe: 'CWE-798',
          message: 'Hardcoded credential detected',
          recommendation: 'Use environment variables or a secrets manager',
        });
      }

      // SQL injection risk
      if (/\b(execute|query|sql)\s*\(.*\+/.test(line)) {
        issues.push({
          line: lineNum,
          severity: 'critical',
          cwe: 'CWE-89',
          message: 'Potential SQL injection vulnerability',
          recommendation: 'Use parameterized queries',
        });
      }

      // eval() usage
      if (/\beval\s*\(/.test(line)) {
        issues.push({
          line: lineNum,
          severity: 'high',
          cwe: 'CWE-95',
          message: 'Use of eval() is a security risk',
          recommendation: 'Avoid eval(), use safer alternatives',
        });
      }

      // Inner HTML without sanitization
      if (/\.innerHTML\s*=/.test(line)) {
        issues.push({
          line: lineNum,
          severity: 'high',
          cwe: 'CWE-79',
          message: 'Potential XSS vulnerability with innerHTML',
          recommendation: 'Use textContent or sanitize input',
        });
      }

      // Weak crypto
      if (/\b(md5|sha1|des)\b/i.test(line)) {
        issues.push({
          line: lineNum,
          severity: 'medium',
          cwe: 'CWE-327',
          message: 'Weak cryptographic algorithm detected',
          recommendation: 'Use SHA-256 or stronger algorithms',
        });
      }
    });

    return issues;
  }

  /**
   * Check for best practices violations
   */
  private checkBestPractices(code: string, language: string): BestPractice[] {
    const practices: BestPractice[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Long function
      if (line.length > 120) {
        practices.push({
          line: lineNum,
          rule: 'max-line-length',
          message: 'Line exceeds 120 characters',
          suggestion: 'Break long lines for readability',
        });
      }

      // Magic numbers
      if (/\b\d{3,}\b/.test(line) && !/['"`]\d+['"`]/.test(line)) {
        practices.push({
          line: lineNum,
          rule: 'no-magic-numbers',
          message: 'Magic number detected',
          suggestion: 'Use named constants instead',
        });
      }

      // Long function detection (simple heuristic)
      if (line.includes('function') && line.length > 80) {
        practices.push({
          line: lineNum,
          rule: 'function-length',
          message: 'Long function signature',
          suggestion: 'Consider breaking into smaller functions',
        });
      }
    });

    return practices;
  }

  /**
   * Generate improvement suggestions based on analysis
   */
  private generateSuggestions(
    bugs: Bug[],
    securityIssues: SecurityIssue[],
    bestPractices: BestPractice[],
    complexity: number
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Complexity suggestions
    if (complexity > 10) {
      suggestions.push({
        category: 'architecture',
        priority: 'high',
        message: `High cyclomatic complexity (${complexity}). Consider refactoring into smaller functions.`,
        effort: 'high',
      });
    }

    // Bug suggestions
    const criticalBugs = bugs.filter(b => b.severity === 'critical');
    if (criticalBugs.length > 0) {
      suggestions.push({
        category: 'security',
        priority: 'high',
        message: `${criticalBugs.length} critical bug(s) found. Address immediately.`,
        effort: 'medium',
      });
    }

    // Security suggestions
    if (securityIssues.length > 0) {
      suggestions.push({
        category: 'security',
        priority: 'high',
        message: `${securityIssues.length} security issue(s) detected. Review and fix.`,
        effort: 'medium',
      });
    }

    return suggestions;
  }
}

export const codeAnalyzer = new CodeAnalyzer();
