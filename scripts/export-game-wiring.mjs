import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const atlas = JSON.parse(
  readFileSync(new URL('../public/data/atlas.json', import.meta.url), 'utf8'),
);
const circuit = atlas.circuits.heading;
const strength = circuit.nodes.map((_, i) =>
  circuit.edges.reduce((s, e) => s + (e[0] === i || e[1] === i ? e[2] : 0), 0),
);
const ids = strength
  .map((s, i) => ({ s, i }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 32)
  .map((n) => n.i);
const output = {
  dataset: atlas.dataset,
  release: atlas.release,
  selection:
    '32 highest total-contact nodes within the bundled heading circuit; induced subgraph',
  source: 'https://neuprint.janelia.org/?dataset=male-cns:v1.0',
  nodes: ids.map((i) => circuit.nodes[i]),
  edges: circuit.edges
    .filter((e) => ids.includes(e[0]) && ids.includes(e[1]))
    .map((e) => [ids.indexOf(e[0]), ids.indexOf(e[1]), e[2]]),
};
mkdirSync(new URL('../public/data/games/', import.meta.url), {
  recursive: true,
});
writeFileSync(
  new URL('../public/data/games/wiring.json', import.meta.url),
  JSON.stringify(output),
);
console.log(
  `${output.nodes.length} nodes, ${output.edges.length} directed edges`,
);
