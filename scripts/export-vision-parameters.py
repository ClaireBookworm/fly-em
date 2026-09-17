"""Export the fitted per-type parameters of the replay's exact FlyVis checkpoint."""
import json
import os
from pathlib import Path
import torch

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("FLYVIS_ROOT_DIR", str(ROOT / "work/embodiment/flyvis-data"))
import flyvis
from flyvis import NetworkView, Network

torch.set_num_threads(1)
view = NetworkView(flyvis.results_dir / "flow/0000/000")
network = Network(**view.dir.config.network)
network.load_state_dict(torch.load(view.dir / "best_chkpt", map_location=flyvis.device)["network"])
params = network._param_api()
types = network.connectome.nodes.type[:].astype(str)
values = {}
for index, cell_type in enumerate(types):
    if cell_type not in values:
        values[cell_type] = {
            "bias": float(params.nodes.bias[index].detach().cpu()),
            "timeConstantSeconds": float(params.nodes.time_const[index].detach().cpu()),
        }
output = ROOT / "public/data/embodied/vision-parameters.json"
output.write_text(json.dumps({"checkpoint": "flow/0000/000 best_chkpt", "cellParameters": values}, separators=(",", ":")))
print("Exported", len(values), "cell-type parameter sets")
