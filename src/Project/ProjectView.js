import React from 'react';
import {useNavigate} from "react-router-dom";
import {Button, Layout, Typography} from 'antd';
import {RollbackOutlined} from '@ant-design/icons';

import './Project.css';

const {Footer, Content} = Layout;

const ProjectView = () => {
    const navigate = useNavigate();

    const onClickRevert = () => {
        navigate("/");
    }

    return (<div>
        <Layout className="aboutPage">
            <Content>
                <Typography className="bigTitle">Projects</Typography>
                <Typography className="medTitle">In Construction</Typography>
            </Content>
            <Footer>
                <Button className="aboutRevert" icon={<RollbackOutlined/>} onClick={onClickRevert}>
                    <Typography>Home</Typography>
                </Button>
            </Footer>
        </Layout>
    </div>)
}

export default ProjectView;