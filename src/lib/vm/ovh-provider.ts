import ovh from 'ovh';

export interface OvhVMConfig {
  name: string;
  vcpus: number;
  memoryMb: number;
  diskGb: number;
  environmentVars?: Record<string, string>;
}

export interface OvhVMDetails {
  instanceId: string;
  ipAddress: string;
  sshPort: number;
  status: 'running' | 'stopped' | 'error';
}

export class OvhVMProvider {
  private client: any;
  private projectId: string;

  constructor() {
    // Initialize OVH client with credentials from env
    this.client = ovh({
      endpoint: process.env.OVH_ENDPOINT || 'ovh-eu',
      appKey: process.env.OVH_APPLICATION_KEY,
      appSecret: process.env.OVH_APPLICATION_SECRET,
      consumerKey: process.env.OVH_CONSUMER_KEY,
    });

    // Project ID from OVH dashboard (16f0d954beef4f8f87fe81d0aec67ec0)
    this.projectId = process.env.OVH_PROJECT_ID || '16f0d954beef4f8f87fe81d0aec67ec0';
  }

  // ==================== Helper Functions ====================

  /** Convert MB to GB (OVH uses GB for RAM) */
  private mbToGb(mb: number): number {
    return Math.ceil(mb / 1024);
  }

  /** Check if flavor meets resource requirements */
  private flavorMeetsRequirements(flavor: any, vcpus: number, ramGb: number): boolean {
    return flavor.vcpus >= vcpus && flavor.ram >= ramGb && flavor.available === true;
  }

  /** Sort flavors by total resources (smallest first) */
  private sortFlavorsBySize(a: any, b: any): number {
    return (a.vcpus + a.ram) - (b.vcpus + b.ram);
  }

  /** Fetch all available regions from OVH API */
  async listRegions(): Promise<string[]> {
    return await this.client.requestPromised(
      'GET',
      `/cloud/project/${this.projectId}/region`
    );
  }

  /** Fetch all available flavors from OVH API for a specific region */
  async fetchFlavors(region?: string): Promise<any[]> {
    const targetRegion = region || process.env.OVH_REGION || 'GRA9';
    try {
      return await this.client.requestPromised(
        'GET',
        `/cloud/project/${this.projectId}/flavor`,
        { region: targetRegion }
      );
    } catch (error: any) {
      // OVH API quirk: listRegions returns "BHS" but flavors need "BHS5", etc
      console.error(`Failed to fetch flavors for region ${targetRegion}:`, error?.message);
      throw new Error(`Region ${targetRegion} not available or invalid`);
    }
  }

  /** Get all available flavors for UI display (no hardcoded filters) */
  async getAvailableFlavors(region?: string): Promise<Array<{
    id: string;
    name: string;
    vcpus: number;
    ram: number;
    disk: number;
    type: string;
    available: boolean;
    region: string;
  }>> {
    const targetRegion = region || process.env.OVH_REGION || 'GRA9';
    const allFlavors = await this.fetchFlavors(targetRegion);

    // Only filter out Windows and unavailable instances
    // NO hardcoded type or size limits - let user choose!
    const available = allFlavors
      .filter((f: any) =>
        f.available &&
        !f.name.toLowerCase().includes('win') // No windows
      )
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        vcpus: f.vcpus,
        ram: f.ram,
        disk: f.disk,
        type: this.getFlavorTypeName(f.type),
        available: f.available,
        region: targetRegion,
      }))
      .sort((a, b) => {
        // Sort by vcpus, then ram
        if (a.vcpus !== b.vcpus) return a.vcpus - b.vcpus;
        return a.ram - b.ram;
      });

    return available;
  }

  /** Convert OVH type to friendly name */
  private getFlavorTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      'ovh.d2': 'Starter',
      'ovh.ssd.eg': 'General Purpose',
      'ovh.ssd.cpu': 'CPU Optimized',
      'ovh.ssd.ram': 'RAM Optimized',
      'ovh.iops': 'Storage Optimized',
    };
    return typeMap[type] || type;
  }

  // ==================== Main Logic ====================

  /**
   * Get available flavors (instance types) that match resource requirements
   * NOTE: OVH returns RAM in GB (not MB!)
   */
  private async getFlavorForResources(vcpus: number, memoryMb: number, region?: string): Promise<string> {
    try {
      const flavors = await this.fetchFlavors(region);
      const memoryGb = this.mbToGb(memoryMb);

      console.log(`Looking for flavor: ${vcpus} vCPUs, ${memoryGb}GB RAM`);
      console.log(`Total flavors available: ${flavors.length}`);
      console.log(`Available flavors:`, flavors.slice(0, 5).map(f => `${f.name} (${f.vcpus}vCPU, ${f.ram}GB, available: ${f.available})`));

      // Filter and sort to find best match
      const suitableFlavors = flavors.filter(f => this.flavorMeetsRequirements(f, vcpus, memoryGb));
      console.log(`Suitable flavors after filtering: ${suitableFlavors.length}`);

      const suitableFlavor = suitableFlavors.sort(this.sortFlavorsBySize)[0];

      if (!suitableFlavor) {
        throw new Error(`No suitable flavor found for ${vcpus} vCPUs and ${memoryGb}GB RAM. Total flavors checked: ${flavors.length}`);
      }

      console.log(`Selected flavor: ${suitableFlavor.name} (${suitableFlavor.vcpus} vCPUs, ${suitableFlavor.ram}GB RAM)`);
      return suitableFlavor.id;
    } catch (error) {
      console.error('Failed to get flavors:', error);
      throw error;
    }
  }

  /**
   * Get Ubuntu image ID
   */
  private async getUbuntuImage(region?: string): Promise<string> {
    try {
      const targetRegion = region || process.env.OVH_REGION || 'GRA9';
      const images = await this.client.requestPromised(
        'GET',
        `/cloud/project/${this.projectId}/image`,
        {
          osType: 'linux',
          region: targetRegion,
        }
      );

      // Find Ubuntu 22.04 or latest Ubuntu
      const ubuntuImage = images.find((img: any) =>
        img.name.toLowerCase().includes('ubuntu 22.04') ||
        img.name.toLowerCase().includes('ubuntu')
      );

      if (!ubuntuImage) {
        throw new Error('No Ubuntu image found');
      }

      console.log(`Selected image: ${ubuntuImage.name}`);
      return ubuntuImage.id;
    } catch (error) {
      console.error('Failed to get images:', error);
      throw error;
    }
  }

  /**
   * Create SSH key for instance access
   */
  private async ensureSshKey(): Promise<string> {
    try {
      const keys = await this.client.requestPromised(
        'GET',
        `/cloud/project/${this.projectId}/sshkey`
      );

      // Use existing firecracker-host key if available
      const existingKey = keys.find((k: any) =>
        k.name === 'firecracker-host' || k.name === 'github-gg-vm-key'
      );

      if (existingKey) {
        console.log(`Using existing SSH key: ${existingKey.name}`);
        return existingKey.id;
      }

      // If no key exists, throw error - keys should be pre-configured
      throw new Error('No SSH key found in OVH project. Please add an SSH key first.');
    } catch (error) {
      console.error('Failed to ensure SSH key:', error);
      throw error;
    }
  }

  /**
   * Generate random password for VM
   */
  private generateSecurePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const crypto = require('crypto');
    for (let i = 0; i < 32; i++) {
      password += chars[crypto.randomInt(0, chars.length)];
    }
    return password;
  }

  /**
   * Get application server IP for security group
   */
  private async getApplicationServerIp(): Promise<string> {
    // In production, this should be the public IP of your application server
    // For now, we'll use a placeholder
    return process.env.APP_SERVER_IP || '0.0.0.0/0'; // TODO: Replace with actual app server IP
  }

  /**
   * Create cloud-init user data with SSH keys and network restrictions
   */
  private async getCloudInit(userSshPublicKey?: string): Promise<string> {
    // Service account SSH key (used by our backend to execute terminal commands)
    const servicePublicKey = process.env.SERVICE_SSH_PUBLIC_KEY;

    const sshKeys = [servicePublicKey, userSshPublicKey].filter(Boolean);

    return `#cloud-config
users:
  - name: vmuser
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
${sshKeys.map(key => `      - ${key}`).join('\n')}

# Disable password authentication - only allow SSH keys
ssh_pwauth: false

# Firewall rules - only allow SSH from application server
runcmd:
  - ufw --force enable
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow from ${process.env.APP_SERVER_IP || 'any'} to any port 22
  - ufw reload
`;
  }

  /**
   * Create a new OVH cloud instance with SSH key authentication
   */
  async createVM(config: OvhVMConfig, region?: string, userSshPublicKey?: string): Promise<OvhVMDetails> {
    console.log(`🌩️  Creating OVH cloud instance: ${config.name}`);

    try {
      const targetRegion = region || process.env.OVH_REGION || 'GRA9';

      // Get appropriate flavor
      const flavorId = await this.getFlavorForResources(config.vcpus, config.memoryMb, targetRegion);

      // Get Ubuntu image
      const imageId = await this.getUbuntuImage(targetRegion);

      // Create cloud-init with SSH keys and firewall
      const userData = await this.getCloudInit(userSshPublicKey);

      // Create instance with user data
      const instance = await this.client.requestPromised(
        'POST',
        `/cloud/project/${this.projectId}/instance`,
        {
          name: config.name,
          flavorId,
          imageId,
          region: targetRegion,
          monthlyBilling: false,
          userData: Buffer.from(userData).toString('base64'),
        }
      );

      console.log(`✅ OVH instance created: ${instance.id}`);

      // Wait for instance to be active
      await this.waitForInstanceActive(instance.id);

      // Get instance details
      const instanceDetails = await this.client.requestPromised(
        'GET',
        `/cloud/project/${this.projectId}/instance/${instance.id}`
      );

      // Get public IP
      const publicIp = instanceDetails.ipAddresses.find((ip: any) => ip.type === 'public');

      console.log(`✅ OVH instance created with SSH key authentication and firewall`);

      return {
        instanceId: instance.id,
        ipAddress: publicIp?.ip || '',
        sshPort: 22,
        status: 'running',
      };
    } catch (error: any) {
      console.error('Failed to create OVH instance:', error);
      throw new Error(`OVH instance creation failed: ${error.message}`);
    }
  }

  /**
   * Wait for instance to become active
   */
  private async waitForInstanceActive(instanceId: string, maxWait = 300000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      try {
        const instance = await this.client.requestPromised(
          'GET',
          `/cloud/project/${this.projectId}/instance/${instanceId}`
        );

        if (instance.status === 'ACTIVE') {
          console.log(`✅ Instance ${instanceId} is now active`);
          return;
        }

        if (instance.status === 'ERROR') {
          throw new Error(`Instance entered ERROR state`);
        }

        console.log(`⏳ Instance status: ${instance.status}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('Error checking instance status:', error);
        throw error;
      }
    }

    throw new Error(`Instance ${instanceId} did not become active in time`);
  }

  /**
   * Start a stopped instance
   */
  async startVM(instanceId: string): Promise<void> {
    console.log(`▶️  Starting OVH instance: ${instanceId}`);

    await this.client.requestPromised(
      'POST',
      `/cloud/project/${this.projectId}/instance/${instanceId}/start`
    );

    await this.waitForInstanceActive(instanceId);
    console.log(`✅ OVH instance started`);
  }

  /**
   * Stop a running instance
   */
  async stopVM(instanceId: string): Promise<void> {
    console.log(`⏸️  Stopping OVH instance: ${instanceId}`);

    await this.client.requestPromised(
      'POST',
      `/cloud/project/${this.projectId}/instance/${instanceId}/stop`
    );

    console.log(`✅ OVH instance stopped`);
  }

  /**
   * Destroy an instance completely
   */
  async destroyVM(instanceId: string): Promise<void> {
    console.log(`🗑️  Destroying OVH instance: ${instanceId}`);

    await this.client.requestPromised(
      'DELETE',
      `/cloud/project/${this.projectId}/instance/${instanceId}`
    );

    console.log(`✅ OVH instance destroyed`);
  }

  /**
   * Get instance status
   */
  async getVMStatus(instanceId: string): Promise<'running' | 'stopped' | 'error'> {
    try {
      const instance = await this.client.requestPromised(
        'GET',
        `/cloud/project/${this.projectId}/instance/${instanceId}`
      );

      switch (instance.status) {
        case 'ACTIVE':
          return 'running';
        case 'SHUTOFF':
          return 'stopped';
        default:
          return 'error';
      }
    } catch (error) {
      return 'error';
    }
  }

  /**
   * List all instances
   */
  async listVMs(): Promise<Array<{ instanceId: string; name: string; status: string }>> {
    try {
      const instances = await this.client.requestPromised(
        'GET',
        `/cloud/project/${this.projectId}/instance`
      );

      return instances.map((inst: any) => ({
        instanceId: inst.id,
        name: inst.name,
        status: inst.status,
      }));
    } catch (error) {
      console.error('Failed to list instances:', error);
      return [];
    }
  }
}

export const ovhProvider = new OvhVMProvider();
