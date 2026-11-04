"""Package an existing MinGW/Qt build; never downloads or publishes files."""
from pathlib import Path
import argparse,shutil,subprocess,re,json,hashlib,zipfile
p=argparse.ArgumentParser()
p.add_argument('--source',type=Path,required=True);p.add_argument('--build',type=Path,required=True)
p.add_argument('--qt',type=Path,required=True);p.add_argument('--runtime',type=Path,required=True)
p.add_argument('--qt-sources',type=Path,required=True);p.add_argument('--runtime-license',type=Path,required=True)
p.add_argument('--objdump',required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args();root=a.output/'Perekup';root.mkdir(parents=True,exist_ok=False)
shutil.copy2(a.build/'perekup_native_desktop.exe',root/'Perekup.exe')
for folder in ('data','assets'):shutil.copytree(a.source/folder,root/folder)
for dll in ('Qt6Core.dll','Qt6Gui.dll','Qt6Widgets.dll'):shutil.copy2(a.qt/'bin'/dll,root/dll)
for dll in ('libstdc++-6.dll','libgcc_s_seh-1.dll','libwinpthread-1.dll'):shutil.copy2(a.runtime/dll,root/dll)
for group in ('platforms','imageformats','styles'):
 source=a.qt/'plugins'/group
 if source.exists():shutil.copytree(source,root/group)
for required in ('platforms/qwindows.dll','imageformats/qwebp.dll'):
 if not (root/required).exists():raise RuntimeError('Missing Qt plugin: '+required)
(root/'qt.conf').write_text('[Paths]\nPrefix=.\nPlugins=.\n',encoding='ascii')
(root/'saves').mkdir()
# Keep tests beside the application dependencies, runnable on real Windows.
(root/'checks').mkdir()
for f in a.build.glob('*_test.exe'):shutil.copy2(f,root/'checks'/f.name)
(root/'Verify-Windows.cmd').write_text('@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\nset "fail=0"\r\nset "PATH=%cd%;%PATH%"\r\n(for %%T in (checks\\perekup_*_test.exe) do (\r\n echo ==== %%T ====\r\n "%%T"\r\n if errorlevel 1 set "fail=1"\r\n)) > WINDOWS-TEST-RESULTS.txt 2>&1\r\nset QT_QPA_PLATFORM=offscreen\r\nstart /wait "" Perekup.exe "%cd%" --smoke-test >> WINDOWS-TEST-RESULTS.txt 2>&1\r\nif errorlevel 1 set "fail=1"\r\necho Overall failure flag: %fail% >> WINDOWS-TEST-RESULTS.txt\r\ntype WINDOWS-TEST-RESULTS.txt\r\npause\r\nexit /b %fail%\r\n',encoding='ascii')
# Check the static import closure; API-set and Windows system DLLs are OS files.
system=set('advapi32 authz bcrypt comdlg32 crypt32 d2d1 d3d11 d3d9 dcomp dnsapi dwmapi dwrite dxgi gdi32 imm32 iphlpapi kernel32 mpr msvcrt netapi32 ntdll ole32 oleaut32 powrprof propsys psapi secur32 setupapi shcore shell32 shlwapi synchronization user32 userenv uxtheme version winmm winspool ws2_32 wtsapi32'.split())
provided={f.name.lower() for f in root.rglob('*.dll')};imports={}
for f in [root/'Perekup.exe',*root.rglob('*.dll'),*(root/'checks').glob('*_test.exe')]:
 result=subprocess.check_output([a.objdump,'-p',str(f)],text=True)
 dlls=re.findall(r'DLL Name: (\S+)',result);imports[str(f.relative_to(root))]=dlls
 for dll in dlls:
  lower=dll.lower()
  if lower in provided or lower.removesuffix('.dll') in system or lower.startswith(('api-ms-win-','ext-ms-win-')):continue
  raise RuntimeError(f'Unresolved DLL {dll} imported by {f.name}')
(root/'IMPORTS.json').write_text(json.dumps(imports,indent=2))
shutil.copy2(a.source/'STATUS.md',root/'PORT-STATUS.md')
(root/'README.txt').write_text('Perekup — native C++ development build for Windows x64.\n\nExtract the whole Perekup folder to a writable location and launch Perekup.exe.\nKeep all DLLs, platforms, imageformats, assets and data beside the EXE.\nSaves and preferences are stored in the saves subfolder.\nThis is an incomplete port. Native Linux tests passed; Windows execution is not verified in the build environment.\nRun Verify-Windows.cmd to collect Windows test results.\n',encoding='utf-8')
(root/'README-RU.txt').write_text("""Perekup — тестовая нативная сборка C++ для Windows 10/11 x64.

1. Распакуйте всю папку Perekup в отдельное место с доступом на запись.
2. Запустите Perekup.exe. Не переносите один EXE отдельно от остальных файлов.
3. Сохранения и настройки находятся в подпапке saves.
4. Verify-Windows.cmd запускает проверки и создаёт WINDOWS-TEST-RESULTS.txt.

Это незаконченный перенос игры. Оставшиеся механики описаны в PORT-STATUS.md.
Интерфейс собран и запущен на Linux; Windows EXE скомпилирован, но его запуск
в среде сборки не проверен. Если запуск не удался, пришлите результат проверок.
""",encoding='utf-8')
third=root/'third-party';third.mkdir()
qtbase=a.qt_sources/'qtbase-everywhere-src-6.4.2'
shutil.copytree(qtbase/'LICENSES',third/'Qt-LICENSES')
qt_source=third/'Qt-source';qt_source.mkdir()
for f in a.qt_sources.glob('*.orig.tar.*'):shutil.copy2(f,qt_source/f.name)
shutil.copytree(a.source/'tools/qt-patches',qt_source/'patches')
shutil.copy2(a.runtime_license,third/'GCC-runtime-copyright.txt')
(third/'README.txt').write_text('Qt 6.4.2 and Qt Image Formats 6.4.2 are dynamically linked shared libraries. Their corresponding source archives, build changes and license texts are included here. You may rebuild and replace these Qt DLLs. Upstream Wintab headers retain their unrestricted distribution notices. GCC MinGW runtime includes its runtime-library exception; see GCC-runtime-copyright.txt.\n',encoding='utf-8')
rows=[{'path':str(f.relative_to(root)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(root.rglob('*')) if f.is_file()]
(root/'FILES-SHA256.json').write_text(json.dumps(rows,indent=2))
print('Staged portable folder:',root)
