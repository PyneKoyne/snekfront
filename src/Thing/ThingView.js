import React, {useEffect, useState} from 'react';
    import {Route, Routes, useLocation, useNavigate} from "react-router-dom";
import {Button, Card, Col, Flex, Layout, Typography} from 'antd';
import {RollbackOutlined} from '@ant-design/icons';
import './Thing.css';
import logo from '../sneykeye.png';
import * as things from './things';
import Meta from "antd/es/card/Meta";

const {Footer, Header, Content} = Layout;

const blogUrl = "https://pynekoyne.com/thing"

const ThingView = () => {
    const [items, setItems] = useState([]);
    const [data, setData] = useState("");
    const [blog, setBlog] = useState("");
    const navigate = useNavigate();
    const location = useLocation();
    const [path, setPath] = useState(["/"]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const tempPath = ["/"];
        location.pathname.split("/").forEach((element) => {
            if (element !== "") {
                tempPath.push(tempPath[tempPath.length - 1] + element + "/");
            }
        });
        tempPath.pop();
        console.log(tempPath);
        setPath(tempPath);
    }, [location.pathname]);

    useEffect(() => {
        fetchPageData(blog);
    }, [blog])

    const generatePage = (fileName) => {
        if (blog !== fileName) {
            setBlog(fileName);
        }
        const item = () => {
            try {
                return (things[fileName](data))
            } catch (e) {
                console.log(e);
                return (<div>
                        <Typography>Nothing Found Here</Typography>
                    </div>)
            }
        };
        return (<Route path={"/" + fileName} element={item()}/>)
    }

    const navigateThing = (fileName) => {
        navigate("/things/" + fileName);
    }

    // generates thumbnails on the home page
    const generateIcon = (fileName, metaData) => {
        return (<Card
                hoverable
                title={metaData.fileName}
                cover={metaData.thumbnail ? <img className="images" alt={metaData.fileName} src={metaData.thumbnail}/> :
                    <img className="images" alt={metaData.fileName} src={logo}/>}
                onClick={() => navigateThing(fileName)}
            >
                <Meta description={metaData.description}/>
            </Card>)
    }

    const fetchData = () => {
        const pageData = fetch(blogUrl + "/grabAll");
        pageData.then((data => {
            data.json().then((items) => {
                console.log(items)
                setItems(JSON.parse(items));
            });
        }))
    }

    const fetchPageData = (loc) => {
        const pageData = fetch(blogUrl + "/grab/" + loc);
        pageData.then((data => {
            data.json().then((items) => {
                console.log("fetchPageData~JSON:" + JSON.stringify((items)));
                if (items != null) {
                    const rawData = JSON.parse(items);
                    if (rawData.length !== 0) {
                        console.log(rawData[0]["content"])
                        setData(rawData[0]["content"]);
                    }
                }
            });
        }))
    }

    const mainPage = () => {
        return (<div>
            <Flex wrap gap={20}>
                {items.map(({fileName, metaData}, index) => (<Col
                        key={index}
                        xs={{flex: '95%'}}
                        sm={{flex: '45%'}}
                        md={{flex: '30%'}}
                        lg={{flex: '19%'}}
                        xl={{flex: '16%'}}
                    >
                        {generateIcon(fileName, metaData)}
                    </Col>))}
            </Flex>
        </div>)
    }

    const errorPage = () => {
        return (<div>
            <Typography>Nothing Found Here!</Typography>
        </div>)
    }

    const onClickRevert = (pathItem) => {
        console.log("Navigating to: " + pathItem);
        navigate(pathItem);
    }

    return (<div>
        <Layout className="thingPage">
            <Typography className="bigTitle">Things</Typography>
            <Content>
                <Routes>
                    <Route path="/" element={mainPage()}/>
                    {items.map(({fileName}) => (generatePage(fileName)))}
                    <Route path="/*" element={errorPage()}/>
                </Routes>
            </Content>
            <Footer>
                <Flex className="thingFooter" justify="center" gap="middle" horizontal>
                    {path.map((pathItem) => (
                        <Button className="revert" icon={<RollbackOutlined/>} onClick={() => onClickRevert(pathItem)}>
                            {pathItem}
                        </Button>))}
                </Flex>
            </Footer>
        </Layout>
    </div>)
}

export default ThingView;