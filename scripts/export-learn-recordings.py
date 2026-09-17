"""Export attributed teaching excerpts, not fitted simulations.
Usage: python3 scripts/export-learn-recordings.py /path/to/allen.nwb /path/to/S001R01.edf [/path/to/cap.mat]
Requires numpy and the h5dump executable. Sources/transformations travel with JSON.
"""
import json, pathlib, subprocess, sys, tempfile
import numpy as np

nwb, edf = map(pathlib.Path, sys.argv[1:3])
output = pathlib.Path(__file__).resolve().parents[1] / 'public/data/learn'
output.mkdir(parents=True, exist_ok=True)

def read_sweep(sweep, kind):
    group = 'acquisition/timeseries' if kind == 'voltage' else 'stimulus/presentation'
    with tempfile.TemporaryDirectory() as tmp:
        dest = pathlib.Path(tmp) / 'data.bin'
        subprocess.run(['h5dump', '-d', f'/{group}/Sweep_{sweep}/data', '-b', 'LE', '-o', str(dest), str(nwb)], check=True, stdout=subprocess.DEVNULL)
        return np.fromfile(dest, dtype='<f4') * (1000 if kind == 'voltage' else 1e12)

sweeps=[]
# 200 kHz acquisition; retain every 10th sample (20 kHz) for these short excerpts.
for sweep,label,stop in [(12,'One spike',1.100),(16,'Another trial',1.100),(27,'Below threshold',1.320),(30,'Repeated firing',1.320)]:
    v,i=read_sweep(sweep,'voltage'),read_sweep(sweep,'current')
    index=np.arange(200000,round(stop*200000)+1,10)
    assert len(v)==len(i) and index[-1]<len(v)
    sweeps.append(dict(sweep=sweep,label=label,sourceStartSeconds=1,dtMs=0.05,timeMs=np.round((index/200000-1)*1000,5).tolist(),voltageMv=np.round(v[index].astype(float),5).tolist(),currentPa=np.round(i[index].astype(float),5).tolist()))
allen=dict(specimen=464212183,species='Mouse',cell='Sst-IRES-Cre · primary visual cortex, layer 5',source='https://allensdk.readthedocs.io/en/stable/_static/examples/nb/cell_types.html',download='https://api.brain-map.org/api/v2/well_known_file_download/491202878',attribution='Allen Institute for Brain Science, Allen Cell Types Database (2015). Specimen 464212183.',terms='https://alleninstitute.org/terms-of-use/',acquisitionHz=200000,processing='Raw voltage/current converted from V/A to mV/pA, excerpted from 1.000 s; every 10th sample retained (20 kHz), no smoothing, baseline subtraction or additional voltage correction. Input begins at 20 ms on the excerpt axis.',sweeps=sweeps)
(output/'allen-cell.json').write_text(json.dumps(allen,separators=(',',':'))+'\n')

# EDF+ fixed-width signal headers and little-endian signed 16-bit data records.
b=edf.read_bytes(); header=int(b[184:192]); records=int(b[236:244]); seconds=float(b[244:252]); ns=int(b[252:256]); pos=256
fields={}
for name,width in [('label',16),('transducer',80),('unit',8),('pmin',8),('pmax',8),('dmin',8),('dmax',8),('prefilter',80),('samples',8),('reserved',32)]:
    fields[name]=[b[pos+j*width:pos+(j+1)*width].decode('ascii').strip() for j in range(ns)];pos+=ns*width
ch=next(j for j,label in enumerate(fields['label']) if label.lower().strip('.')=='cz')
counts=list(map(int,fields['samples'])); stride=sum(counts); offset=sum(counts[:ch]); samples=counts[ch]; fs=samples/seconds
raw=np.frombuffer(b[header:],dtype='<i2'); assert len(raw)==records*stride
signal=np.concatenate([raw[r*stride+offset:r*stride+offset+samples] for r in range(records)]).astype(float)
pmin,pmax,dmin,dmax=[float(fields[k][ch]) for k in ('pmin','pmax','dmin','dmax')]
signal=(signal-dmin)*(pmax-pmin)/(dmax-dmin)+pmin
assert fs==160 and fields['unit'][ch]=='uV'
segment=signal[int(10*fs):int(14*fs)+1]
eeg=dict(source='https://physionet.org/content/eegmmidb/1.0.0/',download='https://physionet.org/files/eegmmidb/1.0.0/S001/S001R01.edf',attribution='Schalk, G. (2009). EEG Motor Movement/Imagery Dataset (v1.0.0). PhysioNet. doi:10.13026/C28G6P. Schalk et al. (2004), IEEE TBME 51(6):1034–1043.',license='Open Data Commons Attribution License v1.0',subject='S001',run='R01 · eyes open',channel=fields['label'][ch].strip('.'),unit='µV',sampleRateHz=fs,sourceStartSeconds=10,processing='EDF digital-to-physical calibration applied; 10–14 s excerpt; no additional filtering, smoothing or baseline subtraction.',timeSeconds=np.round(np.arange(len(segment))/fs,6).tolist(),voltageUv=np.round(segment,5).tolist())
(output/'eeg.json').write_text(json.dumps(eeg,separators=(',',':'))+'\n')
print('Wrote',[(p.name,p.stat().st_size) for p in output.glob('*.json')])

# Optional CAP: retain the released stimulus-triggered average; normalize amplitude
# because this file does not declare an unambiguous physical voltage unit.
if len(sys.argv)>3:
    cap_file=pathlib.Path(sys.argv[3])
    with tempfile.TemporaryDirectory() as tmp:
        dest=pathlib.Path(tmp)/'cap.bin'
        subprocess.run(['h5dump','-d','/avg_wf','-b','LE','-o',str(dest),str(cap_file)],check=True,stdout=subprocess.DEVNULL)
        values=np.fromfile(dest,dtype='<f8')
    assert len(values)==462 and np.isfinite(values).all()
    sample_rate=30000 # /mdf_metadata/fs in the source file
    idx=np.arange(30,461) # source xlims begin at 0.001 s; omit earlier stimulation artifact
    scale=float(np.max(np.abs(values[idx])))
    cap=dict(source='https://discover.pennsieve.io/datasets/38',doi='https://doi.org/10.26275/MGUQ-J2N3',license='CC BY 4.0',attribution='Nanivadekar, Ayers, Novelli, Gaunt, Weber & Fisher (2020). Selectivity of afferent microstimulation at the DRG using epineural and penetrating electrode arrays, version 3.',file='files/Electro/session_20/STA_recruitment/Electro_ssn020_blk090_ch001_a15.0_Cmn_Per.data.mat',species='Cat',subject='Electro',session=20,block=90,location='Common peroneal nerve',sampleRateHz=sample_rate,kind='Released stimulus-triggered average, not a single trial.',processing='Read avg_wf; retained samples 30–460 at the declared 30 kHz rate (1.000–15.333 ms from waveform start). Divided by maximum absolute amplitude of retained samples. No extra filtering, smoothing or baseline subtraction. Physical voltage units are not declared in the file, so amplitude is normalized and cannot be compared numerically with mV or µV.',normalizationFactor=scale,timeMs=np.round(idx/sample_rate*1000,6).tolist(),amplitude=np.round(values[idx]/scale,7).tolist(),sourceAmplitude=values[idx].tolist())
    (output/'compound.json').write_text(json.dumps(cap,separators=(',',':'))+'\n')
