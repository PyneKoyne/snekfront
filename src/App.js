import logo from './logo.svg';
import eye from './eye.svg';
import './App.css';
import {useEffect, useRef, useState} from "react";
import {useNavigate} from 'react-router-dom';
import {Typography} from "antd";


const App = () => {
    const animationRef = useRef(false);
    const [animation, setAnimation] = useState(false);
    const [hint, setHint] = useState(false);
    const [eyePosX, setEyePosX] = useState(13.77259843);
    const [eyePosY, setEyePosY] = useState(8.75);
    const [spotlightX, setSpotlightX] = useState(window.innerWidth/4);
    const [spotlightY, setSpotlightY] = useState(window.innerHeight/4);
    const [spotlightHeight, setSpotlightHeight] = useState(0);
    const [bgColor, setBgColor] = useState("#000001");
    const navigate = useNavigate();

    // Code which runs on the initial render
    useEffect(() => {
        document.addEventListener('keypress', event => {
            if (event.code === "Space") {
                triggerAnimation();
            }
        })
        document.addEventListener("dblclick", (e) => {
            triggerAnimation()
        });

        setTimeout(() => {
            if (animationRef.current === false) {
                setHint(true);
            }
        }, 1200);
    }, []);

    useEffect(() => {
        animationRef.current = animation;
    }, [animation])

    function triggerAnimation() {
        if (animation === false) {
            setAnimation(true);
            console.log(animation);
            setHint(false);
            const expandSpotlight = setInterval(() => {
                setEyePosX((prev) => (prev - 13.77259843) / 1.2 + 13.77259843)
                setEyePosY((prev) => (prev - 8.75) / 1.2 + 8.75)
                setSpotlightHeight((prev) => {
                    if (prev > 40) {
                        clearInterval(expandSpotlight);
                    } else if (prev > 30) {
                        setBgColor("#ff0000");
                    }
                    return prev + 0.5;
                });
            }, 16);
        }
    }

    function mousePosition(e) {
        if (!animation) {
            if (bgColor==="#000001"){
                setBgColor("#000000")
            }
            let cenX = (2 * e.clientX - window.innerWidth)
            let cenY = (2 * e.clientY - window.innerHeight)
            let absHyp = Math.sqrt(cenX ** 2 + cenY ** 2)

            if (absHyp < 0.375 * window.innerHeight) {
                setEyePosX(23 * cenX / (0.375 * window.innerHeight))
                setEyePosY(23 * cenY / (0.375 * window.innerHeight))
            } else {
                let relX = cenX / window.innerWidth;
                let relY = cenY / window.innerWidth;
                let mouseHyp = Math.sqrt(relX ** 2 + relY ** 2)
                let ratio = ((23 + 2 * mouseHyp) / mouseHyp)

                setEyePosX(eyePosX + ((relX * ratio) - eyePosX)/1.5)
                setEyePosY(eyePosY + ((relY * ratio) - eyePosY)/1.5)
            }
            setSpotlightX((e.clientX - spotlightHeight / 200 * window.innerHeight))
            setSpotlightY((e.clientY - spotlightHeight / 200 * window.innerHeight))
        }
    }

    const onClickAbout = () => {
        navigate('/about');
    }

    const onClickThings = () => {
        navigate('/things');
    }

    const onClickProjects = () => {
        navigate('/projects');
    }

    return (
        <div className="App" onMouseMove={mousePosition}>
            <header style={{backgroundColor: `${bgColor}`, cursor: `${spotlightHeight < 15 ? "none" : "unset"}`}}
                    className="App-header">
                {/*<img style={{*/}
                {/*    left: `${spotlightX}px`,*/}
                {/*    top: `${spotlightY}px`,*/}
                {/*    animationPlayState: `${animation ? "running" : "paused"}`*/}
                {/*}} src={spotlight} className="Spotlight" alt="spotlight"/>*/}
                {(bgColor === "#000000" || bgColor === "#000001") &&
                    <svg className="Spotlight" viewBox={"0 0 " + window.innerWidth + " " + window.innerHeight}
                         xmlns="http://www.w3.org/2000/svg">
                        <circle cx={spotlightX.toString(10)} cy={spotlightY.toString(10)} className="circle"
                                style={{animationPlayState: `${animation ? "running" : "paused"}`}} fill="red"/>
                        {!animation && <circle cx={spotlightX.toString(10)} cy={spotlightY.toString(10)} className="hider"
                                fill="ff0000"></circle>}
                        {!animation && <circle cx={spotlightX.toString(10)} cy={spotlightY.toString(10)} className="glow">
                        </circle>}
                    </svg>

                }
                <img src={logo} className="App-logo" alt="logo"/>
                <div className="Eye-container">
                    <img style={{left: `${eyePosX}%`, top: `${eyePosY}%`}} src={eye} className="Eye" alt="eye"/>
                </div>
                {hint && <Typography className="Hint-text">Double Click or Press Spacebar to Illuminate</Typography>}
            </header>
            <button className="About-button" onClick={onClickAbout}>
                <h1 className="Button-text">
                    About
                </h1>
            </button>
            <button className="Things-button" onClick={onClickThings}>
                <h1 className="Button-text">
                    Things
                </h1>
            </button>
            <button className="Projects-button" onClick={onClickProjects}>
                <h1 className="Button-text">
                    Projects
                </h1>
            </button>
        </div>
    );
}

export default App;
