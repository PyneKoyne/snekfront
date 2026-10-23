import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Card, Flex, Typography} from 'antd';
import Meta from 'antd/es/card/Meta';
import {AppstoreOutlined, CompassOutlined, MailOutlined, RollbackOutlined} from '@ant-design/icons';
import * as THREE from 'three';
import Lenis from 'lenis';

import './About.css';
import logo from '../fullLogo.svg';
import {createVideoSource} from './videoSource';
import {createStillCache} from './stillCache';

const EMAIL_LINK = 'kenny.zheng@mail.utoronto.ca';
const SCROLL_LENGTH = 2640;
const VIEW_YAW = Math.PI / 2;
const VIEW_PITCH = 0;
const YAW_RANGE = 3.14;
const PITCH_RANGE = 0.6;
const FPS = 30;
const FRAME_COUNT = 600;
const FLY_BY_SCROLL = 14.4;
const SLOW_SCROLL_THRESHOLD = 1.5;

const MOMENTS = [
    {t0: 1.3, t1: 3.6},
    {t0: 4.2, t1: 6.3},
    {t0: 6.8, t1: 9.2},
    {t0: 9.8, t1: 12.9},
    {t0: 17.7, t1: 19.4, last: true, gapScroll: FLY_BY_SCROLL},
];

const stillUrl = (index) => new URL(
    `${process.env.PUBLIC_URL}/about-frames/f_${String(index + 1).padStart(4, '0')}.webp`,
    window.location.href
).href;
const streamUrl = new URL(`${process.env.PUBLIC_URL}/scroll/scroll.h264`, window.location.href).href;
const manifestUrl = new URL(`${process.env.PUBLIC_URL}/scroll/frames.json`, window.location.href).href;

const VERTEX_SHADER = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform sampler2D uMap;

    void main() {
        float gray = texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y)).r;
        gray = clamp((gray - 0.0627451) / 0.8588235, 0.0, 1.0);
        vec3 color = gray < 0.501961
            ? mix(vec3(0.0), vec3(1.0, 0.0, 0.0), gray / 0.501961)
            : mix(vec3(1.0, 0.0, 0.0), vec3(1.0), (gray - 0.501961) / 0.498039);
        gl_FragColor = vec4(color, 1.0);
    }
`;

const HIGHLIGHTED_PROJECTS = [
    {
        image: 'https://pynekoyne.com/files/blog/realEngine.jpg',
        title: 'Real Engine',
        description: 'A Java graphics engine I developed that uses stippling to render objects.',
        link: 'https://pynekoyne.com/things/RealEngine',
    },
    {
        image: 'https://scontent.fyto1-2.fna.fbcdn.net/v/t39.30808-6/359807927_852269239650621_2223308133908208680_n.jpg?stp=dst-jpg_tt6&cstp=mx554x554&ctp=s554x554&_nc_cat=103&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=orjKqvCgslYQ7kNvwGMq58l&_nc_oc=AdopA-V8SFL1I-FvfL_r_bIy-03fQhA_5CJW026qORuSwYH23emhdJArytaq83C8SWcLgUjYjqr0-i2n8EklJguR&_nc_zt=23&_nc_ht=scontent.fyto1-2.fna&_nc_gid=ZfDKwDt2LmOs4mFs4it20w&_nc_ss=7b289&oh=00_AQP8H4k0JqklwFKhmvx0CXF67AyxKxBDWxcAcTSpElfTCg&oe=6AE170DD',
        title: 'Strategy Lead',
        description: 'Managed seven software projects to improve solar car performance for the 2028 American Solar Challenge.',
        link: 'https://blueskysolar.org',
    },
];

const LINKS = [
    {icon: <RollbackOutlined/>, label: 'Home', link: '/'},
    {icon: <AppstoreOutlined/>, label: 'Things', link: '/things'},
    {icon: <MailOutlined/>, label: 'Email', link: EMAIL_LINK},
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildScrollMapping = (moments = MOMENTS) => {
    const points = [{p: 0, t: 0}];
    let p = 0;
    let t = 0;

    moments.forEach((moment) => {
        p += moment.gapScroll ?? Math.max(moment.t0 - t, 0);
        const cardStart = p;
        p += moment.t1 - moment.t0;
        points.push({p: cardStart, t: moment.t0});
        points.push({p, t: moment.t1});
        t = moment.t1;
    });

    const total = points[points.length - 1].p;

    return {
        points: points.map(({p, t}) => ({p: p / total, t})),
        cards: moments.map((moment, i) => ({
            ...moment,
            p0: points[i * 2 + 1].p / total,
            p1: points[i * 2 + 2].p / total,
        })),
    };
};

const progressToTime = (mapping, progress) => {
    const {points} = mapping;

    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];

        if (progress <= b.p || i === points.length - 1) {
            const span = b.p - a.p;
            const f = span > 0 ? clamp((progress - a.p) / span, 0, 1) : 1;
            return a.t + f * (b.t - a.t);
        }
    }

    return 0;
};

const AboutView = () => {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const mountRef = useRef(null);
    const progressTrackRef = useRef(null);
    const progressThumbRef = useRef(null);
    const loaderTextRef = useRef(null);
    const enableMotionRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [atEnd, setAtEnd] = useState(false);
    const [motionPrompt, setMotionPrompt] = useState(false);
    const mapping = useMemo(() => buildScrollMapping(), []);

    useEffect(() => {
        const container = containerRef.current;
        const mount = mountRef.current;

        if (!container || !mount) {
            return undefined;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1100);
        camera.rotation.order = 'YXZ';

        const geometry = new THREE.SphereGeometry(500, 64, 40);
        geometry.scale(-1, 1, 1);

        const placeholderTexture = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat);
        placeholderTexture.needsUpdate = true;

        const material = new THREE.ShaderMaterial({
            uniforms: {uMap: {value: placeholderTexture}},
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
        });
        scene.add(new THREE.Mesh(geometry, material));

        const renderer = new THREE.WebGLRenderer({antialias: false, powerPreference: 'high-performance'});
        const gl = renderer.getContext();
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const rendererName = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
        const softwareRendering = /swiftshader|llvmpipe|softpipe|software/i.test(rendererName);
        renderer.setPixelRatio(softwareRendering ? 1 : Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        let forceRender = true;
        let lastProgress = -1;

        const resize = () => {
            const width = mount.clientWidth;
            const height = mount.clientHeight;
            if (width === 0 || height === 0) {
                return;
            }
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            lastProgress = -1;
            forceRender = true;
        };
        resize();

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);

        const pointer = {x: 0, y: 0};
        const onPointerMove = (event) => {
            pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
            pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('pointermove', onPointerMove);

        const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const supportsOrientation = typeof DeviceOrientationEvent !== 'undefined';
        const requestMotionPermission = supportsOrientation && typeof DeviceOrientationEvent.requestPermission === 'function'
            ? () => DeviceOrientationEvent.requestPermission()
            : null;
        const gyro = {active: false, yaw: VIEW_YAW, pitch: VIEW_PITCH, originYaw: 0, originPitch: 0};
        const orientationEuler = new THREE.Euler();
        const orientationQuaternion = new THREE.Quaternion();
        const zee = new THREE.Vector3(0, 0, 1);
        const q0 = new THREE.Quaternion();
        const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

        const onDeviceOrientation = (event) => {
            if (event.alpha === null || event.beta === null || event.gamma === null) {
                return;
            }
            const alpha = THREE.MathUtils.degToRad(event.alpha);
            const beta = THREE.MathUtils.degToRad(event.beta);
            const gamma = THREE.MathUtils.degToRad(event.gamma);
            const screenAngle = window.screen.orientation && typeof window.screen.orientation.angle === 'number'
                ? window.screen.orientation.angle
                : (window.orientation || 0);
            orientationEuler.set(beta, alpha, -gamma, 'YXZ');
            orientationQuaternion.setFromEuler(orientationEuler);
            orientationQuaternion.multiply(q1);
            orientationQuaternion.multiply(q0.setFromAxisAngle(zee, -THREE.MathUtils.degToRad(screenAngle)));
            orientationEuler.setFromQuaternion(orientationQuaternion, 'YXZ');
            if (!gyro.active) {
                gyro.active = true;
                gyro.originYaw = orientationEuler.y;
                gyro.originPitch = orientationEuler.x;
            }
            gyro.yaw = VIEW_YAW + (orientationEuler.y - gyro.originYaw);
            gyro.pitch = THREE.MathUtils.clamp(orientationEuler.x - gyro.originPitch, -1.2, 1.2);
        };

        const startGyro = () => {
            window.addEventListener('deviceorientation', onDeviceOrientation);
        };

        if (coarsePointer && supportsOrientation) {
            startGyro();
            if (requestMotionPermission) {
                enableMotionRef.current = async () => {
                    try {
                        await requestMotionPermission();
                    } catch {
                    }
                    setMotionPrompt(false);
                };
            }
        }

        const video = createVideoSource({streamUrl, manifestUrl, startupFrames: Math.round(8 * FPS)});
        const stills = createStillCache({count: FRAME_COUNT, urlFor: stillUrl});

        const previousScrollRestoration = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const lenis = prefersReducedMotion ? null : new Lenis({
            autoRaf: true,
            lerp: 0.2,
            smoothWheel: true,
            wheelMultiplier: 0.7,
        });

        const clock = new THREE.Clock();
        const endCard = mapping.cards[mapping.cards.length - 1];
        let yaw = VIEW_YAW;
        let pitch = VIEW_PITCH;
        let endActive = false;
        let readyShown = false;
        let readyAt = 0;
        let motionPromptShown = false;
        let lastEnsureIndex = -100;
        let lastStillsEnsureIndex = -100;
        let wasSlow = false;
        let previousIndex = 0;
        let velocity = 0;
        let renderCount = 0;
        let raf;

        const tick = () => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min(clock.getDelta(), 0.1);

            const rect = container.getBoundingClientRect();
            const scrollable = rect.height - window.innerHeight;
            const progress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0;

            const frameIndex = clamp(Math.round(progressToTime(mapping, progress) * FPS), 0, FRAME_COUNT - 1);
            const direction = Math.sign(frameIndex - previousIndex);

            velocity = velocity * 0.85 + Math.abs(frameIndex - previousIndex) * 0.15;
            if (!readyShown || Math.abs(frameIndex - lastEnsureIndex) >= 2) {
                video.ensure(frameIndex, direction);
                lastEnsureIndex = frameIndex;
            }
            const slow = velocity < SLOW_SCROLL_THRESHOLD;
            if (slow && (!wasSlow || !readyShown || Math.abs(frameIndex - lastStillsEnsureIndex) >= 1)) {
                stills.ensure(frameIndex, direction);
                lastStillsEnsureIndex = frameIndex;
            }
            wasSlow = slow;
            stills.commit(frameIndex);

            let needsRender = forceRender;
            forceRender = false;
            const texture = stills.get(frameIndex) || video.get(frameIndex) || video.nearest(frameIndex) || stills.nearest(frameIndex);
            if (texture && material.uniforms.uMap.value !== texture) {
                material.uniforms.uMap.value = texture;
                needsRender = true;
            }

            const videoAvailable = video.available();
            if (!readyShown && loaderTextRef.current) {
                loaderTextRef.current.textContent = videoAvailable
                    ? `Loading 360° ${Math.min(Math.round(video.progress() * 100), 99)}%`
                    : 'Loading 360°';
            }
            const readyTexture = videoAvailable
                ? (video.startupReady() ? video.get(frameIndex) : null)
                : stills.get(frameIndex) || stills.nearest(frameIndex);
            if (!readyShown && readyTexture) {
                readyShown = true;
                readyAt = performance.now();
                setReady(true);
            }
            if (!motionPromptShown && coarsePointer && enableMotionRef.current && !gyro.active
                && readyAt > 0 && performance.now() - readyAt > 1500) {
                motionPromptShown = true;
                setMotionPrompt(true);
            }

            const damp = 1 - Math.exp(-dt * 5);
            const targetYaw = gyro.active ? gyro.yaw : VIEW_YAW + pointer.x * YAW_RANGE;
            const targetPitch = gyro.active ? gyro.pitch : VIEW_PITCH - pointer.y * PITCH_RANGE;
            const yawDelta = targetYaw - yaw;
            const pitchDelta = targetPitch - pitch;
            if (Math.abs(yawDelta) + Math.abs(pitchDelta) > 0.0004) {
                needsRender = true;
            }
            yaw += yawDelta * damp;
            pitch += pitchDelta * damp;
            camera.rotation.y = yaw;
            camera.rotation.x = pitch;

            const atEndNow = progress > endCard.p0 + (endCard.p1 - endCard.p0) * 0.5;
            if (atEndNow !== endActive) {
                endActive = atEndNow;
                setAtEnd(atEndNow);
            }

            if (progress !== lastProgress) {
                const track = progressTrackRef.current;
                const thumb = progressThumbRef.current;
                if (track && thumb) {
                    const travel = track.clientHeight - thumb.offsetHeight;
                    thumb.style.transform = `translateY(${(progress * travel).toFixed(1)}px)`;
                }
                lastProgress = progress;
            }

            container.__frame = frameIndex;
            container.__displayed = texture ? texture.__index : -1;
            container.__yaw = yaw;
            container.__pitch = pitch;
            container.__gyro = gyro.active;
            container.__videoProgress = video.progress();
            previousIndex = frameIndex;

            if (needsRender) {
                renderer.render(scene, camera);
                container.__renders = ++renderCount;
            }
        };
        tick();

        return () => {
            cancelAnimationFrame(raf);
            if (lenis) {
                lenis.destroy();
            }
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('deviceorientation', onDeviceOrientation);
            window.history.scrollRestoration = previousScrollRestoration;
            enableMotionRef.current = null;
            resizeObserver.disconnect();
            video.dispose();
            stills.dispose();
            placeholderTexture.dispose();
            if (renderer.domElement.parentNode === mount) {
                mount.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [mapping]);

    const onClickLink = (event, link) => {
        if (link.startsWith('mailto:')) {
            return;
        }
        const url = new URL(link, window.location.origin);
        if (url.origin !== window.location.origin) {
            window.location.assign(url.href);
            return;
        }
        event.preventDefault();
        navigate(`${url.pathname}${url.search}${url.hash}`);
    };

    return (
        <div ref={containerRef} className="aboutScene" style={{height: `${SCROLL_LENGTH}vh`}}>
            <div className="aboutScene-sticky">
                <div ref={mountRef} className="aboutScene-canvas"/>
                <div className={'aboutScene-end' + (atEnd ? ' is-active' : '')}>
                    <Flex className="aboutScene-projects" wrap gap={20} justify="center">
                        {HIGHLIGHTED_PROJECTS.map((project, index) => (
                            <Card
                                key={index}
                                hoverable
                                className="aboutScene-project"
                                style={{transitionDelay: `${index * 90}ms`}}
                                title={project.title}
                                cover={<img className="aboutScene-projectImage" src={project.image} alt={project.title}/>}
                                onClick={(event) => onClickLink(event, project.link)}
                            >
                                <Meta description={project.description}/>
                            </Card>
                        ))}
                    </Flex>
                    <div className="aboutScene-footer">
                        <Flex className="aboutScene-links" wrap gap={12} justify="center">
                            {LINKS.map((link, index) => (
                                <Button
                                    key={index}
                                    className="aboutScene-link"
                                    style={{transitionDelay: `${(HIGHLIGHTED_PROJECTS.length + index) * 90}ms`}}
                                    icon={link.icon}
                                    href={link.link.startsWith('mailto:') ? link.link : undefined}
                                    onClick={(event) => onClickLink(event, link.link)}
                                >
                                    {link.label}
                                </Button>
                            ))}
                        </Flex>
                    </div>
                </div>
                <div ref={progressTrackRef} className="aboutScene-progress" aria-hidden="true">
                    <div ref={progressThumbRef} className="aboutScene-progressThumb"/>
                </div>
                {motionPrompt && !atEnd && (
                    <Button
                        className="aboutScene-motion"
                        icon={<CompassOutlined/>}
                        onClick={() => enableMotionRef.current && enableMotionRef.current()}
                    >
                        Enable 360° Motion
                    </Button>
                )}
                <div className={'aboutScene-loader' + (ready ? ' is-hidden' : '')}>
                    <img className="aboutScene-loaderLogo" src={logo} alt=""/>
                    <Typography className="bigTitle aboutScene-loaderTitle">About</Typography>
                    <Typography ref={loaderTextRef} className="aboutScene-loaderText">Loading 360°</Typography>
                </div>
            </div>
        </div>
    );
};

export default AboutView;
