/**
 * Python Runner Service
 * Manages Python subprocess execution for ML scripts
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

export interface PythonScriptConfig {
  scriptName: string;
  args?: Record<string, unknown>;
  timeout?: number;
  workingDir?: string;
}

export interface PythonResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  output?: unknown;
}

export interface PythonProgress {
  jobId: string;
  progress: number;
  message: string;
  stage?: string;
}

export class PythonRunner extends EventEmitter {
  private pythonPath: string;
  private scriptsPath: string;
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private timeout: number;

  constructor(pythonPath: string = 'python3', scriptsPath: string = './python/automl', timeout: number = 3600000) {
    super();
    this.pythonPath = pythonPath;
    this.scriptsPath = scriptsPath;
    this.timeout = timeout;
  }

  async execute(config: PythonScriptConfig): Promise<PythonResult> {
    const startTime = Date.now();
    const scriptPath = path.resolve(this.scriptsPath, config.scriptName);

    // Validate script exists
    try {
      await fs.access(scriptPath);
    } catch {
      return {
        success: false,
        stdout: '',
        stderr: `Script not found: ${scriptPath}`,
        exitCode: -1,
        duration: Date.now() - startTime
      };
    }

    // Build command arguments
    const args = this.buildArgs(config.args || {});
    const spawnArgs = [scriptPath, ...args];

    const jobId = this.generateJobId();

    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, spawnArgs, {
        cwd: config.workingDir || this.scriptsPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      this.runningProcesses.set(jobId, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        this.emit('stdout', { jobId, data: text });
        this.parseProgress(jobId, text);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        this.emit('stderr', { jobId, data: text });
      });

      const timeoutHandle = setTimeout(() => {
        proc.kill('SIGTERM');
        this.emit('timeout', { jobId });
      }, config.timeout || this.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.runningProcesses.delete(jobId);
        this.emit('complete', { jobId, exitCode: code });

        const duration = Date.now() - startTime;
        let output: unknown = undefined;

        // Try to parse JSON output
        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            output = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Not JSON, output remains undefined
        }

        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
          output
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.runningProcesses.delete(jobId);
        this.emit('error', { jobId, error: error.message });

        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: -1,
          duration: Date.now() - startTime
        });
      });
    });
  }

  async executeWithInput(
    config: PythonScriptConfig,
    inputData: unknown
  ): Promise<PythonResult> {
    const startTime = Date.now();
    const scriptPath = path.resolve(this.scriptsPath, config.scriptName);

    try {
      await fs.access(scriptPath);
    } catch {
      return {
        success: false,
        stdout: '',
        stderr: `Script not found: ${scriptPath}`,
        exitCode: -1,
        duration: Date.now() - startTime
      };
    }

    const args = this.buildArgs(config.args || {});
    const spawnArgs = [scriptPath, ...args];

    const jobId = this.generateJobId();

    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, spawnArgs, {
        cwd: config.workingDir || this.scriptsPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      this.runningProcesses.set(jobId, proc);

      let stdout = '';
      let stderr = '';

      // Send input data as JSON
      proc.stdin?.write(JSON.stringify(inputData));
      proc.stdin?.end();

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        this.emit('stdout', { jobId, data: text });
        this.parseProgress(jobId, text);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        this.emit('stderr', { jobId, data: text });
      });

      const timeoutHandle = setTimeout(() => {
        proc.kill('SIGTERM');
        this.emit('timeout', { jobId });
      }, config.timeout || this.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.runningProcesses.delete(jobId);
        this.emit('complete', { jobId, exitCode: code });

        const duration = Date.now() - startTime;
        let output: unknown = undefined;

        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            output = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Not JSON
        }

        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
          output
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.runningProcesses.delete(jobId);
        this.emit('error', { jobId, error: error.message });

        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: -1,
          duration: Date.now() - startTime
        });
      });
    });
  }

  async executeFile(
    scriptPath: string,
    args: string[] = [],
    timeout?: number
  ): Promise<PythonResult> {
    const startTime = Date.now();

    try {
      await fs.access(scriptPath);
    } catch {
      return {
        success: false,
        stdout: '',
        stderr: `Script not found: ${scriptPath}`,
        exitCode: -1,
        duration: Date.now() - startTime
      };
    }

    const jobId = this.generateJobId();

    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      this.runningProcesses.set(jobId, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        proc.kill('SIGTERM');
        this.emit('timeout', { jobId });
      }, timeout || this.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.runningProcesses.delete(jobId);
        this.emit('complete', { jobId, exitCode: code });

        const duration = Date.now() - startTime;

        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          duration
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.runningProcesses.delete(jobId);
        this.emit('error', { jobId, error: error.message });

        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: -1,
          duration: Date.now() - startTime
        });
      });
    });
  }

  kill(jobId: string): boolean {
    const proc = this.runningProcesses.get(jobId);
    if (proc) {
      proc.kill('SIGTERM');
      this.runningProcesses.delete(jobId);
      return true;
    }
    return false;
  }

  killAll(): void {
    for (const [jobId, proc] of this.runningProcesses) {
      proc.kill('SIGTERM');
      this.runningProcesses.delete(jobId);
    }
  }

  getRunningCount(): number {
    return this.runningProcesses.size;
  }

  isRunning(jobId: string): boolean {
    return this.runningProcesses.has(jobId);
  }

  private buildArgs(args: Record<string, unknown>): string[] {
    const result: string[] = [];

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === 'boolean') {
        if (value) {
          result.push(`--${key}`);
        }
      } else if (Array.isArray(value)) {
        for (const item of value) {
          result.push(`--${key}`);
          result.push(String(item));
        }
      } else if (typeof value === 'object') {
        result.push(`--${key}`);
        result.push(JSON.stringify(value));
      } else {
        result.push(`--${key}`);
        result.push(String(value));
      }
    }

    return result;
  }

  private parseProgress(jobId: string, text: string): void {
    // Look for progress indicators in output
    const progressMatch = text.match(/PROGRESS:(\d+(?:\.\d+)?):(.+)/);
    if (progressMatch) {
      this.emit('progress', {
        jobId,
        progress: parseFloat(progressMatch[1]),
        message: progressMatch[2]
      } as PythonProgress);
    }

    const stageMatch = text.match(/STAGE:(\w+):(.+)/);
    if (stageMatch) {
      this.emit('progress', {
        jobId,
        progress: 0,
        message: stageMatch[2],
        stage: stageMatch[1]
      } as PythonProgress);
    }
  }

  private generateJobId(): string {
    return `py_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
export const pythonRunner = new PythonRunner(
  process.env.PYTHON_PATH || 'python3',
  process.env.PYTHON_SCRIPTS_PATH || './python/automl',
  parseInt(process.env.JOB_TIMEOUT_MS || '3600000', 10)
);
