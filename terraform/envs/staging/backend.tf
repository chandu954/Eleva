# Configure the S3 bucket, region and state key at `terraform init` time.
# S3 native lockfiles (Terraform 1.10+) provide state locking without a
# separate DynamoDB table.
terraform {
  backend "s3" {
    encrypt              = true
    use_lockfile         = true
    workspace_key_prefix = "eleva-staging"
  }
}
