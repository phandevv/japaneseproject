$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8=1

Write-Host "Starting AWS CloudFormation deployment..." -ForegroundColor Cyan

$StackName = "JapaneseProjectStack"
$TemplateFile = "aws/template.yaml"

aws cloudformation deploy `
    --template-file $TemplateFile `
    --stack-name $StackName `
    --capabilities CAPABILITY_NAMED_IAM

Write-Host "Deployment completed. Lay thong tin resource (Outputs):" -ForegroundColor Green
aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs" --output table
