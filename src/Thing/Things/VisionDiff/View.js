import React, {useEffect, useState} from 'react';
import {Typography} from 'antd';
import './Styles.css';
import Markdown from 'react-markdown'

const View = (data) => {

    function divideData(pageData){
        const dividedPage = pageData.split("![[");
        const processedSections = [];
        console.log("divideData~pageData:" + pageData.toString());
        if (dividedPage.length !== 1) {
            console.log("divideData~dividedPage: " + JSON.stringify(dividedPage));
            processedSections.push(<Markdown>{dividedPage[0]}</Markdown>);
            dividedPage.shift();
            dividedPage.map((section) => {
                const splitSection = section.split("]]");
                console.log("divideData~ splitSection: " + JSON.stringify(splitSection));
                if (splitSection[0].substring(splitSection[0].length - 3) === "mp4") {
                    processedSections.push(<video className="ThingImages"
                                                src={"https://pynekoyne.com/files/blog/files/CameraAsEyeMkI/" + splitSection[0].replaceAll(" ", "_")}/>)
                }
                else{
                    processedSections.push(<img className="ThingImages" alt={splitSection[0]}
                                                src={"https://pynekoyne.com/files/blog/files/CameraAsEyeMkI/" + splitSection[0].replaceAll(" ", "_")}/>)
                }
                processedSections.push(<Markdown>{splitSection[1]}</Markdown>);
            })
        }
        return processedSections;
    }

    return (
        <div>
            <Typography className="medTitle">A Very Very Dumb Camera</Typography>
            {divideData(data).map((item) => (
                <div>{item}</div>
            ))}
        </div>
    )
}

export default View;