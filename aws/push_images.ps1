# Lấy thông tin AWS Account
$AccountId = (aws sts get-caller-identity --query Account --output text)
$Region = (aws configure get region)
if ([string]::IsNullOrWhiteSpace($Region)) {
    $Region = "us-east-1" # Region mặc định nếu chưa cấu hình
}

$RegistryUrl = "$AccountId.dkr.ecr.$Region.amazonaws.com"

Write-Host "Logging into AWS ECR at $Region..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $RegistryUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to login to ECR. Please check your AWS credentials." -ForegroundColor Red
    exit 1
}

# 1. Build & Push Backend
Write-Host "Building Backend Image..." -ForegroundColor Yellow
docker build -t japaneseproject-backend ./backend
docker tag japaneseproject-backend:latest "$RegistryUrl/japaneseproject-backend:latest"

Write-Host "Pushing Backend Image to ECR..." -ForegroundColor Yellow
docker push "$RegistryUrl/japaneseproject-backend:latest"

# 2. Build & Push Frontend
Write-Host "Building Frontend Image..." -ForegroundColor Yellow
docker build -t japaneseproject-frontend ./frontend
docker tag japaneseproject-frontend:latest "$RegistryUrl/japaneseproject-frontend:latest"

Write-Host "Pushing Frontend Image to ECR..." -ForegroundColor Yellow
docker push "$RegistryUrl/japaneseproject-frontend:latest"

# 3. Cấu hình ECR Lifecycle Policy để tự động giữ tối đa 10 images mới nhất
Write-Host "Applying ECR Lifecycle Policy (Keep max 10 images)..." -ForegroundColor Yellow
$PolicyJson = '{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep only 10 most recent images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}'

$PolicyPath = "$PSScriptRoot/ecr-policy.json"
$PolicyPath = $PolicyPath.Replace('\', '/')
$PolicyJson | Out-File -FilePath $PolicyPath -Encoding Ascii

aws ecr put-lifecycle-policy --repository-name japaneseproject-backend --lifecycle-policy-text "file://$PolicyPath" --region $Region
aws ecr put-lifecycle-policy --repository-name japaneseproject-frontend --lifecycle-policy-text "file://$PolicyPath" --region $Region

Remove-Item -Path $PolicyPath -Force

Write-Host "DOCKER IMAGES PUSHED SUCCESSFULLY & ECR POLICIES APPLIED!" -ForegroundColor Green
