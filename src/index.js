import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ThingView from './Thing/ThingView';
import ProjectView from './Project/ProjectView';
import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";
import AboutView from "./About/AboutView";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App/>,
    },
    {
        path: "about/*",
        element: <AboutView/>,
    },
    {
        path: "things/*",
        element: <ThingView/>,
    },
    {
        path: "projects/*",
        element: <ProjectView/>,
    },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <RouterProvider router={router} />
  </React.StrictMode>
);
