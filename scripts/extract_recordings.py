"""Read publisher data without editing the source workbooks. Export explicit provenance."""
from pathlib import Path
import json,hashlib
import pandas as pd
import numpy as np
import sys
ROOT=Path(__file__).resolve().parents[1];W=ROOT/'work';O=ROOT/'public/data'
if '--xlsx' in sys.argv:
 for name,sheet in [('motion','Fig. 4a'),('escape','Extended Data Fig. 4h')]:
  pd.read_excel(W/(name+'.xlsx'),sheet_name=sheet,header=None).to_json(W/(name+'-cells.json'),orient='values')
 raise SystemExit(0)
from scipy.io import loadmat
m=pd.read_json(W/'motion-cells.json',orient='values')
motion={'source':'https://doi.org/10.1038/s41586-022-04428-3','citation':'Groschner et al., Nature (2022), Figure 4a','download':'https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-022-04428-3/MediaObjects/41586_2022_4428_MOESM6_ESM.xlsx','unit':'mV','timeUnit':'s','time':m.iloc[3:,0].astype(float).tolist(),'series':[],'kind':'Published population mean ± SEM; whole-cell current clamp. Not a raw single-cell trace.','condition':'T4 > GFP and T4 > GluClα RNAi; ON/OFF edges in preferred/null directions at 30°/s.','license':'CC BY 4.0'}
for name,col in [('ON · preferred · control',1),('ON · null · control',11),('ON · preferred · GluClα RNAi',3),('ON · null · GluClα RNAi',13),('OFF · preferred · control',21),('OFF · null · control',31)]:
 motion['series'].append({'label':name,'values':m.iloc[3:,col].astype(float).tolist(),'sem':m.iloc[3:,col+1].astype(float).tolist(),'range':f"'Fig. 4a'! column {col+1}, rows 4–303"})
x=loadmat(W/'heading.mat',simplify_cells=True);t=x['positionDat']['tFrameGrab'][::14]/10000;t=t-t[0]
heading={'source':'https://doi.org/10.1016/j.neuron.2020.08.006','citation':'Turner-Evans et al., Neuron (2020)','download':'https://doi.org/10.25378/janelia.12490274','unit':'ΔF/F','timeUnit':'s','time':np.round(t,5).tolist(),'series':[{'label':'E-PG · bridge ROI 4','values':(x['GROIaveMax'][3]-1).tolist()},{'label':'Δ7 · bridge ROI 4','values':(x['RROIaveMax'][3]-1).tolist()}],'heatmap':(x['GROIaveMax']-1).tolist(),'kind':'Measured two-color calcium fluorescence from one fly; 18 bridge ROIs. Not spikes or membrane voltage.','condition':'Visual stripe trial; GCaMP6f in E-PG and jRGECO in Δ7. One selected trial, no population error bars.','file':json.loads((W/'heading-selected.json').read_text())['name'],'processing':'Use released GROIaveMax/RROIaveMax minus 1, as in the authors’ Figure 4H analysis, with no Savitzky–Golay filtering; 14 planes per volume, frame TTL clock 10 kHz. Time relative to first volume. Display all 750 volumes without temporal smoothing.','license':'CC BY-NC 4.0 (Janelia Figshare dataset)'}
e=pd.read_json(W/'escape-cells.json',orient='values').iloc[2:,:4].astype(float)
escape={'source':'https://doi.org/10.1038/s41586-022-05562-8','citation':'Dombrovski et al., Nature (2023), Extended Data Figure 4','download':'https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-022-05562-8/MediaObjects/41586_2022_5562_MOESM9_ESM.xlsx','figure':'https://media.springernature.com/lw685/springer-static/esm/art%3A10.1038%2Fs41586-022-05562-8/MediaObjects/41586_2022_5562_Fig10_ESM.jpg','figurePage':'https://www.nature.com/articles/s41586-022-05562-8/figures/10','kind':'Published whole-cell traces in panels b/d/g; source workbook supplies integrated GF responses, not the voltage time series.','condition':'Vertical array of three disks, each expanding from 0° to 30° at 500°/s; four azimuths. GF depolarized without detected action potentials in this assay.','azimuth':[32.5,45,57.5,70],'responses':e.replace({np.nan:None}).values.tolist(),'mean':e.mean().tolist(),'sd':e.std(ddof=1).tolist(),'range':"'Extended Data Fig. 4h'!A3:D10",'license':'CC BY 4.0','limitation':'No reconstructed or invented experimental waveform is supplied. View the original figure for voltage traces.'}
for data in [heading,motion]:
 for s in data['series']:
  s['values']=[round(v,6) for v in s['values']]
  if 'sem' in s:s['sem']=[round(v,6) for v in s['sem']]
heading['heatmap']=[[round(v,5) for v in row] for row in heading['heatmap']]
result={'heading':heading,'motion':motion,'escape':escape,'sha256':{f:hashlib.sha256((W/f).read_bytes()).hexdigest() for f in ['heading.mat','motion.xlsx','escape.xlsx']}}
(O/'recordings.json').write_text(json.dumps(result,separators=(',',':'),allow_nan=False));print('recordings', (O/'recordings.json').stat().st_size)
