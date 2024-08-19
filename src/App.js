import logo from './logo.svg';
import eye from './eye.svg';
import './App.css';
import {useEffect, useState} from "react";
import { useNavigate } from 'react-router-dom';


const App = ({}) => {
    const [animation, setAnimation] = useState(false);
    const [eyePosX, setEyePosX] = useState(0);
    const [eyePosY, setEyePosY] = useState(0);
    const [spotlightX, setSpotlightX] = useState(0);
    const [spotlightY, setSpotlightY] = useState(0);
    const [spotlightHeight, setSpotlightHeight] = useState(0);
    const [bgColor, setBgColor] = useState("#000000");
    const navigate = useNavigate();

    // Code which runs on the initial render
    useEffect(() => {
        document.addEventListener('keypress', event => {
            if (event.code === "Space" && animation === false) {
                setAnimation(true);
                const expandSpotlight = setInterval(() => {
                    setEyePosX((prev) => (prev-13.77259843)/1.2 + 13.77259843)
                    setEyePosY((prev) => (prev-8.75)/1.2 + 8.75)
                    setSpotlightHeight((prev) => {
                        if (prev > 40){
                            clearInterval(expandSpotlight);
                        }
                        else if (prev > 30) {
                            setBgColor("#ff0000");
                        }
                        return prev + 0.5;
                    });
                }, 16)
            }
        })

        // let frameId;
        // const frame = time => {
        //     setFrameTime(time)
        //     frameId = requestAnimationFrame(frame)
        // }
        // requestAnimationFrame(frame)
        // return () => cancelAnimationFrame(frameId);
    }, []);

    function mousePosition(e){
        if (!animation) {
            let cenX = (2 * e.clientX - window.innerWidth)
            let cenY = (2 * e.clientY - window.innerHeight)
            let absHyp = Math.sqrt(cenX ** 2 + cenY ** 2)

            if (absHyp < 0.375 * window.innerHeight) {
                setEyePosX(23 * cenX / (0.375 * window.innerHeight))
                setEyePosY(23 * cenY / (0.375 * window.innerHeight))
            }
            else {
                let relX = cenX / window.innerWidth;
                let relY = cenY / window.innerWidth;
                let mouseHyp = Math.sqrt(relX ** 2 + relY ** 2)
                let ratio = ((23 + 2 * mouseHyp) / mouseHyp)

                setEyePosX(relX * ratio)
                setEyePosY(relY * ratio)
            }
            setSpotlightX(e.clientX - spotlightHeight / 200 * window.innerHeight)
            setSpotlightY(e.clientY - spotlightHeight / 200 * window.innerHeight)
        }
    }

    const onClickAbout = (e) => {
        navigate('/about');
    }

    const onClickThings = (e) => {
        navigate('/things');
    }

    const onClickProjects = (e) => {
        navigate('/projects');
    }

    return (
        <div className="App" onMouseMove={mousePosition}>
            <header style={{backgroundColor: `${bgColor}`, cursor: `${bgColor === "#000000" ? "none" : "unset"}`}}
                    className="App-header">
                {/*<img style={{*/}
                {/*    left: `${spotlightX}px`,*/}
                {/*    top: `${spotlightY}px`,*/}
                {/*    animationPlayState: `${animation ? "running" : "paused"}`*/}
                {/*}} src={spotlight} className="Spotlight" alt="spotlight"/>*/}
                { bgColor === "#000000" &&
                <svg className="Spotlight" viewBox={"0 0 " + window.innerWidth + " " + window.innerHeight}
                     xmlns="http://www.w3.org/2000/svg">
                    <circle cx={spotlightX.toString(10)} cy={spotlightY.toString(10)} className="circle"
                            style={{animationPlayState: `${animation ? "running" : "paused"}`}} fill="red"/>
                </svg>
                }

                <img src={logo} className="App-logo" alt="logo"/>
                <div className="Eye-container">
                    <img style={{left: `${eyePosX}%`, top: `${eyePosY}%`}} src={eye} className="Eye" alt="eye"/>
                </div>
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
