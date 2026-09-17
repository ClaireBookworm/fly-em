"""Export a synchronized NeuroMechFly observer + FlyVis run for the web.

Adapted from the authors' advanced_vision tutorial (FlyGym Gymnasium 1.3.2).
The observer is stationary; the target walks under a prescribed hybrid controller.
This is NOT visually controlled locomotion or a whole-brain simulation.
"""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import os
import faulthandler
import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[1]
faulthandler.enable()
os.environ.setdefault("FLYVIS_ROOT_DIR", str(ROOT / "work/embodiment/flyvis-data"))
import flyvis
from flygym_gymnasium import Camera, Simulation
from flygym_gymnasium.examples.locomotion import HybridTurningFly
from flygym_gymnasium.examples.vision import RealisticVisionFly

torch.set_num_threads(2)
OUT = ROOT / "public/data/embodied"
OUT.mkdir(parents=True, exist_ok=True)
dt = 1e-4
common = dict(enable_adhesion=True, draw_adhesion=False, seed=0, timestep=dt,
    contact_sensor_placements=[f"{leg}{segment}" for leg in ["LF","LM","LH","RF","RM","RH"]
        for segment in ["Tibia","Tarsus1","Tarsus2","Tarsus3","Tarsus4","Tarsus5"]])
target = HybridTurningFly(name="target", spawn_pos=(3,3,.5), spawn_orientation=(0,0,-np.pi/2), **common)
observer = RealisticVisionFly(name="observer", spawn_pos=(0,0,.5), spawn_orientation=(0,0,0),
    head_stabilization_model="thorax", vision_refresh_rate=200, **common)
cam = Camera(attachment_point=observer.model.worldbody, camera_name="camera_top_zoomout",
    targeted_fly_names=[observer.name], play_speed=.1, window_size=(480,480))
sim = Simulation(flies=[observer,target], cameras=[cam], timestep=dt)
print("Physics initialized", flush=True)
nodes = observer.vision_network.connectome.nodes
types = ["R1","L1","L2","Mi1","Tm3","Mi4","Mi9","Tm1","Tm2","Tm4","Tm9","T4a","T4b","T5a","T5b"]
node_types = nodes.type[:].astype(str)
selected = np.flatnonzero(np.isin(node_types, types))
metadata = [{"index": int(i), "type": node_types[i], "u": int(nodes.u[i]), "v": int(nodes.v[i])} for i in selected]
frames = []
obs, info = sim.reset(seed=0)
print("Vision steady state initialized", flush=True)
for step in range(5000):
    obs, _, _, _, info = sim.step({"observer": np.zeros(2), "target": np.ones(2)})
    sim.render()
    if step % 100 == 0:
        visual = observer.retina_mapper.flygym_to_flyvis(obs["observer"]["vision"].max(axis=-1))
        frames.append({"timeMs": round((step+1)*dt*1000, 2),
            "retina": np.asarray(visual, dtype=np.float64).round(4).tolist(),
            "activity": np.asarray(obs["observer"]["nn_activities_arr"][:,selected], dtype=np.float64).round(4).tolist(),
            "targetPosition": np.asarray(obs["target"]["fly"][0], dtype=np.float64).round(4).tolist(),
            "targetJoints": np.asarray(obs["target"]["joints"][0], dtype=np.float64).round(4).tolist(),
            "observerDrive": [0,0], "targetDrive": [1,1]})
    if step % 1000 == 0: print(f"{step}/5000 steps", flush=True)
cam.save_video(OUT / "observer.mp4", stabilization_time=0)
input_idx = observer.vision_network.connectome.nodes.layer_index["R1"][:]
retina = [{"u": int(nodes.u[i]), "v": int(nodes.v[i])} for i in input_idx]
payload = {"durationMs": 500, "videoSlowdown": 10, "sampleDtMs": 10, "neuralDtMs": 5,
    "seed": 0, "firstTargetJoint": target.actuated_joints[0],
    "displaySampling": "Nearest earlier exported frame; last sample held to run end. Activities rounded to four decimals.",
    "physicsDtMs": .1, "nodes": metadata, "retina": retina, "types": types, "frames": frames,
    "model": "FlyVis flow/0000/000 best checkpoint", "totalCellsPerEye": len(node_types),
    "versions": {p: importlib.metadata.version(p) for p in ["flyvis","flygym-gymnasium","mujoco","torch"]},
    "source": "https://github.com/NeLy-EPFL/flygym-gymnasium/blob/d285260a1c8a7b3494150cd1590f2c9fe4b5e06b/doc/source/tutorials/advanced_vision.rst",
    "units": "raw model activity in arbitrary units; not spikes or calibrated mV",
    "control": "Prescribed observer [0,0], target [1,1]; hybrid CPG controller; no visual feedback into motor drive",
    "checkpointArchiveSHA256": hashlib.sha256((flyvis.root_dir / "results_pretrained_models.zip").read_bytes()).hexdigest()}
(OUT / "vision-replay.json").write_text(json.dumps(payload, separators=(",", ":")))
print("Exported", len(frames), "matched frames", flush=True)
sim.close()
