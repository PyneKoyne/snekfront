import * as THREE from 'three';

/* global EncodedVideoChunk, VideoDecoder */

const CODEC = 'avc1.640028';
const DECODER_COUNT = 3;
const MAX_FED_PER_DECODER = 6;
const AHEAD = 12;
const BEHIND = 4;
const STALE_DISTANCE = 24;
const TEXTURE_POOL = 16;
const FRAME_DURATION_US = 33333;
const RETRY_DELAY = 2000;
const MAX_DECODE_ERRORS = 6;

export const createVideoSource = ({streamUrl, manifestUrl, startupFrames = 0}) => {
    const textures = new Map();
    const freeTextures = [];
    const pending = [];
    const queued = new Set();
    const inflight = new Map();
    const decoders = [];
    let manifest = null;
    let bytes = null;
    let received = 0;
    let totalBytes = 0;
    let loadedBytes = 0;
    let ready = false;
    let startupReady = startupFrames <= 0;
    let available = typeof VideoDecoder === 'function';
    let destroyed = false;
    let focus = 0;
    let decodeErrors = 0;

    const createTexture = () => {
        const texture = new THREE.Texture();
        texture.flipY = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        return texture;
    };

    const releaseTexture = (texture) => {
        texture.dispose();
        if (texture.image && texture.image.close) {
            texture.image.close();
        }
        texture.image = null;
    };

    const evictOne = () => {
        let worstIndex = null;
        let worstDistance = -1;
        for (const index of textures.keys()) {
            const distance = Math.abs(index - focus);
            if (distance > worstDistance) {
                worstDistance = distance;
                worstIndex = index;
            }
        }
        if (worstIndex !== null) {
            freeTextures.push(textures.get(worstIndex));
            textures.delete(worstIndex);
        }
    };

    const takeTexture = () => {
        let texture = freeTextures.pop();
        if (!texture && textures.size >= TEXTURE_POOL) {
            evictOne();
            texture = freeTextures.pop();
        }
        return texture || createTexture();
    };

    const frameAvailable = (index) => {
        const [offset, length] = manifest.frames[index];
        return received >= offset + length;
    };

    const pump = () => {
        if (!ready || destroyed) {
            return;
        }
        while (pending.length > 0) {
            const slot = decoders.find((candidate) => candidate.chain.length < MAX_FED_PER_DECODER);
            if (!slot) {
                break;
            }
            const position = pending.findIndex((index) => frameAvailable(index));
            if (position === -1) {
                break;
            }
            const index = pending.splice(position, 1)[0];
            queued.delete(index);
            if (index < 0 || index >= manifest.count || textures.has(index) || inflight.has(index)) {
                continue;
            }
            if (Math.abs(index - focus) > STALE_DISTANCE) {
                continue;
            }
            const [offset, length] = manifest.frames[index];
            inflight.set(index, slot);
            slot.chain.push(index);
            slot.timestamp += FRAME_DURATION_US;
            slot.decoder.decode(new EncodedVideoChunk({
                type: 'key',
                timestamp: slot.timestamp,
                data: bytes.subarray(offset, offset + length),
            }));
        }
    };

    const createDecoder = (width, height) => {
        const slot = {decoder: null, chain: [], timestamp: 0};

        const setup = () => {
            slot.decoder = new VideoDecoder({
                output: (frame) => {
                    const index = slot.chain.shift();
                    if (index === undefined) {
                        frame.close();
                        return;
                    }
                    inflight.delete(index);
                    if (destroyed) {
                        frame.close();
                        return;
                    }
                    const texture = takeTexture();
                    const previous = texture.image;
                    texture.image = frame;
                    texture.needsUpdate = true;
                    texture.__index = index;
                    if (previous && previous.close) {
                        previous.close();
                    }
                    textures.set(index, texture);
                    pump();
                },
                error: () => {
                    slot.chain.length = 0;
                    for (const [index, candidate] of inflight) {
                        if (candidate === slot) {
                            inflight.delete(index);
                        }
                    }
                    try {
                        slot.decoder.close();
                    } catch {
                    }
                    decodeErrors += 1;
                    if (!destroyed && decodeErrors <= MAX_DECODE_ERRORS) {
                        setup();
                        pump();
                    } else {
                        available = false;
                    }
                },
            });
            slot.decoder.configure({codec: CODEC, codedWidth: width, codedHeight: height, optimizeForLatency: true});
        };

        setup();
        return slot;
    };

    const ensure = (center, direction) => {
        focus = center;
        if (!ready || destroyed) {
            return;
        }
        for (let distance = 0; distance <= AHEAD; distance++) {
            const index = center + direction * distance;
            if (index < 0 || index >= manifest.count || textures.has(index) || inflight.has(index) || queued.has(index)) {
                continue;
            }
            queued.add(index);
            pending.push(index);
        }
        for (let distance = 1; distance <= BEHIND; distance++) {
            const index = center - direction * distance;
            if (index < 0 || index >= manifest.count || textures.has(index) || inflight.has(index) || queued.has(index)) {
                continue;
            }
            queued.add(index);
            pending.push(index);
        }
        pump();
    };

    const load = async () => {
        if (destroyed || !available) {
            return;
        }
        try {
            const manifestResponse = await fetch(manifestUrl);
            manifest = await manifestResponse.json();
            let support;
            try {
                support = await VideoDecoder.isConfigSupported({
                    codec: CODEC,
                    codedWidth: manifest.width,
                    codedHeight: manifest.height,
                    optimizeForLatency: true,
                });
            } catch {
                support = {supported: false};
            }
            if (!support.supported) {
                available = false;
                return;
            }
            if (decoders.length === 0) {
                for (let i = 0; i < DECODER_COUNT; i++) {
                    decoders.push(createDecoder(manifest.width, manifest.height));
                }
            }
            received = 0;
            loadedBytes = 0;
            totalBytes = 0;
            ready = false;
            startupReady = startupFrames <= 0;
            const startupEnd = manifest.frames[Math.min(startupFrames, manifest.count - 1)];
            const response = await fetch(streamUrl);
            totalBytes = Number(response.headers.get('content-length')) || 0;
            let buffer = totalBytes > 0 ? new Uint8Array(totalBytes) : new Uint8Array(1 << 20);
            bytes = buffer;
            const reader = response.body.getReader();
            while (true) {
                const {done, value} = await reader.read();
                if (done) {
                    break;
                }
                if (destroyed) {
                    return;
                }
                if (received + value.length > buffer.length) {
                    const grown = new Uint8Array(Math.max(buffer.length * 2, received + value.length));
                    grown.set(buffer.subarray(0, received));
                    buffer = grown;
                    bytes = buffer;
                }
                buffer.set(value, received);
                received += value.length;
                loadedBytes = received;
                if (!startupReady && received >= startupEnd[0] + startupEnd[1]) {
                    startupReady = true;
                }
                if (!ready && frameAvailable(0)) {
                    ready = true;
                    ensure(focus, 1);
                }
                pump();
            }
            if (destroyed) {
                return;
            }
            ready = true;
            startupReady = true;
            ensure(focus, 1);
            pump();
        } catch {
            if (!destroyed) {
                pending.length = 0;
                queued.clear();
                inflight.clear();
                for (const slot of decoders) {
                    slot.chain.length = 0;
                }
                setTimeout(load, RETRY_DELAY);
            }
        }
    };
    load();

    const get = (index) => textures.get(index) || null;

    const nearest = (center) => {
        let best = null;
        let bestDistance = Infinity;
        for (const index of textures.keys()) {
            const distance = Math.abs(index - center);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = index;
            }
        }
        return best === null ? null : textures.get(best);
    };

    const progress = () => (totalBytes > 0 ? Math.min(loadedBytes / totalBytes, 1) : 0);

    const dispose = () => {
        destroyed = true;
        for (const slot of decoders) {
            try {
                slot.decoder.close();
            } catch {
            }
        }
        for (const texture of textures.values()) {
            releaseTexture(texture);
        }
        for (const texture of freeTextures) {
            releaseTexture(texture);
        }
        textures.clear();
        freeTextures.length = 0;
        pending.length = 0;
        queued.clear();
        inflight.clear();
    };

    return {
        ensure,
        get,
        nearest,
        progress,
        available: () => available,
        startupReady: () => startupReady,
        dispose,
    };
};
