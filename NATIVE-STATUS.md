# Native C++ development status

Verified commit: 956981bc8f8bc65ffcfdf994880eb66aee2cd270
Run: https://github.com/vmisha1108-hue/Perekup.ru/actions/runs/40171522438

Both jobs passed:
- Ubuntu 24.04 / Qt5: compilation, core CTest suite, eight original-game differential suites, offscreen UI launch including calculator.
- Windows 2022 / MSVC x64 / Qt 6.8.3: compilation of native desktop EXE, core CTest suite including Windows AES-GCM save lifecycle, offscreen UI launch including calculator.

The native calculator preserves the button grid, keyboard arithmetic, parentheses, percentage division by 100, six-decimal rounding and error recovery without a JavaScript runtime.

This is NOT a complete playable port or a release ZIP. No compiled release artifact is attached. Full dialogue/story, remaining game systems, integration of the purchase/contract flow into UI, original photo/audio assets, visual fidelity, migration and end-to-end playthrough remain incomplete. Offscreen launch is not visual QA or proof that every gameplay action works. Save encryption is not a guarantee against offline cheating.

Source checkpoint: native-source.zip. CI definition: .github/workflows/native-build.yml.
