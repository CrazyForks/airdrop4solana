import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 添加Buffer polyfill以支持浏览器环境
import { Buffer } from 'buffer';
window.Buffer = Buffer;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);
