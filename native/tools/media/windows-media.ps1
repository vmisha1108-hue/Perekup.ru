param([Parameter(Mandatory=$true)][string]$CommandDirectory,[Parameter(Mandatory=$true)][int]$OwnerPid)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
function Emit($value) { [Console]::WriteLine(($value | ConvertTo-Json -Compress -Depth 9)); [Console]::Out.Flush() }
try {
 Add-Type -AssemblyName System.Runtime.WindowsRuntime
 $ManagerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
 $PropertiesType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
 $StreamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType=WindowsRuntime]
 $ReaderType = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime]
 $script:AsTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
 function Await($operation,[Type]$resultType) {
  $task = $script:AsTask.MakeGenericMethod($resultType).Invoke($null,@($operation))
  if (!$task.Wait(1800)) { try { $operation.Cancel() } catch {}; throw 'Media operation timed out' }
  return $task.GetAwaiter().GetResult()
 }
 $manager = Await ($ManagerType::RequestAsync()) $ManagerType
 $selected = ''; $preferred = ''; $lastArtSignature = ''; $lastArtKey = ''; $lastArt = ''; $quit = $false; $labels=@{}; $pollNumber=0
 while (!$quit) {
  try { $owner = [Diagnostics.Process]::GetProcessById($OwnerPid); $exited=$owner.HasExited; $owner.Dispose(); if ($exited) { break } } catch { break }
  $map = @{}; $sources = @(); $ordinals = @{}
  foreach ($session in $manager.GetSessions()) {
   if ($sources.Count -ge 16) { break }
   $app = [string]$session.SourceAppUserModelId
   # The game must never attach to its own Qt media session.
   if ($app -match '(?i)perekyp|perekup') { continue }
   if (!$ordinals.ContainsKey($app)) { $ordinals[$app] = 0 }; $ordinals[$app]++
   $id = $app + '#' + $ordinals[$app]; $map[$id] = $session
   $sources += @{ id=$id; app=$app; title=[string]$labels[$id] }
  }
  $commandError = ''; $resendArt=$false
  foreach ($file in @(Get-ChildItem -LiteralPath $CommandDirectory -Filter '*.json' -File | Sort-Object Name | Select-Object -First 32)) {
   try {
    $command = [IO.File]::ReadAllText($file.FullName,[Text.Encoding]::UTF8) | ConvertFrom-Json
    Remove-Item -LiteralPath $file.FullName -Force
    if ($command.op -eq 'quit') { $quit=$true; break }
    if ($command.op -eq 'select') { $preferred=[string]$command.session; $resendArt=$true; continue }
    if (([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-[long]$command.createdMs) -gt 15000) { continue }
    $target = $map[[string]$command.session]; if (!$target) { continue }
    $info = $target.GetPlaybackInfo(); $controls = $info.Controls; $accepted=$false
    switch ($command.op) {
     'toggle' { if ($controls.IsPlayPauseToggleEnabled) { $accepted=Await ($target.TryTogglePlayPauseAsync()) ([bool]) } elseif ($info.PlaybackStatus.ToString() -eq 'Playing' -and $controls.IsPauseEnabled) { $accepted=Await ($target.TryPauseAsync()) ([bool]) } elseif ($controls.IsPlayEnabled) { $accepted=Await ($target.TryPlayAsync()) ([bool]) } }
     'next' { if ($controls.IsNextEnabled) { $accepted=Await ($target.TrySkipNextAsync()) ([bool]) } }
     'previous' { if ($controls.IsPreviousEnabled) { $accepted=Await ($target.TrySkipPreviousAsync()) ([bool]) } }
     'seek' { if ($controls.IsPlaybackPositionEnabled) { $accepted=Await ($target.TryChangePlaybackPositionAsync(([long]$command.positionMs)*10000)) ([bool]) } }
    }
    if (!$accepted) { $commandError='Player did not accept the command' }
   } catch { $commandError='Media command failed' }
  }
  if ($quit) { break }
  $selected=''
  if ($preferred -and $map.ContainsKey($preferred)) { $selected=$preferred }
  elseif (!$preferred -and $sources.Count -gt 0) {
   $current=$manager.GetCurrentSession()
   foreach ($source in $sources) { if ($current -and $map[$source.id].SourceAppUserModelId -eq $current.SourceAppUserModelId) { $selected=$source.id; break } }
   if (!$selected) { $selected=$sources[0].id }
  }
  $state=@{ protocol=1; sources=@($sources); selected=$selected; current=$null; error=$commandError }
  if ($selected) {
   try {
    $session=$map[$selected];$properties=Await ($session.TryGetMediaPropertiesAsync()) $PropertiesType
    $labels[$selected]=[string]$properties.Title;foreach ($source in $sources) { if ($source.id -eq $selected) { $source.title=[string]$properties.Title } };$playback=$session.GetPlaybackInfo();$timeline=$session.GetTimelineProperties();$controls=$playback.Controls
    $signature=$selected+'|'+$properties.Title+'|'+$properties.Artist+'|'+$properties.AlbumTitle
    $artForMessage=''
    if ($signature -ne $lastArtSignature) {
     $lastArtSignature=$signature;$lastArt='';$lastArtKey=$signature
     if ($properties.Thumbnail) {
      $stream=$null;$reader=$null
      try {
       $stream=Await ($properties.Thumbnail.OpenReadAsync()) $StreamType
       if ($stream.Size -gt 0 -and $stream.Size -le 2097152) {
        $reader=$ReaderType::new($stream.GetInputStreamAt(0));$size=[uint32]$stream.Size
        $loaded=Await ($reader.LoadAsync($size)) ([uint32])
        if ($loaded -eq $size) { $data=New-Object byte[] $size;$reader.ReadBytes($data);$lastArt=[Convert]::ToBase64String($data);$lastArtKey=[Convert]::ToBase64String(([Security.Cryptography.SHA256]::Create()).ComputeHash($data)) }
       }
      } catch {} finally { if ($reader) { try { $reader.Dispose() } catch {} };if ($stream) { try { $stream.Dispose() } catch {} } }
     }
     $artForMessage=$lastArt
    }
    # A first/restarted receiver always gets the current cover once.
    if ($resendArt) { $artForMessage=$lastArt }
    $state.current=@{ id=$selected;app=[string]$session.SourceAppUserModelId;title=[string]$properties.Title;artist=[string]$properties.Artist;album=[string]$properties.AlbumTitle;playing=($playback.PlaybackStatus.ToString() -eq 'Playing');positionMs=[long]$timeline.Position.TotalMilliseconds;startMs=[long]$timeline.StartTime.TotalMilliseconds;endMs=[long]$timeline.EndTime.TotalMilliseconds;updatedMs=[long]$timeline.LastUpdatedTime.ToUnixTimeMilliseconds();canToggle=[bool]($controls.IsPlayPauseToggleEnabled -or ($playback.PlaybackStatus.ToString() -eq 'Playing' -and $controls.IsPauseEnabled) -or ($playback.PlaybackStatus.ToString() -ne 'Playing' -and $controls.IsPlayEnabled));canNext=[bool]$controls.IsNextEnabled;canPrevious=[bool]$controls.IsPreviousEnabled;canSeek=[bool]$controls.IsPlaybackPositionEnabled;artKey=$lastArtKey;artBase64=$artForMessage }
   } catch { $state.error='Could not read selected player' }
  }
  # Refresh one additional source label per poll, keeping session discovery bounded.
  $others=@($sources | Where-Object { $_.id -ne $selected })
  if ($others.Count -gt 0) {
   $other=$others[$pollNumber % $others.Count]
   try { $otherProperties=Await ($map[$other.id].TryGetMediaPropertiesAsync()) $PropertiesType; $labels[$other.id]=[string]$otherProperties.Title; $other.title=[string]$otherProperties.Title } catch {}
  }
  $pollNumber++
  Emit $state
  Start-Sleep -Milliseconds 650
 }
} catch { Emit @{ protocol=1;sources=@();selected='';current=$null;error='Windows media sessions are unavailable. Windows 10 1809 or newer is required.' } }
