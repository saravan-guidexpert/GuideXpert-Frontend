$ErrorActionPreference = "Stop"
$gh = "$env:ProgramFiles\GitHub CLI\gh.exe"
$repo = "sripavantejb/GuideXpert-Frontend"
$srcRoot = "c:\Users\Nxtwave\Desktop\guidexpert\frontend"

$files = @(
  'src/pages/studentsTools/BranchPredictorPage.jsx',
  'src/pages/studentsTools/CollegeComparisonPage.jsx',
  'src/pages/studentsTools/CollegeFitTestPage.jsx',
  'src/pages/studentsTools/CollegePredictorPage.jsx',
  'src/pages/studentsTools/CourseFitTestPage.jsx',
  'src/pages/studentsTools/DeadlineManagerPage.jsx',
  'src/pages/studentsTools/ExamPredictorPage.jsx',
  'src/pages/studentsTools/StudentCollegePredictorPredictPage.jsx',
  'src/pages/studentsTools/StudentExamPredictorPage.jsx',
  'src/pages/studentsTools/components/RelatedToolsSection.jsx',
  'src/pages/studentsTools/components/ToolWorkspaceLayout.jsx',
  'src/pages/studentsTools/components/ToolFactsPreview.jsx'
)

Write-Host "Fetching remote HEAD..."
$repoInfo = & $gh api "repos/$repo" | ConvertFrom-Json
$branch = $repoInfo.default_branch
$ref = & $gh api "repos/$repo/git/ref/heads/$branch" | ConvertFrom-Json
$headSha = $ref.object.sha
$commit = & $gh api "repos/$repo/git/commits/$headSha" | ConvertFrom-Json
$baseTree = $commit.tree.sha
Write-Host "branch=$branch HEAD=$($headSha.Substring(0,7))"

$treeItems = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($rel in $files) {
  $full = Join-Path $srcRoot ($rel -replace '/', '\')
  if (-not (Test-Path $full)) { Write-Host "MISSING $rel"; continue }
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $b64 = [Convert]::ToBase64String($bytes)
  $blobBody = (@{ content = $b64; encoding = "base64" } | ConvertTo-Json -Compress)
  $blobPath = Join-Path $env:TEMP ("gx-fe-blob-" + [guid]::NewGuid().ToString() + ".json")
  [System.IO.File]::WriteAllText($blobPath, $blobBody, [System.Text.UTF8Encoding]::new($false))
  $blob = & $gh api "repos/$repo/git/blobs" --method POST --input $blobPath | ConvertFrom-Json
  Remove-Item $blobPath -Force
  $i++
  Write-Host ("[{0}/{1}] {2}" -f $i, $files.Count, $rel)
  $treeItems.Add(@{ path = $rel; mode = "100644"; type = "blob"; sha = $blob.sha }) | Out-Null
}

$treePayload = (@{ base_tree = $baseTree; tree = @($treeItems.ToArray()) } | ConvertTo-Json -Depth 8 -Compress)
$treePath = Join-Path $env:TEMP "gx-fe-tree.json"
[System.IO.File]::WriteAllText($treePath, $treePayload, [System.Text.UTF8Encoding]::new($false))
$newTree = & $gh api "repos/$repo/git/trees" --method POST --input $treePath | ConvertFrom-Json
Remove-Item $treePath -Force

$commitMsg = "Redesign tool about sections with professional alignment across predictors.`n`nOpen layout, shared ToolFactsPreview, and clearer spacing so every tool page reads as tool-first instead of congested cards."
$commitPayload = (@{ message = $commitMsg; tree = $newTree.sha; parents = @($headSha) } | ConvertTo-Json -Depth 5 -Compress)
$commitPath = Join-Path $env:TEMP "gx-fe-commit.json"
[System.IO.File]::WriteAllText($commitPath, $commitPayload, [System.Text.UTF8Encoding]::new($false))
$newCommit = & $gh api "repos/$repo/git/commits" --method POST --input $commitPath | ConvertFrom-Json
Remove-Item $commitPath -Force

$refPayload = (@{ sha = $newCommit.sha; force = $false } | ConvertTo-Json -Compress)
$refPath = Join-Path $env:TEMP "gx-fe-ref.json"
[System.IO.File]::WriteAllText($refPath, $refPayload, [System.Text.UTF8Encoding]::new($false))
& $gh api "repos/$repo/git/refs/heads/$branch" --method PATCH --input $refPath | Out-Null
Remove-Item $refPath -Force

Write-Host ("Pushed to {0}: https://github.com/{1}/commit/{2}" -f $branch, $repo, $newCommit.sha)
Write-Host $newCommit.sha
