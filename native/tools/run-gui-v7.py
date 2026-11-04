from pathlib import Path
import os,sys,subprocess
b=Path.cwd();mode=sys.argv[1];root=b/(('test-v7-' if mode in ['os','os-restart','purchase'] else 'test-v7-')+('onboarding' if mode=='onboarding-restart' else 'os' if mode=='os-restart' else mode));root.mkdir(exist_ok=True)
for n in ['data','assets']:
 if not(root/n).exists():(root/n).symlink_to(b/'project'/n,target_is_directory=True)
lib=b/'build-tools/sysroot/usr/lib/x86_64-linux-gnu';env=os.environ.copy();env.update(LD_LIBRARY_PATH=str(lib),QT_PLUGIN_PATH=str(lib/'qt6/plugins'),QT_QPA_PLATFORM='offscreen',PEREKYP_APPS_SCREENSHOTS=str(b/'apps-v7-previews'),PEREKYP_OS_SCREENSHOT=str(b/('preview-'+mode+'.jpg')),PEREKYP_TUTORIAL_SCREENSHOT=str(b/'tutorial-preview.png'),PEREKUP_PURCHASE_SCREENSHOT=str(b/'purchase-preview'))
with open('test-'+mode+'.log','w') as f:r=subprocess.run([str(b/'perekup-linux'),str(root),'--'+mode+'-smoke-test'],env=env,stdout=f,stderr=subprocess.STDOUT,timeout=70)
print(mode,r.returncode);print(Path('test-'+mode+'.log').read_text()[-1800:]);markers={'os':'OS GUI passed:', 'os-restart':'Settings sidebar section navigation passed', 'purchase':'Purchase GUI passed:', 'commerce':'Commerce GUI passed:', 'onboarding':'Onboarding GUI passed:', 'onboarding-restart':'Onboarding GUI passed:', 'career':'Career GUI: client signature'};sys.exit(r.returncode or (0 if markers[mode] in Path('test-'+mode+'.log').read_text() else 90))
