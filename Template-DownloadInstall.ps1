$ErrorActionPreference = "SilentlyContinue"
md C:\tmp
$i = 0
$urlArray = "https://stubdownloader.cdn.mozilla.net/builds/firefox-stub/en-US/win/8cfa56b0b4b4976670240aba0a71db342a748e760fdd498f42ad9d529202bd25/Firefox%20Installer.exe","https://notepad-plus-plus.org/repository/7.x/7.5.4/npp.7.5.4.Installer.x64.exe"
$one = 1
$i2 = 0

function Pause
{
	Read-Host 'Press Enter once the Program has been installed'| Out-Null
}

while($i -lt $urlArray.Count){ 
$url = $urlArray[$i]
Write-Output $url
$output = "program" + $i + ".exe"
Invoke-WebRequest -Uri $url -OutFile $output
Write-Output "Successfully Downloaded Program" 
cd C:\tmp
$programName = ".\program" + $i + ".exe"
Invoke-Expression $programName
Pause
if(-NOT ($i2 -eq 1)){
$i2 = $i2 + $one
}
else{
$i = $i + $one
}
}
Remove-Item -path c:\tmp -recurse
Write-Output "Program Installations Complete"
