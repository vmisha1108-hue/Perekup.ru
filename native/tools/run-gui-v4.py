from pathlib import Path
import os,sys,subprocess
b=Path.cwd();mode=sys.argv[1];root=b/(('test-v4c-' if mode in ['os','os-restart','purchase'] else 'test-v4-')+('onboarding' if mode=='onboarding-restart' else 'os' if mode=='os-restart' else mode));root.mkdir(exist_ok=True)
for n in ['data','assets']:
 if not(root/n).exists():(root/n).symlink_to(b/'project'/n,target_is_directory=True)
lib=b/'build-tools/sysroot/usr/lib/x86_64-linux-gnu';env=os.environ.copy();env.update(LD_LIBRARY_PATH=str(lib),QT_PLUGIN_PATH=str(lib/'qt6/plugins'),QT_QPA_PLATFORM='offscreen',PEREKYP_OS_SCREENSHOT=str(b/('preview-'+mode+'.png')),PEREKYP_TUTORIAL_SCREENSHOT=str(b/'tutorial-preview.png'),PEREKUP_PURCHASE_SCREENSHOT=str(b/'purchase-preview'))
with open('test-'+mode+'.log','w') as f:r=subprocess.run([str(b/'perekup-linux'),str(root),'--'+mode+'-smoke-test'],env=env,stdout=f,stderr=subprocess.STDOUT,timeout=70)
print(mode,r.returncode);print(Path('test-'+mode+'.log').read_text()[-1800:]);sys.exit(r.returncode)
