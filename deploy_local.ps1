# Local Manual Deploy Script (Bypass GitHub Actions Outage)
$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = "773280493664"
$ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "STARTING LOCAL MANUAL DEPLOY TO AWS ECR & EC2" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Step 1: Login to ECR
Write-Host ""
Write-Host "[1/5] Logging in to Amazon ECR..." -ForegroundColor Yellow
$loginPass = aws ecr get-login-password --region $AWS_REGION
$loginPass | docker login --username AWS --password-stdin $ECR_REGISTRY
if ($LASTEXITCODE -ne 0) { Write-Host "ECR Login failed!" -ForegroundColor Red; exit 1 }

# Step 2: Build & Push Backend
Write-Host ""
Write-Host "[2/5] Building Backend Docker Image..." -ForegroundColor Yellow
docker build -t "$ECR_REGISTRY/japaneseproject-backend:latest" ./backend
if ($LASTEXITCODE -ne 0) { Write-Host "Backend build failed!" -ForegroundColor Red; exit 1 }

Write-Host "Pushing Backend Image to ECR..." -ForegroundColor Yellow
docker push "$ECR_REGISTRY/japaneseproject-backend:latest"
if ($LASTEXITCODE -ne 0) { Write-Host "Backend push failed!" -ForegroundColor Red; exit 1 }

# Step 3: Build & Push Frontend
Write-Host ""
Write-Host "[3/5] Building Frontend Docker Image..." -ForegroundColor Yellow
docker build -t "$ECR_REGISTRY/japaneseproject-frontend:latest" ./frontend
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend build failed!" -ForegroundColor Red; exit 1 }

Write-Host "Pushing Frontend Image to ECR..." -ForegroundColor Yellow
docker push "$ECR_REGISTRY/japaneseproject-frontend:latest"
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend push failed!" -ForegroundColor Red; exit 1 }

# Step 4: Find EC2 Instance ID
Write-Host ""
Write-Host "[4/5] Finding EC2 Instance ID..." -ForegroundColor Yellow
$INSTANCE_ID = aws ec2 describe-instances --filters "Name=tag:aws:cloudformation:stack-name,Values=JapaneseProjectStack" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].InstanceId" --output text --region $AWS_REGION
Write-Host "Found EC2 Instance: $INSTANCE_ID" -ForegroundColor Green

# Step 5: Send SSM Redeploy Command
Write-Host ""
Write-Host "[5/5] Triggering AWS SSM Redeploy on EC2..." -ForegroundColor Yellow
$COMMAND = "cd /home/ec2-user/app && docker image prune -af && aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com && docker-compose pull && docker-compose up -d --remove-orphans"

aws ssm send-command `
  --document-name "AWS-RunShellScript" `
  --instance-ids "$INSTANCE_ID" `
  --parameters "commands=[`"$COMMAND`"]" `
  --comment "Local Manual Redeploy" `
  --region $AWS_REGION

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMMAND SENT SUCCESSFULLY TO EC2!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
