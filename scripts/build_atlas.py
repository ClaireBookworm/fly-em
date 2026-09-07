"""Extract a documented browser-sized MaleCNS v1.0 sample; never generate anatomy."""
from pathlib import Path
import json, subprocess, concurrent.futures, hashlib
import numpy as np
import pandas as pd
import pyarrow.feather as feather
import pyarrow.compute as pc
ROOT=Path(__file__).resolve().parents[1]; W=ROOT/'work'; OUT=ROOT/'public/data'; OUT.mkdir(parents=True,exist_ok=True)
BASE='https://storage.googleapis.com/flyem-male-cns/v1.0/'
ann=feather.read_feather(W/'body-annotations-male-cns-v1.0-minconf-0.5.feather').set_index('bodyId')
nt=feather.read_feather(W/'body-neurotransmitters-male-cns-v1.0.feather').set_index('body')
w=feather.read_table(W/'connectome-weights-male-cns-v1.0-minconf-0.5.feather',memory_map=True)
def edges(ids):
 mask=pc.and_(pc.is_in(w['body_pre'],value_set=__import__('pyarrow').array(ids,type=__import__('pyarrow').int64())),pc.is_in(w['body_post'],value_set=__import__('pyarrow').array(ids,type=__import__('pyarrow').int64())))
 return w.filter(mask).to_pandas()
def types(names): return ann[ann['type'].isin(names)]
heading=types(['EPG','PEN_a(PEN1)','PEN_b(PEN2)','Delta7'])
loom=types(['LC4','LPLC2','DNp01']); le=edges(loom.index.tolist()); gf=types(['DNp01']).index
strength=le[le.body_post.isin(gf)].groupby('body_pre').weight.sum()
li=list(gf)
for typ in ['LC4','LPLC2']:
 ids=loom[loom.type==typ].index
 li+=strength.reindex(ids,fill_value=0).sort_values(ascending=False).head(40).index.tolist()
# A contiguous patch of ON/OFF direction-selective cells, plus their strongest typed inputs.
mt=['Mi1','Tm3','Mi9','Mi4','C3','Tm1','Tm2','Tm4','Tm9','T4a','T5a']
motion=types(mt); seeds=[]
for typ in ['T4a','T5a']:
 sub=motion[(motion.type==typ)&(motion.somaSide=='R')]
 if len(sub)==0: sub=motion[motion.type==typ]
 xy=sub[['assignedOlHex1','assignedOlHex2']].fillna(0)
 d=((xy-xy.median())**2).sum(axis=1)
 seeds+=d.sort_values().head(6).index.tolist()
mask=pc.and_(pc.is_in(w['body_post'],value_set=__import__('pyarrow').array(seeds)),pc.is_in(w['body_pre'],value_set=__import__('pyarrow').array(motion.index.tolist())))
me=w.filter(mask).to_pandas(); strength=me.groupby('body_pre').weight.sum(); mi=seeds[:]
for typ in mt[:-2]:
 ids=motion[motion.type==typ].index
 mi+=strength.reindex(ids,fill_value=0).sort_values(ascending=False).head(8).index.tolist()
groups={'escape':li,'heading':heading.index.tolist(),'motion':mi}
circuits={}
for k,ids in groups.items():
 ids=sorted(set(ids)); es=edges(ids); nodes=[]
 for bid in ids:
  r=ann.loc[bid]; n=nt.loc[bid] if bid in nt.index else None
  p=r.somaLocation if r.somaLocation is not None else r.tosomaLocation
  nodes.append({'id':int(bid),'type':r.type,'label':r.instance or r.type,'nt':(n.consensus_nt if n is not None else None) or 'unclear','ntConfidence':round(float(n.predicted_nt_confidence),3) if n is not None and pd.notna(n.predicted_nt_confidence) else None,'position':[round(float(v)*.008,2) for v in p] if p is not None else None,'status':r.status})
 idx={n['id']:i for i,n in enumerate(nodes)}
 circuits[k]={'nodes':nodes,'edges':[[idx[int(a)],idx[int(b)],int(c)] for a,b,c in es.itertuples(index=False,name=None)],'populationCount':int(len(loom) if k=='escape' else len(heading) if k=='heading' else len(motion))}
 print(k,len(nodes),len(es),int(es.weight.sum()),flush=True)
# Somas: stratified random sample across anatomical superclasses, fixed seed.
valid=ann[ann.superclass.notna() & ann.somaLocation.notna()]
sampled=valid.groupby('superclass',group_keys=False).sample(frac=.10,random_state=42)
points=[[round(float(v)*.008,1) for v in p] for p in sampled.somaLocation]
# Actual reconstructed skeletons: background and selected circuit exemplars.
bg=[]
for sc,sub in valid.groupby('superclass'):
 bg+=sub.sample(min(6,len(sub)),random_state=17).index.tolist()
skelgroups={}
for k,c in circuits.items():
 df=pd.DataFrame(c['nodes']); ids=[]
 for typ,sub in df.groupby('type'): ids+=sub.sample(min(5,len(sub)),random_state=21).id.tolist()
 skelgroups[k]=ids
allids=sorted(set(bg+sum(skelgroups.values(),[])))
cache=W/'skeletons';cache.mkdir(exist_ok=True)
def skeleton(bid):
 p=cache/f'{bid}.swc';url=BASE+f'segmentation/skeletons-malecns/skeletons-swc/{bid}.swc'
 if not p.exists():
  r=subprocess.run(['curl','--fail','-L','-sS','--max-time','45','-o',str(p),url],capture_output=True)
  if r.returncode: return bid,None
 try:
  a=np.loadtxt(p,comments='#');lookup={int(row[0]):row for row in a}; children={}
  for row in a: children[int(row[6])]=children.get(int(row[6]),0)+1
  # Preserve branch topology with chains simplified to at most ~2 micrometre steps.
  segments=[]
  for row in a:
   if children.get(int(row[0]),0)==1: continue
   current=row
   while int(current[6]) in lookup:
    start=current;parent=lookup[int(current[6])]
    while children.get(int(parent[0]),0)==1 and int(parent[6]) in lookup and np.linalg.norm(start[2:5]-parent[2:5])<250:
     parent=lookup[int(parent[6])]
    segments.append([*[round(float(v)*.008,1) for v in start[2:5]],*[round(float(v)*.008,1) for v in parent[2:5]]]);current=parent
    if children.get(int(current[0]),0)!=1: break
  # Keep one deterministic subset for exceptionally large arbors.
  if len(segments)>2400: segments=segments[::int(np.ceil(len(segments)/2400))]
  return bid,segments
 except Exception as e: print('Skeleton failed',bid,str(e),flush=True);return bid,None
skeletons={}
with concurrent.futures.ThreadPoolExecutor(10) as ex:
 for i,(bid,s) in enumerate(ex.map(skeleton,allids)):
  if s: skeletons[str(bid)]=s
  if i%25==0: print('Skeletons',i,'/',len(allids),flush=True)
for k,c in circuits.items(): c['skeletonIds']=[i for i in skelgroups[k] if str(i) in skeletons]
result={'dataset':'MaleCNS v1.0','release':'2026-06-08','voxelMicrometres':.008,'somaCount':len(valid),'points':points,'backgroundIds':[i for i in bg if str(i) in skeletons],'skeletons':skeletons,'circuits':circuits,'provenance':{'data':BASE+'connectome-data/flat-connectome/','skeletonTemplate':BASE+'segmentation/skeletons-malecns/skeletons-swc/{bodyId}.swc','sampling':'10% stratified soma sample (seed 42); six skeletons per superclass (seed 17); five exemplars per selected cell type (seed 21). Coordinates micrometres; centerlines simplified ~2 µm.','edgeThreshold':'Source release minconf 0.5; retain every contact-count edge inside each selected neuron set.','selection':{'escape':'Both GF neurons and 40 cells each of LC4 and LPLC2 with the greatest summed contacts onto GF.','heading':'All EPG, PEN_a(PEN1), PEN_b(PEN2), Delta7 cells.','motion':'Six right-side T4a and T5a near median optic-lobe hex coordinates; eight cells per listed input type ranked by contact counts onto those targets.'}}}
(OUT/'atlas.json').write_text(json.dumps(result,separators=(',',':'),allow_nan=False))
print('Output', (OUT/'atlas.json').stat().st_size,'bytes; skeletons',len(skeletons),flush=True)
