"""Reproduce Hürkey et al. Fig. 3B and export a small, attributed web replay.

Requires the authors' unmodified Zenodo 7740678 archive under work/embodiment/wing-code.
Run with the isolated Brian2 environment; no neural equations are reimplemented here.
"""
import hashlib
import json
import os
from pathlib import Path
import sys

import numpy as np
from brian2 import ms, mV, nS, second, us, prefs

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "work/embodiment/wing-code/drosophila_wing_cpg"
OUT = ROOT / "public/data/embodied"
OUT.mkdir(parents=True, exist_ok=True)
os.chdir(SOURCE)
sys.path.insert(0, str(SOURCE))
from utils.sim import run_sim
from utils.random_initial_conditions import pick_initial_phase_SNL

prefs.codegen.target = "numpy"
model = json.loads(Path("cfg/Berger_SNL.json").read_text())
initial = pick_initial_phase_SNL(np.array([.9, .6, .5, .7, .8]))
gap = np.load("cfg/ggap_hom.npy")
variants = {}
for key, coupling in [("published", gap * nS), ("uncoupled", None), ("strong", (np.ones((5, 5)) - np.eye(5)) * 3 * nS)]:
    states, spikes = run_sim(5, model, coupling, None, dur=5*second,
        initial_values=initial, solver="rk4", dt=100*us, staterecorddt=.5*ms)
    variants[key] = {
        "voltage": np.round(np.asarray(states.v / mV), 3).tolist(),
        "spikes": [np.round(np.asarray(spikes.t[spikes.i == i] / ms), 2).tolist() for i in range(5)],
        "gapNS": (np.zeros((5, 5)) if coupling is None else np.asarray(coupling / nS)).tolist(),
    }

# Archive uses three consecutive .npy arrays, not a pickled Python object.
source_file = Path("data/SpEs_all5/control/split23h06xValium_5units_200305_m1_181sec_SpE.npy")
with source_file.open("rb") as f:
    times, identities, wingbeats = np.load(f), np.load(f), np.load(f)
print("Experimental array ranges:", times.shape, identities.shape, wingbeats.shape,
      (float(times.min()), float(times.max())), np.unique(identities), flush=True)
experimental = {"file": str(source_file), "sha256": hashlib.sha256(source_file.read_bytes()).hexdigest(),
    "times": times.tolist(), "identities": identities.tolist(), "wingbeats": wingbeats.tolist()}
(ROOT / "work/embodiment/experimental-wing-inspection.json").write_text(json.dumps(experimental))
payload = {"source": "https://zenodo.org/records/7740678", "paper": "https://doi.org/10.1038/s41586-023-06099-0",
    "archiveMD5": "abcfdfa63d0d7c15f948df080d288ec9", "durationMs": 5000, "sampleDtMs": .5,
    "parameters": model["parameters"], "initialPhases": [.9, .6, .5, .7, .8],
    "integration": "Brian2 RK4, dt 0.1 ms, deterministic; Fig. 3B settings. Other coupling settings are our interventions, not reproductions of other paper panels.",
    "variants": variants}
# First full integer-second window after this recording begins; no search for a
# visually appealing segment. Keep the detected events, not invented waveforms.
crop_start = float(np.ceil(times.min()))
crop_end = crop_start + 5
payload["experimental"] = {
    "file": str(source_file), "sha256": experimental["sha256"], "cropStartSeconds": crop_start,
    "spikes": [np.round((times[(times >= crop_start) & (times < crop_end) & (identities == i)] - crop_start) * 1000, 3).tolist() for i in range(5)],
    "wingbeats": np.round((wingbeats[(wingbeats >= crop_start) & (wingbeats < crop_end)] - crop_start) * 1000, 3).tolist(),
    "note": "Detected motor-unit events, not intracellular voltage. Independent experimental and model runs; no spike-time alignment or anatomical matching of individual units.",
}
(OUT / "wing-replay.json").write_text(json.dumps(payload, separators=(",", ":")))
print("Exported", OUT / "wing-replay.json", flush=True)
