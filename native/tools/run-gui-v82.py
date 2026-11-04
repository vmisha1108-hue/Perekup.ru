from pathlib import Path
import os,sys,subprocess
b=Path.cwd();mode=sys.argv[1];root=b/'.build'/(('test-v82-recovered-' if mode in ['os','os-restart','purchase'] else 'test-v82-recovered-')+('onboarding' if mode=='onboarding-restart' else 'os' if mode=='os-restart' else mode));root.mkdir(exist_ok=True)
for n in ['data','assets']:
 if not(root/n).exists():(root/n).symlink_to(b/'project'/n,target_is_directory=True)
if mode in ['pilot','ai-settings']:
 import shutil,json
 (root/'models').mkdir(exist_ok=True);(root/'models/seller-qwen2.5-1.5b-q4_k_m.gguf').touch()
 (root/'saves').mkdir(exist_ok=True);(root/'saves/native-ui.json').write_text(json.dumps({'sellerAI':{'mode':'local','model':'compact','load':1}}))
 shutil.copyfile(b/'.build/seller-worker-stub',root/'seller-ai');(root/'seller-ai').chmod(0o755)
lib=b/'build-tools/sysroot/usr/lib/x86_64-linux-gnu';env=os.environ.copy();env.update(LD_LIBRARY_PATH=str(lib),QT_PLUGIN_PATH=str(lib/'qt6/plugins'),QT_QPA_PLATFORM='offscreen',PEREKYP_AI_SETTINGS_SCREENSHOT=str(b/'.build/ai-settings-v82.png'),PEREKYP_PILOT_SCREENSHOT=str(b/'pilot-preview.jpg'),PEREKYP_APPS_SCREENSHOTS=str(b/'apps-v8-previews'),PEREKYP_OS_SCREENSHOT=str(b/('preview-'+mode+'.jpg')),PEREKYP_TUTORIAL_SCREENSHOT=str(b/'tutorial-preview.png'),PEREKUP_PURCHASE_SCREENSHOT=str(b/'purchase-preview'))
r=subprocess.run([str(b/'.build/bin/perekup-linux'),str(root),'--'+mode+'-smoke-test'],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=90)
output=r.stdout.decode(errors='replace');(b/'.build'/('test-'+mode+'.log')).write_text(output)
print(mode,r.returncode);print(output[-2400:]);markers={'ai-settings':'AI settings GUI passed:', 'pilot':'Pilot GUI passed:', 'purchase':'Purchase GUI passed:'}
sys.exit(r.returncode or (0 if markers[mode] in output or (mode=='ai-settings' and (root/'ai-settings-check.json').exists()) else 90))
