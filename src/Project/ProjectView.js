import './Project.css';
import {WHEPClient} from "./whep";
import {Button, Typography, Input} from 'antd';
import {useEffect, useState} from "react";
import {useNavigate} from 'react-router-dom';

const ProjectView = ({}) => {
    const [url, setUrl] = useState("http://localhost:8889/proxied/whep");
    let pc = window.pc = new RTCPeerConnection({bundlePolicy: "balanced"});
    let whep = new WHEPClient();
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtaWxsaWNhc3QiOnsidHlwZSI6IlN1YnNjcmliZSIsInNlcnZlcklkIjoidmlld2VyMSIsInN0cmVhbUFjY291bnRJZCI6InRlc3QiLCJzdHJlYW1OYW1lIjoidGVzdCJ9LCJpYXQiOjE2NzY2NDkxOTd9.ZE8Ftz9qiS04zTKBqP1MHZTOh8dvI73FBraleQM9h1A"


    useEffect(() => {
        pc.addTransceiver("video");
    }, [])

    const onSubmitUrl = (e) => {
        whep.stop().then((r) => {
            console.log(r);
            pc = window.pc = new RTCPeerConnection({bundlePolicy: "balanced"});
            pc.addTransceiver("video");
            pc.ontrack = (event) => {
                if (event.track.kind === "video")
                    document.querySelector("video").srcObject = event.streams[0];
            }

            whep = new WHEPClient();
            //Start viewing
            whep.view(pc, url).then(r => console.log(r));
        });
    }

    const changeInput = (e) => {
        setUrl(e.target.value);
    }

    return (
        <div>
            <video id="my-video" className="video-js" controls preload="autoplay">
                <p className="vjs-no-js">
                    To view this video please enable JavaScript, and consider upgrading to a
                    web browser that
                </p>
            </video>
            <Input
                placeholder="URL"
                style={{width: 240, marginTop: 16}}
                onChange={changeInput}
            />
            <Button
                style={{width: 240, marginTop: 16}}
                type="primary"
                onClick={onSubmitUrl}
            >
                Connect
            </Button>
        </div>
    )
}

export default ProjectView;