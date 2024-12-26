import React from 'react';
import {useNavigate} from "react-router-dom";
import {Button, Layout, Typography} from 'antd';
import {RollbackOutlined} from '@ant-design/icons';

import './About.css';

const {Sider, Content} = Layout;

const AboutView = () => {
    const navigate = useNavigate();

    const onClickRevert = () => {
        navigate("/");
    }

    return (<div>
        <Layout className="aboutPage">
            <Content>
                <Typography className="bigTitle">About</Typography>
                <Typography>Hello<br/><br/>PyneKoyne is a figment of half-cooked projects and ideas from a historically
                    young man. <br/><br/>
                    I like making dumb projects and talking about them, and this website is one of them. It took 3 years<br/>
                    That number is a little inflated cause I spent around 2.9 years procrastinating this.<br/><br/>
                    This website runs off of an express.js backed, and a React.js + AntD (Waiting for Material 3)
                    front-end.<br/>
                    The back-end originally was supposed to be for a website for MGCI Robotics.<br/><br/>
                    Anyways, I hope you have fun exploring this dumb website
                </Typography>
            </Content>
            <Sider style={{color: "#fff"}} width="50%">
                <Button className="aboutRevert" icon={<RollbackOutlined/>} onClick={onClickRevert}>
                    <Typography>Home</Typography>
                </Button>
            </Sider>
        </Layout>
    </div>)
}

export default AboutView;