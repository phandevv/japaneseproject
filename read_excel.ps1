$files = Get-ChildItem -Path "c:\Users\bbqdd\Documents\_my\japaneseproject\Từ-vựng-N5-N1.xlsx"
$filePath = $files[0].FullName
Write-Host "Found file: $filePath"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open($filePath)
foreach($ws in $wb.Worksheets) {
    Write-Host "=== Sheet: $($ws.Name), Rows: $($ws.UsedRange.Rows.Count), Cols: $($ws.UsedRange.Columns.Count) ==="
    for($r=1; $r -le [Math]::Min(5, $ws.UsedRange.Rows.Count); $r++) {
        $row = @()
        for($c=1; $c -le $ws.UsedRange.Columns.Count; $c++) {
            $row += $ws.Cells.Item($r, $c).Text
        }
        Write-Host ($row -join " | ")
    }
}
$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
