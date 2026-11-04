from pathlib import Path
import subprocess,os,concurrent.futures
b=Path.cwd();p=b/'project' if (b/'project/src').exists() else b;tools=b/'build-tools' if (b/'build-tools').exists() else b.parent/'build-tools';sys=tools/'sysroot';sdk=tools/'qt-sdk/6.4.2/mingw_64';env=os.environ.copy();env['LD_LIBRARY_PATH']=str(sys/'usr/lib/x86_64-linux-gnu');env['PATH']=str(sys/'usr/bin')+':'+env['PATH']
def compile(windows):
 inc=sdk/'include' if windows else sys/'usr/include/x86_64-linux-gnu/qt6';lib=sdk/'lib' if windows else sys/'usr/lib/x86_64-linux-gnu';out=b/'.build/bin'/('perekup.exe' if windows else 'perekup-linux');out.parent.mkdir(parents=True,exist_ok=True);cmd=[str(sys/'usr/bin/x86_64-w64-mingw32-g++-posix') if windows else 'g++','-std=c++17','-O1' if windows else '-O0','-DQT_NO_DEBUG','-DQT_WIDGETS_LIB','-DQT_GUI_LIB','-DQT_CORE_LIB','-I'+str(p/'src'),'-I'+str(p/'vendor'),'-I'+str(inc)]+['-I'+str(inc/x) for x in ['QtWidgets','QtGui','QtCore','QtNetwork']]+[str(p/'src/ui/main.cpp')]
 if windows:
  subprocess.run([str(sys/'usr/bin/x86_64-w64-mingw32-windres'),'-I',str(p/'src/ui/resources'),str(p/'src/ui/resources/perekup.rc'),str(b/'.build/icon.o')],env=env,check=True);cmd+=[str(b/'.build/icon.o')]
 cmd+=['-L'+str(lib),'-lQt6Widgets','-lQt6Gui','-lQt6Core','-lQt6Network'];cmd+=['-lbcrypt','-lwinmm','-mwindows'] if windows else ['-fPIC','-Wl,-rpath-link,'+str(lib),'-lcrypto'];cmd+=['-o',str(out)];r=subprocess.run(cmd,env=env,stdout=open('.build/compile-'+str(windows)+'.log','w'),stderr=subprocess.STDOUT);print('Windows' if windows else 'Linux',r.returncode,flush=True)
 if r.returncode:raise RuntimeError('Compile failed')
 if windows:subprocess.run([str(sys/'usr/bin/x86_64-w64-mingw32-strip'),'--strip-unneeded',str(out)],check=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:list(ex.map(compile,[True,False]))
