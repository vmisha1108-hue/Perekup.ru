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
