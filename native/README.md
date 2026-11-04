# Perekyp C++ V7

This directory contains the editable C++ source and game data for V7. The
Windows executable in the reference V7 installation has SHA-256
`6c2cd26cc6710ceaa964770584b7c0c4bcc5ef0b939b676450ccbcbb761c4228`.

Use CMake, a C++17 toolchain and Qt 6 with Widgets, Network and Multimedia.
Linux builds also require OpenSSL development headers.

For a complete local build, copy the `assets/` directory from the reference
V7 game installation into this directory. Copy the four WebP runtime DLLs
from the reference installation into `third-party/webp-runtime/` when
creating a Windows package. The list and build provenance are in
`third-party/webp-runtime/BUILD.txt`. The files are local build inputs.

From the repository root:

```sh
cmake -S native -B build-native -DPEREKUP_BUILD_UI=ON
cmake --build build-native --parallel 2
ctest --test-dir build-native --output-on-failure
```

For a Windows portable build, run `native/tools/windows/build-v7.ps1`
with the Qt installation path and matching compiler bin directory.
See `V7-README.md` for game installation instructions.

## Music and first purchase

The music app searches the Apple catalogue for tracks, artists and albums.
Catalogue results open the provider page for full playback with the user's
account. The app also opens Spotify playlist search and recognises links to
the supported services. Start playback in the official player. On Windows,
the game can monitor and control providers that publish a Windows media session.

Direct permitted audio URLs and supported open playlists play in Qt Multimedia.
“My Music” saves favourites, local-player history and custom queues. Ctrl+Shift+Space
toggles playback. Ctrl+Shift+Left and Ctrl+Shift+Right change tracks.

After the overview, the purchase walkthrough follows the normal market, chat,
meeting, inspection and contract screens. It detects a newly signed purchase
and shows the garage. The walkthrough resumes from the save and can be dismissed.

The negotiation UI uses ten complete phrases recovered from the reference APK.
The rest of the original dialogue system remains available.
