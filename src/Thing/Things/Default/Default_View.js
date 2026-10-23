import React, {useEffect, useState} from 'react';
import {Typography} from 'antd';
import './default.css';
import Markdown from 'react-markdown'

export const Default_View = (data, folder) => {
    function divideData(pageData){
        const dividedPage = pageData.split("![[");
        const processedSections = [];
        console.log("divideData~pageData:" + pageData.toString());
        if (dividedPage.length !== 1) {
            console.log("divideData~dividedPage: " + JSON.stringify(dividedPage));
            const intro = dividedPage[0].split("||");
            dividedPage.shift();

            processedSections.push(<Typography className="medTitle">{intro[0]}</Typography>)
            processedSections.push(<Markdown>{intro[1]}</Markdown>);
            dividedPage.map((section) => {
                const splitSection = section.split("]]");
                console.log("divideData~ splitSection: " + JSON.stringify(splitSection));
                if (splitSection[0].substring(splitSection[0].length - 3) === "mp4" || splitSection[0].substring(splitSection[0].length - 4) === "webm") {
                    processedSections.push(
                        <video className="DefaultImages" controls>
                            <source src={"https://pynekoyne.com/files/blog/files/" + folder + "/" + splitSection[0].replaceAll(" ", "_")} type="video/webm"/>
                        </video>)
                }
                else{
                    processedSections.push(<img className="DefaultImages" alt={splitSection[0]}
                                                src={"https://pynekoyne.com/files/blog/files/" + folder + "/" + splitSection[0].replaceAll(" ", "_")}/>)
                }
                processedSections.push(<Markdown>{splitSection[1]}</Markdown>);
            })
        }
        return processedSections;
    }

    return (
        <div>
            {divideData(data).map((item) => (
                <div>{item}</div>
            ))}
        </div>
    )
}

export default Default_View;