import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(
  new URL('../lib/simulation.ts', import.meta.url),
  'utf8',
);
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
fs.mkdirSync(new URL('../public/workers/', import.meta.url), {
  recursive: true,
});
fs.writeFileSync(
  new URL('../public/workers/simulation.js', import.meta.url),
  result.outputText,
);
fs.writeFileSync(
  new URL('../public/workers/circuit.js', import.meta.url),
  `import {simulate} from './simulation.js';\nself.onmessage = ({data}) => { const {id,circuit,key,settings}=data; try {const results=Object.fromEntries(['lif','hh','graded'].map(m=>[m,simulate(circuit,key,m,settings)]));self.postMessage({id,results});} catch(error) {self.postMessage({id,error:error instanceof Error?error.message:String(error)});} };\n`,
);
