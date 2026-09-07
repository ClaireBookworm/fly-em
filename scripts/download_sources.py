"""Download official public inputs, retaining large files only under work/."""
from pathlib import Path
import concurrent.futures,json,struct,subprocess
ROOT=Path(__file__).resolve().parents[1];W=ROOT/'work';W.mkdir(exist_ok=True)
BASE='https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/'
FILES={n:BASE+n for n in ['body-annotations-male-cns-v1.0-minconf-0.5.feather','body-neurotransmitters-male-cns-v1.0.feather','connectome-weights-male-cns-v1.0-minconf-0.5.feather']}
FILES.update({'motion.xlsx':'https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-022-04428-3/MediaObjects/41586_2022_4428_MOESM6_ESM.xlsx','escape.xlsx':'https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-022-05562-8/MediaObjects/41586_2022_5562_MOESM9_ESM.xlsx','heading-two-source.json':'https://api.figshare.com/v2/articles/12490274'})
def download(pair):
 name,url=pair;p=W/name
 if not p.exists():subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','600','--output',str(p),url],check=True)
 return name,p.stat().st_size
with concurrent.futures.ThreadPoolExecutor(3) as ex:
 for r in ex.map(download,FILES.items()):print(*r,flush=True)
meta=json.loads((W/'heading-two-source.json').read_text());item=next(x for x in meta['files'] if x['name']=='TwoColor.zip');size=item['size'];tail=W/'heading-tail.bin'
subprocess.run(['curl','--fail','-LsS','--range','-131072',item['download_url'],'-o',str(tail)],check=True)
b=tail.read_bytes();end=b.rfind(b'PK\x05\x06');assert end>=0,'ZIP end record missing'
eocd=struct.unpack('<4s4H2LH',b[end:end+22]);offset=eocd[6]-(size-len(b));items=[]
while b[offset:offset+4]==b'PK\x01\x02':
 v=struct.unpack('<4s6H3L5H2L',b[offset:offset+46]);n,extra,comment=v[10:13];name=b[offset+46:offset+46+n].decode();items.append({'name':name,'compressed':v[8],'size':v[9],'offset':v[16],'method':v[4]});offset+=46+n+extra+comment
assert items,'ZIP directory not found in tail';(W/'heading-zip-index.json').write_text(json.dumps(items));print('Indexed',len(items),'entries without downloading the full imaging archive')
