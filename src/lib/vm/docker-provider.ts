import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { Client as SSHClient } from 'ssh2';

const execAsync = promisify(exec);

export interface DockerVMConfig {
  name: string;
  vcpus: number;
  memoryMb: number;
  environmentVars?: Record<string, string>;
}

export interface DockerVMDetails {
  containerId: string;
  ipAddress: string;
  sshPort: number;
  status: 'running' | 'stopped' | 'error';
}

export class DockerVMProvider {
  /**
   * Create a new Docker-based VM
   * Uses Ubuntu with SSH server pre-installed
   */
  async createVM(config: DockerVMConfig): Promise<DockerVMDetails> {
    console.log(`🐳 Creating Docker VM: ${config.name}`);

    // Build docker run command with resource limits
    const envVars = config.environmentVars
      ? Object.entries(config.environmentVars).map(([k, v]) => `-e ${k}=${v}`).join(' ')
      : '';

    // Find available SSH port (start from 2222)
    const sshPort = await this.findAvailablePort(2222);

    const dockerCommand = `
      docker run -d \
        --name ${config.name} \
        --cpus=${config.vcpus} \
        --memory=${config.memoryMb}m \
        -p ${sshPort}:22 \
        ${envVars} \
        --label gh.gg/managed=true \
        --label gh.gg/vm-name=${config.name} \
        --restart unless-stopped \
        rastasheep/ubuntu-sshd:latest
    `.replace(/\n\s+/g, ' ').trim();

    console.log(`📦 Running: ${dockerCommand}`);

    const { stdout: containerId } = await execAsync(dockerCommand);
    const cleanContainerId = containerId.trim();

    // Wait for container to be fully up
    await this.waitForContainer(cleanContainerId);

    // Get container IP
    const { stdout: ipAddress } = await execAsync(
      `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${cleanContainerId}`
    );

    console.log(`✅ Docker VM created: ${config.name} (${cleanContainerId.substring(0, 12)})`);
    console.log(`   IP: ${ipAddress.trim()}, SSH Port: ${sshPort}`);

    return {
      containerId: cleanContainerId,
      ipAddress: ipAddress.trim(),
      sshPort,
      status: 'running',
    };
  }

  /**
   * Start a stopped VM
   */
  async startVM(containerId: string): Promise<void> {
    console.log(`▶️  Starting Docker VM: ${containerId.substring(0, 12)}`);
    await execAsync(`docker start ${containerId}`);
    await this.waitForContainer(containerId);
    console.log(`✅ Docker VM started`);
  }

  /**
   * Stop a running VM
   */
  async stopVM(containerId: string): Promise<void> {
    console.log(`⏸️  Stopping Docker VM: ${containerId.substring(0, 12)}`);
    await execAsync(`docker stop ${containerId}`);
    console.log(`✅ Docker VM stopped`);
  }

  /**
   * Destroy a VM completely
   */
  async destroyVM(containerId: string): Promise<void> {
    console.log(`🗑️  Destroying Docker VM: ${containerId.substring(0, 12)}`);
    try {
      await execAsync(`docker stop ${containerId}`);
    } catch (e) {
      // May already be stopped
    }
    await execAsync(`docker rm ${containerId}`);
    console.log(`✅ Docker VM destroyed`);
  }

  /**
   * Get VM status
   */
  async getVMStatus(containerId: string): Promise<'running' | 'stopped' | 'error'> {
    try {
      const { stdout } = await execAsync(`docker inspect -f '{{.State.Status}}' ${containerId}`);
      const status = stdout.trim();

      if (status === 'running') return 'running';
      if (status === 'exited' || status === 'created') return 'stopped';
      return 'error';
    } catch (e) {
      return 'error';
    }
  }

  /**
   * Execute command via SSH
   */
  async executeCommand(ipAddress: string, sshPort: number, command: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
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

      // Connect via SSH
      // If sshPort is 22, we're using OVH, connect to ipAddress directly
      // If sshPort is > 1024, we're using Docker, connect to localhost with port mapping
      const isDockerVM = sshPort > 1024;

      conn.connect({
        host: isDockerVM ? 'localhost' : ipAddress,
        port: sshPort,
        username: 'root',
        password: 'root',
        readyTimeout: 10000,
      });
    });
  }

  /**
   * Wait for container to be healthy
   */
  private async waitForContainer(containerId: string, maxWait = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      try {
        const { stdout } = await execAsync(`docker inspect -f '{{.State.Running}}' ${containerId}`);
        if (stdout.trim() === 'true') {
          // Give SSH a moment to start
          await new Promise(resolve => setTimeout(resolve, 2000));
          return;
        }
      } catch (e) {
        // Container might not exist yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Container ${containerId} did not become healthy in time`);
  }

  /**
   * Find an available port
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    let port = startPort;
    while (port < startPort + 1000) {
      try {
        // Check if port is in use
        const result = execSync(`docker ps --filter publish=${port} --format '{{.ID}}'`, { encoding: 'utf8' });
        // If result is empty, port is free
        if (!result.trim()) {
          return port;
        }
        // Port is in use, try next one
        port++;
      } catch (e) {
        // Command failed, port is available
        return port;
      }
    }
    throw new Error('No available ports found');
  }

  /**
   * List all managed VMs
   */
  async listVMs(): Promise<Array<{ containerId: string; name: string; status: string }>> {
    try {
      const { stdout } = await execAsync(
        `docker ps -a --filter label=gh.gg/managed=true --format '{{.ID}}|{{.Names}}|{{.Status}}'`
      );

      return stdout.trim().split('\n').filter(Boolean).map(line => {
        const [containerId, name, status] = line.split('|');
        return { containerId, name, status };
      });
    } catch (e) {
      return [];
    }
  }
}

export const dockerProvider = new DockerVMProvider();
