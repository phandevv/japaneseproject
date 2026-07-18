# Script to build and push Docker images from local to ECR, then trigger EC2 redeploy
# (Bypasses GitLab CI/CD compute minutes limits)

# Ensure script stops on error
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "1. Logging into AWS ECR..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 773280493664.dkr.ecr.us-east-1.amazonaws.com

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "2. Building Backend Docker Image..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
docker build -t 773280493664.dkr.ecr.us-east-1.amazonaws.com/japaneseproject-backend:latest ./backend

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "3. Building Frontend Docker Image..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
docker build -t 773280493664.dkr.ecr.us-east-1.amazonaws.com/japaneseproject-frontend:latest ./frontend

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "4. Pushing Backend to AWS ECR..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
docker push 773280493664.dkr.ecr.us-east-1.amazonaws.com/japaneseproject-backend:latest

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "5. Pushing Frontend to AWS ECR..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
docker push 773280493664.dkr.ecr.us-east-1.amazonaws.com/japaneseproject-frontend:latest

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "6. Triggering Redeploy on EC2 i-04d57c7b36c17dc32..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
$Command = "cd /home/ec2-user/app && aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 773280493664.dkr.ecr.us-east-1.amazonaws.com && docker-compose pull && docker-compose --env-file .env up -d --force-recreate --remove-orphans"
aws ssm send-command --document-name "AWS-RunShellScript" --instance-ids "i-04d57c7b36c17dc32" --parameters commands="$Command" --region us-east-1

Write-Host "========================================================" -ForegroundColor Green
Write-Host "SUCCESS: Deployment triggered successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
