/* eslint-disable no-restricted-globals */
/* global ImageDecoder */

const buffersBySize = new Map();

const acquireBuffer = (size) => {
    const list = buffersBySize.get(size);
    return list && list.length > 0 ? list.pop() : new ArrayBuffer(size);
};

const releaseBuffer = (buffer) => {
    const size = buffer.byteLength;
    let list = buffersBySize.get(size);
    if (!list) {
        list = [];
        buffersBySize.set(size, list);
    }
    if (list.length < 4) {
        list.push(buffer);
    }
};

const decodeImage = async (blob) => {
    const decoder = new ImageDecoder({data: await blob.arrayBuffer(), type: 'image/webp'});
    try {
        const {image} = await decoder.decode();
        const width = image.codedWidth;
        const height = image.codedHeight;
        const ySize = width * height;
        const format = image.format;
        if (format === 'I420' || format === 'NV12') {
            const uvSize = (width >> 1) * (height >> 1);
            const buffer = acquireBuffer(ySize + uvSize * 2);
            const pixels = new Uint8Array(buffer);
            await image.copyTo(pixels);
            image.close();
            return {width, height, gray: pixels.subarray(0, ySize), buffer};
        }
        const buffer = acquireBuffer(ySize * 4);
        const pixels = new Uint8Array(buffer);
        await image.copyTo(pixels, {format: 'RGBA'});
        for (let i = 0; i < ySize; i++) {
            pixels[i] = pixels[i * 4];
        }
        image.close();
        return {width, height, gray: pixels.subarray(0, ySize), buffer};
    } finally {
        decoder.close();
    }
};

const decodeFallback = async (blob) => {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', {willReadFrequently: true});
    context.drawImage(bitmap, 0, 0);
    if (bitmap.close) {
        bitmap.close();
    }
    const {data} = context.getImageData(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const buffer = acquireBuffer(width * height);
    const pixels = new Uint8Array(buffer);
    for (let i = 0, j = 0; i < pixels.length; i++, j += 4) {
        pixels[i] = 16 + ((data[j] * 219) / 255 | 0);
    }
    return {width, height, gray: pixels, buffer};
};

addEventListener('message', async (event) => {
    const {key, url, blob, recycle} = event.data;
    if (recycle) {
        releaseBuffer(recycle);
        return;
    }
    try {
        const source = blob || await (await fetch(url)).blob();
        const result = typeof ImageDecoder === 'function'
            ? await decodeImage(source)
            : await decodeFallback(source);
        postMessage({key, width: result.width, height: result.height, gray: result.gray}, [result.buffer]);
    } catch (error) {
        postMessage({key, failed: true, error: String(error)});
    }
});
