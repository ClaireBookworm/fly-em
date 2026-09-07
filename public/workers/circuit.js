import {simulate} from './simulation.js';
self.onmessage = ({data}) => { const {id,circuit,key,settings}=data; try {const results=Object.fromEntries(['lif','hh','graded'].map(m=>[m,simulate(circuit,key,m,settings)]));self.postMessage({id,results});} catch(error) {self.postMessage({id,error:error instanceof Error?error.message:String(error)});} };
