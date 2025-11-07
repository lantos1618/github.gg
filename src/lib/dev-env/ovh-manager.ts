/**
 * OVH Infrastructure Manager
 * Handles provisioning and managing OVH instances via Terraform Cloud API
 */

interface TerraformWorkspaceConfig {
  workspaceId: string;
  token: string;
  organization: string;
}

interface TerraformRunResult {
  runId: string;
  status: string;
  outputs?: Record<string, any>;
}

interface ProvisionHostRequest {
  region: string;
  instanceName: string;
  flavorName?: string; // OVH instance type
  controlPlaneUrl: string;
}

interface HostDetails {
  ovhInstanceId: string;
  ipAddress: string;
  region: string;
}

export class OVHManager {
  private tfToken: string;
  private tfOrganization: string;
  private tfWorkspaceId: string;

  constructor() {
    this.tfToken = process.env.TERRAFORM_TOKEN!;
    this.tfOrganization = process.env.TERRAFORM_ORGANIZATION!;
    this.tfWorkspaceId = process.env.TERRAFORM_WORKSPACE_ID!;

    if (!this.tfToken || !this.tfOrganization || !this.tfWorkspaceId) {
      throw new Error('Missing Terraform Cloud configuration');
    }
  }

  /**
   * Provision a new Firecracker host on OVH
   */
  async provisionHost(request: ProvisionHostRequest): Promise<HostDetails> {
    console.log('Provisioning OVH host:', request);

    // Create Terraform run
    const run = await this.createTerraformRun({
      message: `Provision Firecracker host in ${request.region}`,
      variables: {
        region: request.region,
        instance_name: request.instanceName,
        flavor_name: request.flavorName || 'b2-60', // 16 vCPU, 60GB RAM
        control_plane_url: request.controlPlaneUrl,
      },
    });

    // Poll for completion
    const result = await this.pollTerraformRun(run.runId);

    if (result.status !== 'applied') {
      throw new Error(`Terraform run failed: ${result.status}`);
    }

    // Extract outputs
    const outputs = await this.getTerraformOutputs(run.runId);

    return {
      ovhInstanceId: outputs.instance_id,
      ipAddress: outputs.ip_address,
      region: request.region,
    };
  }

  /**
   * Destroy a Firecracker host
   */
  async destroyHost(ovhInstanceId: string): Promise<void> {
    console.log('Destroying OVH host:', ovhInstanceId);

    // Create destroy run
    const run = await this.createTerraformRun({
      message: `Destroy host ${ovhInstanceId}`,
      isDestroy: true,
      variables: {
        target_instance_id: ovhInstanceId,
      },
    });

    // Poll for completion
    const result = await this.pollTerraformRun(run.runId);

    if (result.status !== 'applied') {
      throw new Error(`Terraform destroy failed: ${result.status}`);
    }
  }

  /**
   * Create a Terraform Cloud run
   */
  private async createTerraformRun(params: {
    message: string;
    variables?: Record<string, any>;
    isDestroy?: boolean;
  }): Promise<TerraformRunResult> {
    const response = await fetch(
      `https://app.terraform.io/api/v2/workspaces/${this.tfWorkspaceId}/runs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.tfToken}`,
          'Content-Type': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              message: params.message,
              'is-destroy': params.isDestroy || false,
              'auto-apply': true, // Auto-apply for automation
            },
            relationships: {
              workspace: {
                data: {
                  type: 'workspaces',
                  id: this.tfWorkspaceId,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Terraform run: ${error}`);
    }

    const data = await response.json();
    const runId = data.data.id;

    // Set variables if provided
    if (params.variables) {
      await this.setTerraformVariables(params.variables);
    }

    return {
      runId,
      status: data.data.attributes.status,
    };
  }

  /**
   * Poll Terraform run until completion
   */
  private async pollTerraformRun(
    runId: string,
    maxAttempts: number = 60,
    intervalMs: number = 10000
  ): Promise<TerraformRunResult> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://app.terraform.io/api/v2/runs/${runId}`, {
        headers: {
          Authorization: `Bearer ${this.tfToken}`,
          'Content-Type': 'application/vnd.api+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch run status: ${response.statusText}`);
      }

      const data = await response.json();
      const status = data.data.attributes.status;

      console.log(`Terraform run ${runId} status: ${status}`);

      // Terminal states
      if (status === 'applied' || status === 'planned_and_finished') {
        return { runId, status: 'applied' };
      }

      if (
        status === 'errored' ||
        status === 'canceled' ||
        status === 'force_canceled' ||
        status === 'discarded'
      ) {
        throw new Error(`Terraform run failed with status: ${status}`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Terraform run timed out after ${maxAttempts} attempts`);
  }

  /**
   * Get Terraform run outputs
   */
  private async getTerraformOutputs(runId: string): Promise<Record<string, any>> {
    // First get the state version from the run
    const runResponse = await fetch(`https://app.terraform.io/api/v2/runs/${runId}`, {
      headers: {
        Authorization: `Bearer ${this.tfToken}`,
        'Content-Type': 'application/vnd.api+json',
      },
    });

    const runData = await runResponse.json();
    const stateVersionId =
      runData.data.relationships['state-versions']?.data?.[0]?.id;

    if (!stateVersionId) {
      throw new Error('No state version found for run');
    }

    // Get outputs from state version
    const outputsResponse = await fetch(
      `https://app.terraform.io/api/v2/state-versions/${stateVersionId}/outputs`,
      {
        headers: {
          Authorization: `Bearer ${this.tfToken}`,
          'Content-Type': 'application/vnd.api+json',
        },
      }
    );

    const outputsData = await outputsResponse.json();
    const outputs: Record<string, any> = {};

    for (const output of outputsData.data || []) {
      outputs[output.attributes.name] = output.attributes.value;
    }

    return outputs;
  }

  /**
   * Set Terraform workspace variables
   */
  private async setTerraformVariables(
    variables: Record<string, any>
  ): Promise<void> {
    for (const [key, value] of Object.entries(variables)) {
      await fetch(
        `https://app.terraform.io/api/v2/workspaces/${this.tfWorkspaceId}/vars`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.tfToken}`,
            'Content-Type': 'application/vnd.api+json',
          },
          body: JSON.stringify({
            data: {
              type: 'vars',
              attributes: {
                key,
                value: String(value),
                category: 'terraform',
                hcl: false,
              },
            },
          }),
        }
      );
    }
  }

  /**
   * Check host health via HTTP endpoint
   */
  async checkHostHealth(ipAddress: string, port: number = 8080): Promise<boolean> {
    try {
      const response = await fetch(`http://${ipAddress}:${port}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('Host health check failed:', error);
      return false;
    }
  }

  /**
   * Get OVH instance details (direct API call)
   * This requires OVH API credentials
   */
  async getInstanceDetails(instanceId: string): Promise<any> {
    // TODO: Implement direct OVH API calls if needed
    // For now, we rely on Terraform state
    throw new Error('Not implemented - use Terraform state');
  }
}

export const ovhManager = new OVHManager();
