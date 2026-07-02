Write-Host "WARNING: Thao tac nay se xoa TOAN BO tai nguyen tren AWS." -ForegroundColor Yellow
$StackName = "JapaneseProjectStack"

aws cloudformation delete-stack --stack-name $StackName

Write-Host "Dang xoa resource. Vui long doi khoang 5-10 phut..." -ForegroundColor Cyan
aws cloudformation wait stack-delete-complete --stack-name $StackName

Write-Host "Da xoa toan bo resource thanh cong! Tai khoan cua ban se khong bi tru tien nua." -ForegroundColor Green
