"""Create reproducible extension and source archives; never package local profiles."""
from pathlib import Path
import hashlib, json, subprocess, zipfile
root=Path(__file__).resolve().parent.parent
subprocess.run(['npm','run','verify:model'],cwd=root,check=True)
version=json.loads((root/'extension/manifest.json').read_text())['version']
out=root/'dist';out.mkdir(exist_ok=True)
def archive(name,files,base):
    target=out/name
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in sorted(files):
            info=zipfile.ZipInfo(path.relative_to(base).as_posix(),(2026,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            z.writestr(info,path.read_bytes())
    return target
files=[p for p in (root/'extension').rglob('*') if p.is_file() and not p.name.startswith('.')]
extension=archive(f'incognix-{version}-extension.zip',files,root/'extension')
# The source archive intentionally excludes downloaded assets and dependencies.
names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=root,text=True).splitlines()
source=archive(f'incognix-{version}-source.zip',[root/n for n in set(names) if (root/n).is_file()],root)
(out/'SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in [extension,source]))
for p in [extension,source]: print(f'{p} ({p.stat().st_size:,} bytes)')
