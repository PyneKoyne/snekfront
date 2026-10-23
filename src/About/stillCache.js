import * as THREE from 'three';

const MAX_CACHED = 20;
const WORKER_COUNT = 2;
const MAX_QUEUE = 24;
const RADIUS = 6;
const LEAD = 3;
const MAX_FAILURES = 3;
const PRELOAD_CONCURRENCY = 4;
const PRELOAD_DELAY = 6000;

export const createStillCache = ({count, urlFor}) => {
    const cache = new Map();
    const freeTextures = [];
    const pending = new Map();
    const blobs = new Map();
    const queue = [];
    const queued = new Set();
    const inflight = new Map();
    const busy = new Set();
    const failures = new Map();
    const workers = [];
    let focus = 0;
    let preloadCursor = 0;
    let destroyed = false;

    const createTexture = (width, height) => {
        const texture = new THREE.DataTexture(new Uint8Array(width * height), width, height, THREE.RedFormat, THREE.UnsignedByteType);
        texture.unpackAlignment = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        return texture;
    };

    const evictOne = () => {
        if (cache.size < MAX_CACHED) {
            return;
        }
        let worstIndex = null;
        let worstDistance = -1;
        for (const index of cache.keys()) {
            const distance = Math.abs(index - focus);
            if (distance > worstDistance) {
                worstDistance = distance;
                worstIndex = index;
            }
        }
        if (worstIndex !== null) {
            freeTextures.push(cache.get(worstIndex));
            cache.delete(worstIndex);
        }
    };

    const commit = (center) => {
        focus = center;
        for (const [key, entry] of pending) {
            pending.delete(key);
            const index = Number(key);
            if (cache.has(index)) {
                entry.worker.postMessage({recycle: entry.gray.buffer}, [entry.gray.buffer]);
                continue;
            }
            let texture = freeTextures.pop();
            if (!texture) {
                evictOne();
                texture = freeTextures.pop();
            }
            if (!texture) {
                texture = createTexture(entry.width, entry.height);
            }
            const oldData = texture.image.data;
            texture.image.data = entry.gray;
            texture.needsUpdate = true;
            texture.__index = index;
            cache.set(index, texture);
            entry.worker.postMessage({recycle: oldData.buffer}, [oldData.buffer]);
        }
    };

    const pump = () => {
        while (inflight.size < WORKER_COUNT && queue.length > 0) {
            const index = queue.shift();
            queued.delete(index);
            if (cache.has(index) || destroyed) {
                continue;
            }
            const worker = workers.find((candidate) => !busy.has(candidate));
            if (!worker) {
                queued.add(index);
                queue.unshift(index);
                break;
            }
            busy.add(worker);
            inflight.set(String(index), worker);
            const blob = blobs.get(index);
            worker.postMessage(blob ? {key: String(index), blob} : {key: String(index), url: urlFor(index)});
        }
    };

    const preload = async () => {
        while (!destroyed) {
            const index = preloadCursor;
            preloadCursor += 1;
            if (index >= count) {
                return;
            }
            if (blobs.has(index)) {
                continue;
            }
            try {
                const response = await fetch(urlFor(index), {priority: 'low'});
                const blob = await response.blob();
                if (!destroyed) {
                    blobs.set(index, blob);
                }
            } catch {
            }
        }
    };

    const createWorker = () => {
        const worker = new Worker(new URL('./frameWorker.js', import.meta.url));
        worker.onmessage = (event) => {
            const {key, width, height, gray, failed} = event.data;
            busy.delete(worker);
            if (inflight.get(key) === worker) {
                inflight.delete(key);
            }
            if (!destroyed && !failed && gray) {
                failures.delete(key);
                pending.set(key, {width, height, gray, worker});
            } else if (gray) {
                worker.postMessage({recycle: gray.buffer}, [gray.buffer]);
            } else if (failed && !destroyed) {
                const count = (failures.get(key) || 0) + 1;
                failures.set(key, count);
                const index = Number(key);
                if (count <= MAX_FAILURES && Math.abs(index - focus) <= RADIUS) {
                    queue.push(index);
                    queued.add(index);
                }
            }
            pump();
        };
        return worker;
    };

    for (let i = 0; i < WORKER_COUNT; i++) {
        workers.push(createWorker());
    }

    const ensure = (center, direction) => {
        if (destroyed) {
            return;
        }
        focus = center;
        for (let i = queue.length - 1; i >= 0; i--) {
            if (Math.abs(queue[i] - center) > RADIUS) {
                queued.delete(queue[i]);
                queue.splice(i, 1);
            }
        }
        const wanted = [];
        for (let offset = -RADIUS; offset <= RADIUS; offset++) {
            const index = center + offset;
            if (index < 0 || index >= count || cache.has(index) || inflight.has(index) || queued.has(index)) {
                continue;
            }
            wanted.push({index, priority: offset === 0 ? -1 : Math.abs(offset - direction * LEAD)});
        }
        wanted.sort((a, b) => a.priority - b.priority);
        for (const item of wanted) {
            if (queue.length >= MAX_QUEUE) {
                break;
            }
            queue.push(item.index);
            queued.add(item.index);
        }
        pump();
    };

    const preloadTimer = setTimeout(() => {
        const connection = navigator.connection;
        if (connection && (connection.saveData || ['slow-2g', '2g', '3g'].includes(connection.effectiveType))) {
            return;
        }
        for (let i = 0; i < PRELOAD_CONCURRENCY; i++) {
            preload();
        }
    }, PRELOAD_DELAY);

    const get = (index) => cache.get(index) || null;

    const nearest = (center) => {
        let best = null;
        let bestDistance = Infinity;
        for (const index of cache.keys()) {
            const distance = Math.abs(index - center);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = index;
            }
        }
        return best === null ? null : cache.get(best);
    };

    const dispose = () => {
        destroyed = true;
        clearTimeout(preloadTimer);
        queue.length = 0;
        queued.clear();
        inflight.clear();
        blobs.clear();
        pending.clear();
        for (const worker of workers) {
            worker.terminate();
        }
        for (const texture of cache.values()) {
            texture.dispose();
        }
        for (const texture of freeTextures) {
            texture.dispose();
        }
        cache.clear();
        freeTextures.length = 0;
    };

    return {ensure, commit, get, nearest, dispose};
};
