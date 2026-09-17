"""Export measured trial summaries from Yamamoto et al. (2023).

Usage: python scripts/export-culture-challenge.py /path/to/processed.zip
Archive: https://gin.g-node.org/doi/stimulating_modular_cultures/raw/master/dat/experiments/processed.zip
Data licence: CC BY-NC 4.0. No synthetic measurements are added.
"""
import io
import json
import pickle
import sys
import zipfile
from pathlib import Path
import h5py
import numpy as np

class ArrayReader(pickle.Unpickler):
    """Pandas object blocks use pickle; permit only numpy array reconstruction."""
    def find_class(self, module, name):
        allowed = {
            ('numpy.core.multiarray', '_reconstruct'): np._core.multiarray._reconstruct,
            ('numpy', 'ndarray'): np.ndarray,
            ('numpy', 'dtype'): np.dtype,
        }
        if (module, name) not in allowed:
            raise ValueError(f'Unsupported object {module}.{name}')
        return allowed[module, name]

archive = zipfile.ZipFile(sys.argv[1])
output = {'source': 'https://doi.org/10.12751/g-node.t77b3p', 'paper': 'https://doi.org/10.1126/sciadv.ade1755', 'license': 'CC BY-NC 4.0', 'measurement': 'Published calcium-derived trial summaries; median fraction of neurons participating in detected population bursts', 'layouts': []}
for layout in ['1b', '3b', 'merged']:
    path = f'processed/{layout}.hdf5'
    with h5py.File(io.BytesIO(archive.read(path))) as f:
        g = f['data/df_trials']
        numeric = [x.decode() for x in g['block1_items'][:]]
        objects = [x.decode() for x in g['block2_items'][:]]
        rows = ArrayReader(io.BytesIO(bytes(g['block2_values'][0]))).load()
        vals = g['block1_values'][:]
        trials = {}
        for i, row in enumerate(rows):
            info = dict(zip(objects, row))
            condition, name = info['Condition'], info['Trial']
            value = float(vals[i, numeric.index('Median Fraction')])
            correlation = float(vals[i, numeric.index('Median Neuron Correlation')])
            if condition not in ['pre', 'stim', 'post'] or not np.isfinite(value):
                continue
            trials.setdefault(name, {'id': name})[condition] = {'fraction': value, 'correlation': correlation if np.isfinite(correlation) else None}
        output['layouts'].append({'id': layout, 'file': path, 'trials': list(trials.values())})
target = Path(__file__).resolve().parents[1] / 'public/data/games/cultures.json'
target.write_text(json.dumps(output, separators=(',', ':'), allow_nan=False))
print([(l['id'], len(l['trials'])) for l in output['layouts']])
