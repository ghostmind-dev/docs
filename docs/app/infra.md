## Infrastructure Deployment Guide - Infra Pattern

This guide tells an AI **exactly** what to do when implementing the **Infra Pattern** - creating infrastructure-as-code definitions within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific Infra Pattern implementation details.

**📍 Pattern Focus:** This document covers the `infra/` directory pattern only. For other patterns, refer to their respective documentation.

---

## Base Terraform Files - Required for All Infrastructure

For **every** Terraform infrastructure request, regardless of the specific cloud provider or service being created, the following four base files must be created exactly as specified:

### 1. backend.tf

```hcl
terraform {
  backend "gcs" {}
}
```

### 2. versions.tf

```hcl
terraform {
  required_providers {
    # Provider will be specified based on client requirements
    # Example: google, aws, azurerm, etc.
  }
  required_version = ">= 1.3.7"
}
```

### 3. variables.tf

```hcl
// blank
```

### 4. main.tf

The main.tf file should include the core variables that are commonly needed across infrastructure deployments. The specific implementation will vary based on the cloud provider and services, but these variables should be considered:

#### Required Variables (Always Include):

- `PROJECT` - The project identifier
- `ENVIRONMENT` - The deployment environment (dev, staging, prod, etc.)
- `APP` - The application name

#### Conditional Variables (Include When Applicable):

- `IMAGE_DIGEST_DEFAULT` - Only required when deploying containerized applications with Docker images
- `PORT` - Only required when the infrastructure needs to expose network ports

> 🚨 **CRITICAL:** These base files must be created **exactly** as shown above with no modifications to ensure consistency across all infrastructure deployments. The `versions.tf` provider section will be customized based on client requirements (Google Cloud, AWS, Azure, etc.).

---

## Implementation Notes

When implementing infrastructure:

1. **Always create all 4 base files** regardless of the specific infrastructure being deployed
2. **Backend is always GCS** - we use Google Cloud Storage as the backend for all Terraform state
3. **Variables.tf starts blank** - it will be populated based on specific infrastructure needs
4. **Main.tf variables** - include the required variables (PROJECT, ENVIRONMENT, APP) and conditional variables only when needed
5. **Provider-specific configurations** will be added to versions.tf and main.tf based on client requirements

---
