export const defaults = {
    gain: 1,
    drive: 1,
    wiring: 'recorded',
    seed: 42,
    randomInitial: false,
    minContacts: 1,
    dropout: 0,
    silencedType: 'none',
    direction: 1,
};
export function random(seed) {
    let a = seed >>> 0;
    return () => {
        a += 0x6d2b79f5;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function prepareEdges(c, p) {
    const rng = random(p.seed);
    let e = c.edges.filter((x) => x[2] >= p.minContacts).map((x) => x.slice());
    if (p.wiring === 'shuffled') {
        const weights = e.map((x) => x[2]);
        for (let i = weights.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [weights[i], weights[j]] = [weights[j], weights[i]];
        }
        e = e.map((x, i) => [x[0], x[1], weights[i]]);
    }
    if (p.wiring === 'rewired') {
        const exists = new Set(e.map((x) => `${x[0]},${x[1]}`));
        for (let i = 0; i < e.length * 10; i++) {
            const a = Math.floor(rng() * e.length), b = Math.floor(rng() * e.length);
            if (a === b)
                continue;
            const x = e[a], y = e[b];
            if (x[0] === y[1] ||
                y[0] === x[1] ||
                exists.has(`${x[0]},${y[1]}`) ||
                exists.has(`${y[0]},${x[1]}`))
                continue;
            exists.delete(`${x[0]},${x[1]}`);
            exists.delete(`${y[0]},${y[1]}`);
            [x[1], y[1]] = [y[1], x[1]];
            exists.add(`${x[0]},${x[1]}`);
            exists.add(`${y[0]},${y[1]}`);
        }
    }
    if (p.dropout > 0)
        e = e.filter(() => rng() >= p.dropout);
    return e;
}
export function sign(nt) {
    return nt === 'acetylcholine'
        ? 1
        : ['gaba', 'glutamate', 'histamine'].includes(nt.toLowerCase())
            ? -1
            : 0;
}
const vtrap = (x) => Math.abs(x) < 1e-5 ? 1 + x / 2 : x / -Math.expm1(-x);
export function rates(v) {
    return [
        vtrap((v + 40) / 10),
        4 * Math.exp(-(v + 65) / 18),
        0.07 * Math.exp(-(v + 65) / 20),
        1 / (1 + Math.exp(-(v + 35) / 10)),
        0.1 * vtrap((v + 55) / 10),
        0.125 * Math.exp(-(v + 65) / 80),
    ];
}
export function hhStep(v, m, h, n, current, dt) {
    const r = rates(v);
    const gate = (x, a, b) => a / (a + b) + (x - a / (a + b)) * Math.exp(-(a + b) * dt);
    m = gate(m, r[0], r[1]);
    h = gate(h, r[2], r[3]);
    n = gate(n, r[4], r[5]);
    const na = 120 * m * m * m * h, k = 36 * n * n * n * n, g = na + k + 0.3, eq = (na * 50 + k * -77 + 0.3 * -54.4 + current) / g;
    return [eq + (v - eq) * Math.exp(-g * dt), m, h, n];
}
function stimulus(key, node, i, n, t, direction) {
    if (t < 100 || t > 450)
        return 0;
    if (key === 'escape') {
        if (node.type === 'LC4')
            return (Math.min(1, (t - 100) / 180) * Math.exp(-Math.max(0, t - 300) / 45));
        if (node.type === 'LPLC2')
            return ((1 / (1 + Math.exp(-(t - 240) / 28))) *
                Math.exp(-Math.max(0, t - 360) / 25));
        return 0;
    }
    if (key === 'heading') {
        if (node.type !== 'EPG' || t > 380)
            return 0;
        const m = node.label.match(/_([LR])(\d)/);
        const column = m
            ? m[1] === 'L'
                ? 8 - Number(m[2])
                : 7 + Number(m[2])
            : i % 16;
        const center = t < 260 ? 3 : 3 + direction * 4;
        const delta = Math.atan2(Math.sin(((column - center) * Math.PI) / 8), Math.cos(((column - center) * Math.PI) / 8));
        return Math.exp((-delta * delta) / 0.35);
    }
    if (/^T[45]/.test(node.type))
        return 0;
    const x = node.position?.[0] ?? 400;
    const center = 270 + direction * Math.max(-70, Math.min(70, (x - 440) * 1.5));
    return Math.exp(-(((t - center) / 35) ** 2));
}
export function trajectory(voltage) {
    const n = voltage.length, T = voltage[0]?.length ?? 0;
    if (!n || !T)
        return { points: [], explained: [] };
    const means = voltage.map((v) => v.reduce((a, b) => a + b, 0) / T);
    const X = voltage.map((v, i) => v.map((x) => x - means[i]));
    const C = Array.from({ length: n }, () => new Float64Array(n));
    let trace = 0;
    for (let i = 0; i < n; i++)
        for (let j = 0; j <= i; j++) {
            let s = 0;
            for (let t = 0; t < T; t++)
                s += (X[i][t] * X[j][t]) / T;
            C[i][j] = C[j][i] = s;
            if (i === j)
                trace += s;
        }
    const vectors = [], values = [];
    for (let k = 0; k < 2; k++) {
        let v = Array.from({ length: n }, (_, i) => Math.sin(i * 1.31 + k + 0.2));
        for (let iter = 0; iter < 32; iter++) {
            const out = C.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
            for (const prev of vectors) {
                const dot = out.reduce((s, x, j) => s + x * prev[j], 0);
                for (let j = 0; j < n; j++)
                    out[j] -= dot * prev[j];
            }
            const norm = Math.hypot(...out) || 1;
            v = out.map((x) => x / norm);
        }
        vectors.push(v);
        values.push(v.reduce((s, x, i) => s + x * C[i].reduce((q, y, j) => q + y * v[j], 0), 0));
    }
    const points = Array.from({ length: T }, (_, t) => vectors.map((v) => v.reduce((s, x, i) => s + x * X[i][t], 0)));
    return { points, explained: values.map((x) => (trace ? x / trace : 0)) };
}
export function simulate(c, key, model, p, duration = 600, customDt) {
    const n = c.nodes.length, dt = customDt ?? (model === 'hh' ? 0.025 : 0.1), steps = Math.round(duration / dt), every = Math.round(1 / dt), rng = random(p.seed), e = prepareEdges(c, p), sum = new Float64Array(n);
    e.forEach((x) => (sum[x[1]] += x[2]));
    const edges = e.map((x) => [
        x[0],
        x[1],
        (x[2] / Math.max(1, sum[x[1]])) * sign(c.nodes[x[0]].nt),
    ]);
    const v = Float64Array.from({ length: n }, () => -65 + (p.randomInitial ? (rng() - 0.5) * 12 : 0)), m = new Float64Array(n), h = new Float64Array(n), g = new Float64Array(n), syn = new Float64Array(n), net = new Float64Array(n), ref = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const r = rates(v[i]);
        m[i] = r[0] / (r[0] + r[1]);
        h[i] = r[2] / (r[2] + r[3]);
        g[i] = r[4] / (r[4] + r[5]);
    }
    const voltage = Array.from({ length: n }, () => []), spikes = Array.from({ length: n }, () => []), time = [], stim = [];
    const rawVoltage = Array.from({ length: n }, () => []);
    const diagnosticRows = () => Array.from({ length: n }, () => []);
    const diagnostics = {
        external: diagnosticRows(),
        synaptic: diagnosticRows(),
        intrinsic: diagnosticRows(),
        derivative: diagnosticRows(),
        release: diagnosticRows(),
        held: diagnosticRows(),
    };
    const binPeak = new Float64Array(n).fill(-100);
    for (let step = 0; step <= steps; step++) {
        const t = step * dt;
        if (step % every === 0) {
            net.fill(0);
            for (const [a, b, w] of edges)
                net[b] += w * syn[a];
            time.push(Math.round(t * 100) / 100);
            let total = 0;
            for (let i = 0; i < n; i++) {
                // Instantaneous terms in the exact implemented voltage equation, in mV/ms.
                // These are sampled before the step; reset events are a separate rule.
                const u = stimulus(key, c.nodes[i], i, n, t, p.direction) * p.drive;
                const q = net[i] * p.gain, V = v[i];
                let external, synaptic, intrinsic;
                if (model === 'lif') {
                    external = (24 * u) / 20;
                    synaptic = (35 * q) / 20;
                    intrinsic = (-65 - V) / 20;
                }
                else if (model === 'hh') {
                    external = 10 * u;
                    synaptic = 18 * q;
                    intrinsic = -(120 * m[i] ** 3 * h[i] * (V - 50) +
                        36 * g[i] ** 4 * (V + 77) +
                        0.3 * (V + 54.4));
                }
                else {
                    external = 0.065 * u * -V;
                    synaptic =
                        0.05 * Math.max(q, 0) * -V + 0.05 * Math.max(-q, 0) * (-75 - V);
                    intrinsic = 0.05 * (-65 - V);
                }
                const held = c.nodes[i].type === p.silencedType
                    ? 2
                    : model === 'lif' && ref[i] > 0
                        ? 1
                        : 0;
                rawVoltage[i].push(V);
                diagnostics.external[i].push(external);
                diagnostics.synaptic[i].push(synaptic);
                diagnostics.intrinsic[i].push(intrinsic);
                diagnostics.derivative[i].push(held ? 0 : external + synaptic + intrinsic);
                diagnostics.release[i].push(syn[i]);
                diagnostics.held[i].push(held);
                voltage[i].push(model === 'lif' && binPeak[i] > 0 ? 30 : v[i]);
                binPeak[i] = -100;
                total += stimulus(key, c.nodes[i], i, n, t, p.direction);
            }
            stim.push((total / Math.max(1, n)) * p.drive);
        }
        if (step === steps)
            break;
        for (let i = 0; i < n; i++) {
            if (c.nodes[i].type === p.silencedType) {
                v[i] = -65;
                syn[i] = 0;
                continue;
            }
            const input = stimulus(key, c.nodes[i], i, n, t, p.direction) * p.drive, drive = net[i] * p.gain, old = v[i];
            let spike = false;
            syn[i] *= Math.exp(-dt / 8);
            if (model === 'lif') {
                if (ref[i] > 0) {
                    ref[i] -= dt;
                    v[i] = -65;
                }
                else {
                    const eq = -65 + 24 * input + 35 * drive;
                    v[i] = eq + (v[i] - eq) * Math.exp(-dt / 20);
                    if (v[i] >= -50) {
                        spike = true;
                        v[i] = -65;
                        ref[i] = 2;
                        binPeak[i] = 30;
                    }
                }
            }
            else if (model === 'hh') {
                const q = hhStep(v[i], m[i], h[i], g[i], 10 * input + 18 * drive, dt);
                [v[i], m[i], h[i], g[i]] = q;
                spike = old < 0 && v[i] >= 0;
            }
            else {
                const ex = Math.max(0, drive) * 0.05 + input * 0.065, inh = Math.max(0, -drive) * 0.05, conductance = 0.05 + ex + inh, eq = (-65 * 0.05 - 75 * inh) / conductance;
                v[i] = eq + (v[i] - eq) * Math.exp(-conductance * dt);
                syn[i] = Math.max(0, Math.min(1, (v[i] + 65) / 35));
            }
            if (spike) {
                spikes[i].push(Math.round(t * 100) / 100);
                syn[i] += 1;
            }
            if (!Number.isFinite(v[i]) || Math.abs(v[i]) > 200)
                throw new Error('Numerical instability. Reduce drive or coupling.');
        }
    }
    const pc = trajectory(voltage);
    return {
        model,
        time,
        voltage,
        rawVoltage,
        diagnostics,
        spikes,
        stimulus: stim,
        edgeCount: e.length,
        contactCount: e.reduce((s, x) => s + x[2], 0),
        totalSpikes: spikes.reduce((s, x) => s + x.length, 0),
        trajectory: pc.points,
        explained: pc.explained,
    };
}
