# multi-tier-app-main

Automated Multi-Tier Application Deployment using Docker, Terraform, Ansible, Kubernetes, and ArgoCD.

## Technology Stack

| Category                 | Technology            |
| ------------------------ | --------------------- |
| Containerization         | Docker                |
| Infrastructure as Code   | Terraform             |
| Configuration Management | Ansible               |
| Container Orchestration  | Kubernetes (MicroK8s) |
| CI/CD                    | GitHub Actions        |
| GitOps                   | ArgoCD                |
| Cloud Provider           | AWS EC2, VPC          |

## Deployment Pipeline Overview

| Phase   | Tool           | Description                                   |
| ------- | -------------- | --------------------------------------------- |
| Phase 1 | Local Setup    | Install tools, create GitHub repo, sample app |
| Phase 2 | Dockerization  | Dockerfiles for frontend & backend            |
| Phase 3 | Terraform      | Provision EC2, VPC, Security Groups on AWS    |
| Phase 4 | Ansible        | Configure EC2, install MicroK8s               |
| Phase 5 | Kubernetes     | Deployments & Services manifests              |
| Phase 6 | GitHub Actions | CI pipeline (build & push images)             |
| Phase 7 | ArgoCD         | CD synchronization to the cluster             |
| Phase 8 | Verify & Test  | End-to-end pipeline validation                |

---

## Prerequisites

Before starting, ensure you have:

- **AWS Account** with Console access and IAM user with programmatic access
- **GitHub Account** (free): https://github.com
- **DockerHub Account** (free): https://hub.docker.com
- **Local machine** running Linux, macOS, or Windows with WSL2
- **Tools to install locally**: terraform, ansible, git, docker, aws cli
- **Estimated time**: 3–5 hours

---

## Phase 1: Local Setup — Tools, Repository and Sample App

### 1.1 Install Required Tools

**Git:**

```bash
git --version
# If not installed:
sudo apt-get update && sudo apt-get install git -y
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

**Docker:**

```bash
sudo apt-get update
sudo apt-get install docker.io -y
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

**Terraform (version 1.6+):**

```bash
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt-get install terraform -y
terraform -version
```

**Ansible:**

```bash
sudo apt update
sudo apt install -y ansible
ansible --version
```

**AWS CLI:**

```bash
sudo apt-get install awscli -y
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g. us-east-1), Output format: json
```

### 1.2 Create EC2 Key Pair

1. In AWS Console, search for **EC2** and open it
2. Under **Network & Security**, click **Key Pairs**
3. Click **Create key pair**: Name: `project3-key`, Type: RSA, Format: `.pem`
4. Save the downloaded `project3-key.pem` to your home directory
5. Set permissions: `chmod 400 ~/project3-key.pem`

### 1.3 Create the Folder Structure

```bash
mkdir -p frontend/src backend terraform ansible k8s .github/workflows
```

**Project Structure:**

```
multi-tier-app/
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   ├── package.json
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
├── ansible/
│   ├── inventory.ini
│   ├── playbook.yml
├── k8s/
│   ├── backend-deployment.yml
│   ├── backend-service.yml
│   ├── frontend-deployment.yml
│   ├── frontend-service.yml
├── .github/
│   ├── workflows/
│   ├── ci.yml
├── README.md
```

---

## Phase 2: Dockerization — Write Dockerfiles for Each Service

### 2.1 Backend Dockerfile

```dockerfile
# filepath: backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### 2.2 Frontend Dockerfile

```dockerfile
# filepath: frontend/Dockerfile
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY src/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 2.3 Build and Test Locally

```bash
# Build backend
cd backend
docker build -t multi-tier-backend:test .
docker run -d --name backend-test -p 3001:3001 multi-tier-backend:test
curl http://localhost:3001/api/health

# Build frontend
cd ../frontend
docker build -t multi-tier-frontend:test .
docker run -d --name frontend-test -p 8080:80 multi-tier-frontend:test
# Open browser: http://localhost:8080

# Clean up
docker stop backend-test frontend-test
docker rm backend-test frontend-test
```

---

## Phase 3: Terraform — Provision EC2, VPC and Security Groups

### 3.1 Create terraform/variables.tf

```hcl
# filepath: terraform/variables.tf
variable "aws_region" {
  description = "AWS region to deploy in"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.medium"
}

variable "key_name" {
  description = "EC2 key pair name"
  type        = string
  default     = "project3-key"
}

variable "ami_id" {
  description = "Ubuntu 22.04 LTS AMI (us-east-1)"
  type        = string
  default     = "ami-0261755bbcb8c4a84"
}
```

### 3.2 Create terraform/main.tf

Creates: VPC, Internet Gateway, Public Subnet, Route Table, Security Group, EC2 Instance.

```bash
cd terraform
terraform init
terraform plan
terraform apply
# Type "yes" when prompted
```

**Outputs:**

- `instance_public_ip` - Public IP of the EC2 instance
- `instance_public_dns` - Public DNS of the EC2 instance
- `ssh command` - SSH command to connect

---

## Phase 4: Ansible — Configure EC2 and Install MicroK8s

> **Note:** Wait 2-3 minutes after Terraform finishes before running Ansible.

### 4.1 Create ansible/inventory.ini

```ini
# filepath: ansible/inventory.ini
[app_servers]
<EC2_IP> ansible_user=ubuntu ansible_ssh_private_key_file=~/project3-key.pem
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

### 4.2 Create ansible/playbook.yml

The playbook installs:

- System package updates
- Docker
- MicroK8s via Snap
- DNS, Storage, Ingress addons
- ArgoCD

### 4.3 Run the Ansible Playbook

```bash
# Test connection
ansible -i ansible/inventory.ini app_servers -m ping

# Run full playbook
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

**Verify:**

```bash
ssh -i ~/project3-key.pem ubuntu@<EC2_IP>
microk8s status
microk8s kubectl get nodes
```

---

## Phase 5: Kubernetes Manifests — Deployments and Services

### 5.1 Backend Kubernetes Manifests

**k8s/backend-deployment.yml:**

- 2 replicas
- Image: `YOUR_DOCKERHUB_USERNAME/multi-tier-backend:latest`
- Port: 3001
- Health check: `/api/health`

**k8s/backend-service.yml:**

- Type: NodePort
- Port: 3001, NodePort: 30001

### 5.2 Frontend Kubernetes Manifests

**k8s/frontend-deployment.yml:**

- 2 replicas
- Image: `YOUR_DOCKERHUB_USERNAME/multi-tier-frontend:latest`
- Port: 80

**k8s/frontend-service.yml:**

- Type: NodePort
- Port: 80, NodePort: 30080

---

## Phase 6: GitHub Actions — CI Pipeline

### 6.1 Set Up DockerHub and GitHub Secrets

In GitHub repository **Settings** → **Secrets and variables** → **Actions**, add:

| Secret Name        | Value                       |
| ------------------ | --------------------------- |
| DOCKERHUB_USERNAME | Your DockerHub username     |
| DOCKERHUB_TOKEN    | Your DockerHub access token |

To get DockerHub token: https://hub.docker.com → Account Settings → Security → New Access Token

### 6.2 Create .github/workflows/ci.yml

```yaml
# filepath: .github/workflows/ci.yml
name: CI - Build and Push Docker Images

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

env:
  DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
  IMAGE_TAG: ${{ github.sha }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.DOCKERHUB_USERNAME }}/multi-tier-backend:latest
            ${{ env.DOCKERHUB_USERNAME }}/multi-tier-backend:${{ env.IMAGE_TAG }}
      - uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ env.DOCKERHUB_USERNAME }}/multi-tier-frontend:latest
            ${{ env.DOCKERHUB_USERNAME }}/multi-tier-frontend:${{ env.IMAGE_TAG }}
      - name: Update Kubernetes manifests
        run: |
          sed -i "s|multi-tier-backend:.*|multi-tier-backend:${{ env.IMAGE_TAG }}|" k8s/backend-deployment.yml
          sed -i "s|multi-tier-frontend:.*|multi-tier-frontend:${{ env.IMAGE_TAG }}|" k8s/frontend-deployment.yml
      - name: Commit and push updated manifests
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add k8s/backend-deployment.yml k8s/frontend-deployment.yml
          git diff --staged --quiet || git commit -m "ci: update image tags to ${{ env.IMAGE_TAG }}"
          git push
```

### 6.3 Push to GitHub

```bash
git add .
git commit -m "feat: initial project setup with Docker, Terraform, Ansible, K8s and CI"
git push origin main
```

Watch the workflow in GitHub **Actions** tab. It will:

1. Checkout code
2. Login to DockerHub
3. Build & push backend image
4. Build & push frontend image
5. Update K8s manifests with new image tag
6. Commit updated manifests back to GitHub

---

## Phase 7: ArgoCD — Continuous Deployment to Kubernetes

### 7.1 Get ArgoCD Admin Password

```bash
ssh -i ~/project3-key.pem ubuntu@<EC2_IP>
microk8s kubectl get pods -n argocd
microk8s kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
microk8s kubectl get svc argocd-server -n argocd
```

### 7.2 Open ArgoCD in Browser

Navigate to: `https://<EC2_IP>:<ARGOCD_NODEPORT>`

Login with:

- Username: `admin`
- Password: (from step 7.1)

### 7.3 Connect Repository to ArgoCD

1. Click **Settings** (gear icon) → **Repositories**
2. Click **CONNECT REPO**
3. Fill in:
   - Repository URL: `https://github.com/<YOUR_USERNAME>/multi-tier-app.git`
   - Username: your GitHub username (if private repo)
   - Password: leave blank (for public repo)

### 7.4 Create ArgoCD Application

1. Click **NEW APP**
2. Fill in:
   - **Application Name**: `multi-tier-app`
   - **Project Name**: `default`
   - **Sync Policy**: `Automatic`
   - **PRUNE RESOURCES**: checked
   - **SELF HEAL**: checked
   - **Repository URL**: `https://github.com/<YOUR_USERNAME>/multi-tier-app.git`
   - **Revision**: `HEAD`
   - **Path**: `k8s`
   - **Cluster URL**: `https://kubernetes.default.svc`
   - **Namespace**: `default`
3. Click **CREATE**

ArgoCD will sync and deploy the application to the cluster.

---

## Phase 8: Verify and Test

### 8.1 Verify Kubernetes Pods

```bash
ssh -i ~/project3-key.pem ubuntu@<EC2_IP>
microk8s kubectl get pods
# Should see: 2 frontend + 2 backend pods (Running)

microk8s kubectl get services
# Should see: frontend-service (NodePort 30080), backend-service (NodePort 30001)
```

### 8.2 Access the Application

- **Frontend**: `http://<EC2_IP>:30080`
- **Backend API**: `http://<EC2_IP>:30001/api/health`

### 8.3 Test the Full CI/CD Pipeline

1. Make a code change
2. Commit and push to GitHub
3. Watch GitHub Actions build new images
4. Watch ArgoCD sync the changes
5. Verify the updated application

---

## Cleanup (After Grading)

```bash
# Destroy Terraform resources
cd terraform
terraform destroy

# Delete DockerHub repositories (optional)
# Delete GitHub repository (optional)
```

---

## Application Details

- **Frontend**: React-based web UI served via Nginx
- **Backend**: Express.js REST API running on port 3001
- **Sample Data**: Football knowledge hub with listings

```

```
