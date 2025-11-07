import { Client as SSHClient } from 'ssh2';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface StreamEvent {
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data?: string;
  code?: number;
  error?: string;
}

export class SSHExecutor {
  /**
   * Execute command with streaming output as async iterator
   */
  async *executeCommandStreaming(
    config: SSHConfig,
    command: string
  ): AsyncGenerator<StreamEvent> {
    const conn = new SSHClient();
    const events: StreamEvent[] = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const pushEvent = (event: StreamEvent) => {
      events.push(event);
      if (resolve) {
        resolve();
        resolve = null;
      }
    };

    const waitForEvent = () => new Promise<void>((res) => {
      if (events.length > 0) {
        res();
      } else {
        resolve = res;
      }
    });

    // Set up connection
    const connectionPromise = new Promise<void>((res, rej) => {
      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            pushEvent({ type: 'error', error: err.message });
            done = true;
            return rej(err);
          }

          stream.on('close', (code: number) => {
            conn.end();
            pushEvent({ type: 'exit', code: code || 0 });
            done = true;
            res();
          });

          stream.on('data', (data: Buffer) => {
            pushEvent({ type: 'stdout', data: data.toString() });
          });

          stream.stderr.on('data', (data: Buffer) => {
            pushEvent({ type: 'stderr', data: data.toString() });
          });
        });
      });

      conn.on('error', (err) => {
        pushEvent({ type: 'error', error: err.message });
        done = true;
        rej(err);
      });

      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        readyTimeout: 10000,
      });
    });

    // Start connection in background
    connectionPromise.catch(() => {}); // Handle errors through events

    // Yield events as they come
    while (!done || events.length > 0) {
      if (events.length > 0) {
        yield events.shift()!;
      } else {
        await waitForEvent();
      }
    }
  }

  async executeCommand(config: SSHConfig, command: string): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const conn = new SSHClient();

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          let stdout = '';
          let stderr = '';

          stream.on('close', (code: number) => {
            conn.end();
            resolve({
              stdout,
              stderr,
              exitCode: code || 0,
            });
          });

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        reject(err);
      });

      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        readyTimeout: 10000,
      });
    });
  }
}

export const sshExecutor = new SSHExecutor();
