import './Vision.css';
import {WHEPClient} from "./whep";
import {Button, Switch, Input} from 'antd';
import {useEffect, useRef, useState} from "react";
import {useNavigate} from 'react-router-dom';
import CardboardVRDisplay from "cardboard-vr-display/dist/cardboard-vr-display";
import * as log from 'loglevel';
import * as THREE from "three";
import {VRButton} from "three/addons";
let localStream;
let localPeerConnection;
let sendChannel;
let receiveChannel;
const URL_WEB_SOCKET = 'wss://pynekoyne.com';

const servers = {'iceServers': [
        { urls: "stun:stun.l.google.com:19302" },
        // { urls: "stun:stun1.l.google.com:19302" },
        // { urls: "stun:stun2.l.google.com:19302" },
        // { urls: "stun:stun3.l.google.com:19302" },
        // { urls: "stun:stun4.l.google.com:19302" },
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "2b45f6bf826b8476f55d2a6a",
            credential: "uhNo23Z1ZG/dWtmG",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "2b45f6bf826b8476f55d2a6a",
            credential: "uhNo23Z1ZG/dWtmG",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "2b45f6bf826b8476f55d2a6a",
            credential: "uhNo23Z1ZG/dWtmG",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "2b45f6bf826b8476f55d2a6a",
            credential: "uhNo23Z1ZG/dWtmG",
        },

    ], bundlePolicy: "max-bundle"};
//
// // Get config from URL
// const config = (function () {
//     const config = {};
//     const q = window.location.search.substring(1);
//     if (q === '') {
//         return config;
//     }
//     const params = q.split('&');
//     let param, name, value;
//     for (let i = 0; i < params.length; i++) {
//         param = params[i].split('=');
//         name = param[0];
//         value = param[1];
//
//         // All config values are either boolean or float
//         config[name] = value === 'true' ? true :
//             value === 'false' ? false :
//                 parseFloat(value);
//     }
//     return config;
// })();
//
// console.log('creating CardboardVRDisplay with options', config);
// const vrDisplay = new CardboardVRDisplay(config);
//
// // If loading this inside of an iframe (see iframe.html),
// // force using the `devicemotion` sensor fusion, rather than
// // newer Generic Sensors due to an issue with sensors
// // in iframes in Chrome < m69:
// // https://bugs.chromium.org/p/chromium/issues/detail?id=849501
// // if (window.self !== window.top) {
// //     vrDisplay.poseSensor_.useDeviceMotion();
// // }
//
// navigator.getVRDisplays = function () {
//     return new Promise(function (resolve) {
//         resolve([vrDisplay]);
//     });
// };
//
//
// // Setup three.js WebGL renderer. Note: Antialiasing is a big performance hit.
// // Only enable it if you actually need to.
// const renderer = new THREE.WebGLRenderer({antialias: false});
// renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
//
// // Append the canvas element created by the renderer to document body element.
// document.body.appendChild(renderer.domElement);
//
// // Create a three.js scene.
// const scene = new THREE.Scene();
//
// // Create a three.js camera.
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
//
// // // Create a reticle
// // const reticle = new THREE.Mesh(
// //     new THREE.RingBufferGeometry(0.005, 0.01, 15),
// //     new THREE.MeshBasicMaterial({color: 0xffffff})
// // );
// // reticle.position.z = -0.5;
// // camera.add(reticle);
// // scene.add(camera);
//
// // Apply VR headset positional data to camera.
// // const controls = new THREE.VRControls(camera);
//
// // // Apply VR stereo rendering to renderer.
// // const effect = new VREffect(renderer);
// // effect.setSize(window.innerWidth, window.innerHeight);
//
// // Kick off the render loop.
// vrDisplay.requestAnimationFrame(animate);
//
// // Create 3D objects.
// const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
//
// // Request animation frame loop function
// let lastRender = 0;
//
// function animate(timestamp) {
//     const delta = Math.min(timestamp - lastRender, 500);
//     lastRender = timestamp;
//
//     // Update VR headset position and apply to camera.
//     // controls.update();
//
//     // Render the scene.
//     // effect.render(scene, camera);
//
//     // Keep looping.
//     vrDisplay.requestAnimationFrame(animate);
// }
//
// function onResize() {
//     console.log('Resizing to %s x %s.', window.innerWidth, window.innerHeight);
//     // effect.setSize(window.innerWidth, window.innerHeight);
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
// }
//
// function onVRDisplayPresentChange() {
//     console.log('onVRDisplayPresentChange');
//     onResize();
// }
//
// // Resize the WebGL canvas when we resize and also when we change modes.
// window.addEventListener('resize', onResize);
// window.addEventListener('vrdisplaypresentchange', onVRDisplayPresentChange);
// //
// // // Button click handlers.
// // document.querySelector('button#fullscreen').addEventListener('click', function() {
// //     enterFullscreen(renderer.domElement);
// // });
// // document.querySelector('button#vr').addEventListener('click', function() {
// //     vrDisplay.requestPresent([{source: renderer.domElement}]);
// // });
// // document.querySelector('button#reset').addEventListener('click', function() {
// //     vrDisplay.resetPose();
// // });
//
// function enterFullscreen (el) {
//     if (el.requestFullscreen) {
//         el.requestFullscreen();
//     } else if (el.mozRequestFullScreen) {
//         el.mozRequestFullScreen();
//     } else if (el.webkitRequestFullscreen) {
//         el.webkitRequestFullscreen();
//     } else if (el.msRequestFullscreen) {
//         el.msRequestFullscreen();
//     }
// }

let camera, scene, renderer;

let isUserInteracting = false,
    lon = 0, lat = 0,
    phi = 0, theta = 0,
    onPointerDownPointerX = 0,
    onPointerDownPointerY = 0,
    onPointerDownLon = 0,
    onPointerDownLat = 0;

const distance = 0.5;

function init() {

    const container = document.getElementById( 'container' );
    container.addEventListener( 'click', function () {

        video.play();

    } );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.layers.enable( 1 ); // render left view when no stereo available

    // video

    const video = document.querySelector("video");
    video.play();

    const texture = new THREE.VideoTexture( video );
    texture.colorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x101010 );

    // left

    const geometry1 = new THREE.PlaneGeometry( 5, 5, 40, 40);
    // invert the geometry on the x-axis so that all of the faces point inward
    geometry1.scale( 1, 1, 1 );
    geometry1.rotateY(3.14);
    geometry1.translate(0, 0, 3);

    const uvs1 = geometry1.attributes.uv.array;

    for ( let i = 0; i < uvs1.length; i += 2 ) {

        uvs1[ i ] *= 0.5;

    }

    const material1 = new THREE.MeshBasicMaterial( { map: texture } );

    const mesh1 = new THREE.Mesh( geometry1, material1 );
    mesh1.rotation.y = - Math.PI / 2;
    mesh1.layers.set( 1 ); // display in left eye only
    scene.add( mesh1 );

    // right

    const geometry2 = new THREE.PlaneGeometry( 5, 5, 40, 40 );
    geometry2.scale( 1, 1, 1 );
    geometry2.rotateY(3.14);
    geometry2.translate(0, 0, 3);

    const uvs2 = geometry2.attributes.uv.array;

    for ( let i = 0; i < uvs2.length; i += 2 ) {

        uvs2[ i ] *= 0.5;
        uvs2[ i ] += 0.5;

    }

    const material2 = new THREE.MeshBasicMaterial( { map: texture } );

    const mesh2 = new THREE.Mesh( geometry2, material2 );
    mesh2.rotation.y = - Math.PI / 2;
    mesh2.layers.set( 2 ); // display in right eye only
    scene.add( mesh2 );

    //

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animate );
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType( 'local' );
    container.appendChild( renderer.domElement );

    document.body.appendChild( VRButton.createButton( renderer ) );

    document.addEventListener( 'pointerdown', onPointerDown );
    document.addEventListener( 'pointermove', onPointerMove );
    document.addEventListener( 'pointerup', onPointerUp );

    window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    //
    // lat = Math.max( - 85, Math.min( 85, lat ) );
    // phi = THREE.MathUtils.degToRad( 90 - lat );
    // theta = THREE.MathUtils.degToRad( lon );
    //
    // camera.position.x = distance * Math.sin( phi ) * Math.cos( theta );
    // camera.position.y = distance * Math.cos( phi );
    // camera.position.z = distance * Math.sin( phi ) * Math.sin( theta );

    renderer.render( scene, camera );
}

function onPointerDown( event ) {

    isUserInteracting = true;

    onPointerDownPointerX = event.clientX;
    onPointerDownPointerY = event.clientY;

    onPointerDownLon = lon;
    onPointerDownLat = lat;

}

function onPointerMove( event ) {

    if ( isUserInteracting === true ) {

        lon = ( onPointerDownPointerX - event.clientX ) * 0.1 + onPointerDownLon;
        lat = ( onPointerDownPointerY - event.clientY ) * 0.1 + onPointerDownLat;
    }
}

function onPointerUp() {
    isUserInteracting = false;
}

const Vision = ({}) => {
    const [url, setUrl] = useState("http://localhost:8889/proxied/whep");
    const [channelName, setChannelName] = useState("Hi");
    const [sendOrientation, setSendOrientation] = useState(false);
    const [userId, setUserId] = useState(Math.floor(Math.random() * 1000000));
    const [receiveMessage, setReceiveMessage] = useState('');
    let pc = window.pc = new RTCPeerConnection({bundlePolicy: "balanced"});
    let whep = new WHEPClient();
    let track;
    const ws = useRef(null);
    const ESP32ws = useRef(null);

    useEffect(() => {
        pc.addTransceiver("video");

        const wsClient = new WebSocket(URL_WEB_SOCKET);
        wsClient.onopen = () => {
            console.log('ws opened');
            ws.current = wsClient;
            // setup camera and join channel after ws opened
            join();
        };

        wsClient.onclose = () => console.log('ws closed');
        wsClient.onmessage = (message) => {
            console.log('ws message received', message.data);
            const parsedMessage = JSON.parse(message.data);
            switch (parsedMessage.type) {
                case 'joined': {
                    const body = parsedMessage.body;
                    console.log('users in this channel', body);
                    break;
                }
                case 'offer_sdp_received': {
                    const offer = parsedMessage.body;
                    onAnswer(offer);
                    break;
                }
                case 'answer_sdp_received': {
                    gotRemoteDescription(parsedMessage.body);
                    break;
                }
                case 'quit': {
                    break;
                }
                default:
                    break;
            }
        };
        return () => {
            wsClient.close();
        };
    }, []);

    const sendWsMessage = (type, body) => {
        log.debug('sendWsMessage invoked', type, body);
        ws.current.send(JSON.stringify({
            type,
            body,
        }));
    };


    const join = () => {
        log.debug('join invoked');

        if (!channelName) {
            log.error('channelName is empty');
            alert('channelName is empty');
            return;
        }

        if (!userId) {
            log.error('userId is empty');
            alert('userId is empty');
            return;
        }

        sendWsMessage('join', {
            channelName,
            userId,
        });
    };

    const onSubmitUrl = () => {
        whep.stop().then((r) => {
            console.log(r);
            pc = window.pc = new RTCPeerConnection({bundlePolicy: "balanced"});
            pc.addTransceiver("video");
            pc.ontrack = (event) => {
                if (event.track.kind === "video") {
                    document.querySelector("video").srcObject = event.streams[0];
                }
                track = event;
            }
            whep = new WHEPClient();
            whep.view(pc, "http://localhost:8889/proxied/whep");
        });
    }

    const callOnClick = () => {

        localPeerConnection = new RTCPeerConnection(servers);
        localPeerConnection.onicecandidate = gotLocalIceCandidateOffer;
        localPeerConnection.addTransceiver("video");

        // create data channel before exchange sdp
        createDataChannel();

        if (track != null) {
            localPeerConnection.addTrack(track.track, track.streams[0]);
        }
        localPeerConnection.createOffer().then((offer) => {
            localPeerConnection.setLocalDescription(offer).then((r) => console.log(r));
        });

        // const video = document.querySelector("video")
        //
        // const texture = new THREE.VideoTexture( video );
        // texture.colorSpace = THREE.SRGBColorSpace;
        // const material = new THREE.MeshBasicMaterial( { map: texture } );
        //
        // const mesh = new THREE.Mesh( geometry, material );
        // scene.add( mesh );
    };

    const onAnswer = (offer) => {
        log.debug('onAnswer invoked');

        log.debug('new RTCPeerConnection for local');
        localPeerConnection = new RTCPeerConnection(servers);
        localPeerConnection.addTransceiver("video");

        log.debug('setup gotLocalIceCandidateAnswer');
        localPeerConnection.onicecandidate = gotLocalIceCandidateAnswer;

        log.debug('setup gotRemoteStream');
        localPeerConnection.ontrack = (event) => {
            console.log(event);
            if (event.track.kind === "video") {
                document.querySelector("video").srcObject = event.streams[0];
            }
            init();
        }

        createDataChannel();

        localPeerConnection.setRemoteDescription(offer);
        localPeerConnection.createAnswer().then((answer) => {
            localPeerConnection.setLocalDescription(answer).then((r) => console.log(r));
        });
    };

    const createDataChannel = () => {
        try {
            log.debug('localPeerConnection.createDataChannel invoked');
            sendChannel = localPeerConnection.createDataChannel('sendDataChannel', {reliable: true});
        } catch (error) {
            log.error('localPeerConnection.createDataChannel failed', error);
        }

        log.debug('setup handleSendChannelStateChange');
        sendChannel.onopen = handleSendChannelStateChange;
        sendChannel.onClose = handleSendChannelStateChange;

        log.debug('setup localPeerConnection.ondatachannel');
        localPeerConnection.ondatachannel = gotReceiveChannel;
    };

    const gotRemoteDescription = (answer) => {
        console.log('gotRemoteDescription invoked:', answer);
        localPeerConnection.setRemoteDescription(answer);
    };

    const gotLocalIceCandidateOffer = (event) => {
        console.log('gotLocalIceCandidateOffer invoked', event.candidate, localPeerConnection.localDescription);

        if (!channelName) {
            console.log('channelName is empty');
            alert('channelName is empty');
            return;
        }

        if (!userId) {
            console.log('userId is empty');
            alert('userId is empty');
            return;
        }

        // gathering candidate finished, send complete sdp
        if (!event.candidate) {
            const offer = localPeerConnection.localDescription;
            sendWsMessage('send_offer', {
                channelName,
                userId,
                sdp: offer,
            });
        }
    };

    const gotLocalIceCandidateAnswer = (event) => {
        log.debug('gotLocalIceCandidateAnswer invoked', event.candidate, localPeerConnection.localDescription);

        if (!channelName) {
            log.error('channelName is empty');
            alert('channelName is empty');
            return;
        }

        if (!userId) {
            log.error('userId is empty');
            alert('userId is empty');
            return;
        }

        // gathering candidate finished, send complete sdp
        if (!event.candidate) {
            const answer = localPeerConnection.localDescription;
            sendWsMessage('send_answer', {
                channelName,
                userId,
                sdp: answer,
            });
        }
    };

    ondeviceorientationabsolute = (event) => {
        console.log("hi")
        if (sendOrientation){
            const position = new THREE.Vector3();
            const rotation = new THREE.Quaternion();
            const scale = new THREE.Vector3();

            camera.matrixWorld.decompose(position, rotation, scale)

            const newRot = new THREE.Euler().setFromQuaternion( rotation, "YXZ" );
            sendChannel.send(newRot.x + ";" + newRot.y + ";");
        }
    };

    const gotReceiveChannel = (event) => {
        log.debug('gotReceiveChannel invoked');
        receiveChannel = event.channel;
        receiveChannel.onmessage = handleMessage;
        receiveChannel.onopen = handleReceiveChannelStateChange;
        receiveChannel.onclose = handleReceiveChannelStateChange;
    };

    const handleMessage = (event) => {
        log.debug('handleMessage invoked', event.data);
        setReceiveMessage(Number(parseFloat(event.data.split(";")[0]).toFixed(2)) + " " + Number(parseFloat(event.data.split(";")[1])).toFixed(2));
        ESP32ws.current.send(event.data);
    };

    const handleSendChannelStateChange = () => {
        const readyState = sendChannel.readyState;
        log.debug('handleSendChannelStateChange invoked', readyState);
    };

    const handleReceiveChannelStateChange = () => {
        const readyState = receiveChannel.readyState;
        log.debug('handleReceiveChannelStateChange invoked', readyState);
    };

    const onClickWebsocket = () => {
        const ESPwsClient = new WebSocket(url);
        ESPwsClient.onopen = () => {
            console.log('ws opened');
            ESP32ws.current = ESPwsClient;
        };

        ESPwsClient.onclose = () => console.log('ws closed');
        ESPwsClient.onmessage = (message) => {
            console.log('ws message received', message.data);
            const parsedMessage = JSON.parse(message.data);
            switch (parsedMessage.type) {
                case 'joined': {
                    const body = parsedMessage.body;
                    console.log('users in this channel', body);
                    break;
                }
                case 'offer_sdp_received': {
                    const offer = parsedMessage.body;
                    onAnswer(offer);
                    break;
                }
                case 'answer_sdp_received': {
                    gotRemoteDescription(parsedMessage.body);
                    break;
                }
                case 'quit': {
                    break;
                }
                default:
                    break;
            }
        };
        return () => {
            ESPwsClient.close();
        };
    }

    return (
        <div className="Vision-body">
            <video id="my-video" className="video-js" controls muted preload="autoplay">
                <p className="vjs-no-js">
                    To view this video please enable JavaScript, and consider upgrading to a
                    web browser that
                </p>
            </video>
            <div style={{justifyContent: 'space-evenly'}}>
                <Input
                    placeholder="URL"
                    style={{width: 240, marginTop: 16}}
                    onChange={(event) => {
                        setUrl(event.target.value);
                    }}
                />
                <Button
                    style={{width: 240, marginTop: 16}}
                    type="primary"
                    onClick={onClickWebsocket}
                >
                    ESP32
                </Button>
            </div>
            <div style={{justifyContent: 'space-evenly'}}>
                <Input
                    placeholder="id"
                    style={{width: 240, marginTop: 16}}
                    onChange={(event) => {
                        setChannelName(event.target.value);
                    }}
                />
                <Button
                    style={{width: 240, marginTop: 16}}
                    type="primary"
                    onClick={callOnClick}
                >
                    Recieve Video
                </Button>
            </div>
            <p>{receiveMessage}</p>
            <Switch
                style={{width: 240, marginTop: 16}}
                checked={sendOrientation}
                onClick={() => {
                    console.log("hello");
                    setSendOrientation(!sendOrientation);
                }}>
            </Switch>
            <Button
                style={{width: 240, marginTop: 16}}
                type="primary"
                onClick={onSubmitUrl}
            >
                Camera
            </Button>
            <div id="container"></div>
        </div>
    )
}

export default Vision;