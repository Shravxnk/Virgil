$pages = @(
  'c:\Users\suyas\Downloads\chakravyuh\apps\web\app\analyst\pre-txn-analytics\page.tsx',
  'c:\Users\suyas\Downloads\chakravyuh\apps\web\app\analyst\transactions\page.tsx',
  'c:\Users\suyas\Downloads\chakravyuh\apps\web\app\executive\page.tsx',
  'c:\Users\suyas\Downloads\chakravyuh\apps\web\app\executive\compliance\page.tsx',
  'c:\Users\suyas\Downloads\chakravyuh\apps\web\app\executive\model-health\page.tsx'
)
foreach ($p in $pages) {
  if (Test-Path $p) {
    $c = Get-Content $p -Raw
    $c = $c -replace 'rounded-xl border border-red-200 bg-red-50 p-6 text-center', 'rounded p-6 text-center'
    $c = $c -replace 'text-red-700 font-medium', 'font-medium'
    $c = $c -replace 'rounded-xl border bg-white p-12 text-center', 'rounded p-12 text-center'
    $c = $c -replace 'text-sm text-muted-foreground', 'text-xs'
    Set-Content $p $c
    Write-Host ('Updated: ' + $p)
  }
}
Write-Host 'All done'
