"""Fetch one released recording by ZIP range, with a CRC check."""
import json,subprocess,struct,zlib,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];W=ROOT/'work'
items=json.loads((W/'heading-zip-index.json').read_text());entry=next(x for x in items if 'GreenEPGsRedDelta7s/20170717/Fly1' in x['name'] and 'Stripe_00001.mat' in x['name'])
a=entry['offset'];b=a+entry['compressed']+2000
r=subprocess.run(['curl','--fail','-LsS','--range',f'{a}-{b}','https://ndownloader.figshare.com/files/23168198','-o',str(W/'heading-entry.bin')],check=True)
buf=(W/'heading-entry.bin').read_bytes();header=struct.unpack('<4s5H3L2H',buf[:30]);assert header[0]==b'PK\x03\x04',header
start=30+header[-2]+header[-1];raw=zlib.decompress(buf[start:start+entry['compressed']],-15);assert len(raw)==entry['size'];assert zlib.crc32(raw)==header[6]
(W/'heading.mat').write_bytes(raw);(W/'heading-selected.json').write_text(json.dumps(entry));print(entry)
