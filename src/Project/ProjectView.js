import './Project.css';
import {WHEPClient} from "./whep";
import {Button, Typography, Input} from 'antd';
import {useEffect, useRef, useState} from "react";
import {useNavigate} from 'react-router-dom';
import * as log from 'loglevel';
let localStream;
let localPeerConnection;
let sendChannel;
let receiveChannel;
const URL_WEB_SOCKET = 'wss://pynekoyne.com';

const servers = {'iceServers': [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        // {
        //     urls: "stun:stun.relay.metered.ca:80",
        // },
        // {
        //     urls: "turn:global.relay.metered.ca:80",
        //     username: "2b45f6bf826b8476f55d2a6a",
        //     credential: "uhNo23Z1ZG/dWtmG",
        // },
        // {
        //     urls: "turn:global.relay.metered.ca:80?transport=tcp",
        //     username: "2b45f6bf826b8476f55d2a6a",
        //     credential: "uhNo23Z1ZG/dWtmG",
        // },
        // {
        //     urls: "turn:global.relay.metered.ca:443",
        //     username: "2b45f6bf826b8476f55d2a6a",
        //     credential: "uhNo23Z1ZG/dWtmG",
        // },
        // {
        //     urls: "turns:global.relay.metered.ca:443?transport=tcp",
        //     username: "2b45f6bf826b8476f55d2a6a",
        //     credential: "uhNo23Z1ZG/dWtmG",
        // },

    ], bundlePolicy: "max-bundle"};

const ProjectView = ({}) => {
    const [url, setUrl] = useState("http://localhost:8889/proxied/whep");
    const [channelName, setChannelName] = useState("Hi");
    const [userId, setUserId] = useState(Math.floor(Math.random() * 1000000));
    let pc = window.pc = new RTCPeerConnection({bundlePolicy: "balanced"});
    let whep = new WHEPClient();
    let track;
    const ws = useRef(null);

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
                if (event.track.kind === "video")
                    // document.querySelector("video").srcObject = event.streams[0];
                track = event;
            }
            whep = new WHEPClient();
            whep.view(pc, url);
        });
    }

    const callOnClick = () => {

        localPeerConnection = new RTCPeerConnection(servers);
        localPeerConnection.onicecandidate = gotLocalIceCandidateOffer;
        localPeerConnection.addTransceiver("video");

        // create data channel before exchange sdp
        createDataChannel();
        // if (document.querySelector("video").srcObject != null) {
        //     document.querySelector("video").srcObject.getTracks().forEach(track => localPeerConnection.addTrack(track));
        //     console.log(document.querySelector("video").srcObject.getTracks());
        // }
        localPeerConnection.addTrack(track.track, track.streams[0]);
        localPeerConnection.createOffer().then(gotLocalDescription);
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
            document.querySelector("video").srcObject = event.streams[0];
        }

        createDataChannel();

        localPeerConnection.setRemoteDescription(offer);
        localPeerConnection.createAnswer().then(gotAnswerDescription);
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

    const gotLocalDescription = (offer) => {
        console.log('gotLocalDescription invoked:', offer);
        localPeerConnection.setLocalDescription(offer);
    };

    const gotAnswerDescription = (answer) => {
        console.log('gotAnswerDescription invoked:', answer);
        localPeerConnection.setLocalDescription(answer);
    };

    const gotRemoteDescription = (answer) => {
        console.log('gotRemoteDescription invoked:', answer);
        localPeerConnection.setRemoteDescription(answer);
    };

    const gotRemoteStream = (event) => {
        console.log('gotRemoteStream invoked');
        document.querySelector("video").srcObject = event.stream;
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

    const gotReceiveChannel = (event) => {
        log.debug('gotReceiveChannel invoked');
        receiveChannel = event.channel;
        receiveChannel.onmessage = handleMessage;
        receiveChannel.onopen = handleReceiveChannelStateChange;
        receiveChannel.onclose = handleReceiveChannelStateChange;
    };

    const handleMessage = (event) => {
        log.debug('handleMessage invoked', event.data);
    };

    const handleSendChannelStateChange = () => {
        const readyState = sendChannel.readyState;
        log.debug('handleSendChannelStateChange invoked', readyState);
    };

    const handleReceiveChannelStateChange = () => {
        const readyState = receiveChannel.readyState;
        log.debug('handleReceiveChannelStateChange invoked', readyState);
    };

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
                    onClick={onSubmitUrl}
                >
                    Connect
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
                    Connect
                </Button>
            </div>
        </div>
    )
}

export default ProjectView;