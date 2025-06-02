## Infrastructure Deployment Guide - Infra Pattern

This guide tells an AI **exactly** what to do when implementing the **Infra Pattern** - creating infrastructure-as-code definitions within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific Infra Pattern implementation details.

**📍 Pattern Focus:** This document covers the `infra/` directory pattern only. For other patterns, refer to their respective documentation.

---

## Base Terraform Files - Required for Google Cloud Infrastructure

For **every** Google Cloud infrastructure request, regardless of the specific Google Cloud service being created, the following three base files must be created exactly as specified:

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
    google = {
      source = "hashicorp/google"
    }
  }
  required_version = ">= 1.3.7"
}
```

### 3. variables.tf

```hcl
// blank
```

> 🚨 **CRITICAL:** These files must be created **exactly** as shown above with no modifications. This ensures consistency across all Google Cloud infrastructure deployments.

---

## Google Cloud Services

### Cloud Run Service Base

When requesting a **Cloud Run service base**, create the following `main.tf` file **exactly** as specified:

```hcl
provider "google" {
  project = var.GCP_PROJECT_ID
}

resource "google_cloud_run_v2_service" "default" {
  name     = "${var.PROJECT}-${var.ENVIRONMENT}-${var.APP}"
  location = "us-central1"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.IMAGE_DIGEST_DEFAULT

      resources {
        limits = {
          cpu    = "2000m"
          memory = "4Gi"
        }

        cpu_idle = true

        startup_cpu_boost = false
      }

      ports {
        container_port = var.PORT
      }

      ##########################################
      # DYNAMIC ENV START
      ##########################################

      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      ##########################################
      # DYNAMIC ENV END
      ##########################################
    }
  }
}

data "google_iam_policy" "noauth" {
  binding {
    role    = "roles/run.invoker"
    members = ["allUsers"]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location = google_cloud_run_v2_service.default.location
  project  = google_cloud_run_v2_service.default.project
  service  = google_cloud_run_v2_service.default.name

  policy_data = data.google_iam_policy.noauth.policy_data
}
```

> 🚨 **CRITICAL REQUIREMENTS:**
>
> - **DO NOT** modify this file in any way
> - **DO NOT** add any environment variables
> - **DO NOT** fill out the variables.tf file
> - **DO NOT** change any of the critical variables: `PROJECT`, `ENVIRONMENT`, `APP`, `GCP_PROJECT_ID`, `IMAGE_DIGEST_DEFAULT`, `PORT`
> - These variables are managed by a separate system and must remain exactly as specified

---
