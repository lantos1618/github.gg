# VM System - Quick Reference Guide

## TL;DR: The Big Picture

```
Two Systems:
1. user_vms (Simple: 1 per user)
2. dev_environments (Flexible: multiple per user)

Both implemented with:
- Redis + BullMQ queue system
- Docker provider (development)
- OVH provider (production)
- tRPC API endpoints
- Real-time provisioning logs
```

---

## Files & What They Do

### Core VM System
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/vm/docker-provider.ts` | Fast local containers | COMPLETE |
| `src/lib/vm/ovh-provider.ts` | OVH cloud instances | COMPLETE |
| `src/lib/vm/user-vm-service.ts` | User VM business logic | COMPLETE |
| `src/lib/vm/provision-logger.ts` | Real-time logging | COMPLETE |

### Queuing & Workers
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/queue/vm-queue.ts` | Redis queue setup | COMPLETE |
| `src/workers/vm-worker.ts` | Job processing | COMPLETE |

### Environment Management
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/dev-env/orchestrator.ts` | State machine & quotas | 90% (Firecracker TODO) |
| `src/lib/dev-env/ovh-manager.ts` | OVH host provisioning | COMPLETE |
| `src/lib/dev-env/command-processor.ts` | Email commands | IN PROGRESS |
| `src/lib/dev-env/email-service.ts` | Email integration | IN PROGRESS |
| `src/lib/dev-env/email-parser.ts` | Parse email commands | IN PROGRESS |

### Database
| File | Purpose | Status |
|------|---------|--------|
| `src/db/schema/user-vms.ts` | User VM table | COMPLETE |
| `src/db/schema/dev-environments.ts` | 6 tables for environments | COMPLETE |
| `src/db/schema/email.ts` | Email-related tables | COMPLETE |

### API & UI
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/trpc/routes/vm.ts` | Type-safe API | COMPLETE |
| `src/app/my-vm/page.tsx` | User VM UI | COMPLETE |
| `src/app/admin/vms/page.tsx` | Admin dashboard | COMPLETE |

---

## Three Key Queues

### vm-provision Queue (Concurrency: 2)
```
Job: Create a new VM
Input: {environmentId, userId, vcpus, memoryMb, diskGb}
Output: VM with IP and SSH port
Flow:
  1. Update state to "provisioning"
  2. Call provider.createVM()
  3. Store IP and SSH port
  4. Update state to "running"
  5. Update user_vms with details
Retries: 3 with exponential backoff
```

### vm-control Queue (Concurrency: 5)
```
Jobs: start, stop, destroy
Input: {environmentId}
Output: Updated state
Flow:
  1. Get VM details from DB
  2. Call provider.startVM/stopVM/destroyVM
  3. Update state and timestamps
Retries: 2 with exponential backoff
```

### (Optional) Real-time Logs via Redis
```
Key: provision-logs:{userId}
TTL: 1 hour
Max: 100 entries
Format: [{timestamp, message, level}]
Access: Via tRPC vm.getProvisionLogs()
```

---

## Docker Provider: How It Works

```
Input: {name, vcpus, memoryMb, environmentVars}

Step 1: Find available port (start from 2222)
Step 2: docker run with limits
  - rastasheep/ubuntu-sshd image
  - --cpus={vcpus}
  - --memory={memoryMb}m
  - -p {port}:22
Step 3: Wait for container to be healthy
Step 4: Get container IP
Step 5: Return {containerId, ipAddress, sshPort}

SSH Access: root:root@localhost:{port}
```

---

## OVH Provider: How It Works

```
Input: {name, vcpus, memoryMb, diskGb}

Step 1: getFlavorForResources()
  - Fetch all flavors from OVH API
  - Filter by: available, vcpus >= requested, ram >= requested
  - Filter by type: ovh.ssd.eg, ovh.ssd.cpu, ovh.d2
  - Sort by total resources (smallest first)
  - Return best match flavor ID

Step 2: getUbuntuImage()
  - Find Ubuntu 22.04 image

Step 3: ensureSshKey()
  - Use existing 'firecracker-host' or 'github-gg-vm-key'

Step 4: POST /cloud/project/{projectId}/instance
  - Create instance with flavor, image, SSH key

Step 5: waitForInstanceActive()
  - Poll every 5 seconds
  - Max 300 seconds

Step 6: Get public IP

Output: {instanceId, ipAddress, sshPort: 22}
```

---

## User VM Tier-Based Resources

```
Free Tier:
  - 2 vCPUs
  - 4 GB RAM
  - 10 GB disk
  - Auto-stop after 60 minutes idle
  - 1 environment max

Pro Tier:
  - 4 vCPUs
  - 8 GB RAM
  - 50 GB disk
  - Never auto-stops
  - 3 environments max

Unlimited Tier:
  - 8 vCPUs
  - 16 GB RAM
  - 100 GB disk
  - Never auto-stops
  - Unlimited environments
```

---

## Environment State Machine

```
User Creates Environment
  ↓
[requested]
  ↓
[provisioning] ← worker calls provider.createVM()
  ↓
[starting] ← user clicks "Start" or auto-starts
  ↓
[running] ← available for use
  ↓
[stopping] ← user clicks "Stop"
  ↓
[stopped] ← can restart
  ↑
  └─ User clicks "Start" again ─┘
  
Or:
[running] → [destroying] → [destroyed]

Or at any point:
[any state] → [error] (terminal, needs recovery)
```

---

## User VM State Machine (Simplified)

```
pending
   ↓
provisioning
   ↓
stopped ← → running
   ↓         ↑
   └─────────┘
   
error (needs manual recovery)
```

---

## tRPC Endpoints Summary

### Queries (Read)
```
vm.getMyVm()
  → {id, status, vcpus, memoryMb, diskGb, sshPort, ...}

vm.getProvisionLogs()
  → [{timestamp, message, level}]

vm.listFlavors()
  → [{name, vcpus, ram, disk, type, available}]

vm.getAllVms() [ADMIN]
  → {vms: [...], hosts: [...], stats: {...}}
```

### Mutations (Write)
```
vm.provisionMyVm(vcpus?, memoryMb?, diskGb?)
  → {id, status: 'pending', ...}
  (async - calls orchestrator, queues job)

vm.startMyVm()
  → {id, status: 'running', ...}
  (queues start job)

vm.stopMyVm()
  → {id, status: 'stopped', ...}
  (queues stop job)

vm.executeCode(code: string)
  → {stdout: string, stderr: string, exitCode: number}
  (via SSH, auto-starts VM if stopped)

vm.destroyMyVm()
  → {success: true}
  (queues destroy job)

vm.destroyVm(vmId) [ADMIN]
  → {success: true}
```

---

## What's Implemented vs Not

### DONE (Production Ready)
- Docker provider with SSH execution
- OVH provider with API integration
- Queue system with BullMQ
- State machines
- Quota enforcement
- Audit logging
- tRPC API
- UI pages
- Provision logger

### TODO (Firecracker Integration)
```typescript
// In orchestrator.ts, lines 360-386
async provisionVM(environment) {
  // TODO: Call Firecracker control plane agent on host
  console.log('Provisioning VM:', environment.vmId);
}

async startVM(environment) {
  // TODO: Call Firecracker control plane agent
  console.log('Starting VM:', environment.vmId);
}

async stopVM(environment) {
  // TODO: Call Firecracker control plane agent
  console.log('Stopping VM:', environment.vmId);
}

async destroyVM(environment) {
  // TODO: Call Firecracker control plane agent
  console.log('Destroying VM:', environment.vmId);
  // Currently only cleans up DB
}
```

### IN PROGRESS (Email Integration)
- command-processor.ts
- email-parser.ts
- email-service.ts

---

## Deployment Modes

### Development (Docker)
```bash
export VM_PROVIDER=docker
redis-server  # Terminal 1
bun worker:vm  # Terminal 2
bun dev        # Terminal 3
```

### Production (OVH)
```bash
export VM_PROVIDER=ovh
# Ensure OVH env vars are set
redis-server  # Terminal 1
bun worker:vm  # Terminal 2
bun start      # Terminal 3
```

---

## Quick Debug Checklist

If VMs not provisioning:
1. Is Redis running? `redis-cli ping`
2. Is worker running? `ps aux | grep vm-worker`
3. Check worker logs for errors
4. For Docker: `docker ps -a --filter label=gh.gg/managed=true`
5. For OVH: Check OVH dashboard for instances
6. Check database: `SELECT * FROM user_vms;`

If SSH execution fails:
1. Is VM in 'running' state?
2. Is IP correct? `docker inspect {containerId}` or OVH dashboard
3. Can you reach it? `ssh -p {port} root@{ip}`
4. Check firewall rules

If logs missing:
1. Redis logs expire after 1 hour
2. Check key: `redis-cli LLEN provision-logs:{userId}`
3. Check if provisioning failed: `SELECT state FROM dev_environments;`

---

## Architecture Decision: Why Two Systems?

```
user_vms (Simple)
├─ Pros: Easy to understand, 1 per user, straightforward
├─ Cons: No quotas, no audit, limited flexibility
└─ Use Case: Casual users, single development environment

dev_environments (Flexible)
├─ Pros: Multiple per user, quotas, audit trail, extensible
├─ Cons: More complex, requires quota management
└─ Use Case: Power users, multiple deployments, multi-tenancy

Solution:
- Use user_vms as the "default" for most users
- Use dev_environments for advanced scenarios
- Link them: user_vms.environmentId → dev_environments.id
```

---

## Next Major Features

**Priority 1: Firecracker Control Plane**
- Implement WebSocket connection to Firecracker host
- Send VM lifecycle commands
- Get status updates
- Required for `dev_environments` to work fully

**Priority 2: Email-Based Provisioning**
- Complete command-processor.ts
- Complete email-parser.ts
- Allow users to: `echo "provision 2cpu 4gb" | mail agent@github.gg`
- Webhook integration with SendGrid

**Priority 3: Real-Time Terminal**
- WebSocket for command output streaming
- Interactive shell support
- File management

**Priority 4: Production Hardening**
- Dead-letter queue for failed jobs
- Health monitoring
- Metrics and dashboards
- Billing integration

