import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';

const ConfigModal = ({ isOpen, onClose, currentRpcEndpoint, onSaveConfig }) => {
    const [network, setNetwork] = useState('mainnet-beta');
    const [rpcEndpoint, setRpcEndpoint] = useState(currentRpcEndpoint || 'https://api.mainnet-beta.solana.com');
    const [commitment, setCommitment] = useState('confirmed');

    // 当模态框打开时，同步当前配置
    useEffect(() => {
        if (isOpen) {
            setRpcEndpoint(currentRpcEndpoint || 'https://api.mainnet-beta.solana.com');
        }
    }, [isOpen, currentRpcEndpoint]);

    if (!isOpen) return null;

    const handleSave = () => {
        // 保存配置到父组件
        onSaveConfig({ network, rpcEndpoint, commitment });
        onClose();
    };

    return (
        <div className="config-modal-overlay" onClick={onClose}>
            <div className="config-modal" onClick={(e) => e.stopPropagation()}>
                <div className="config-modal-header">
                    <h3>网络配置</h3>
                    <button className="close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                <div className="config-modal-content">
                    <div className="form-group">
                        <label className="form-label">网络选择</label>
                        <select
                            className="form-control"
                            value={network}
                            onChange={(e) => {
                                const selectedNetwork = e.target.value;
                                setNetwork(selectedNetwork);
                                
                                // 根据网络选择自动设置RPC端点
                                const endpoints = {
                                    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
                                    'testnet': 'https://api.testnet.solana.com',
                                    'devnet': 'https://api.devnet.solana.com',
                                    'localnet': 'http://127.0.0.1:8899'
                                };
                                setRpcEndpoint(endpoints[selectedNetwork] || endpoints['mainnet-beta']);
                            }}
                        >
                            <option value="mainnet-beta">主网 (Mainnet Beta)</option>
                            <option value="testnet">测试网 (Testnet)</option>
                            <option value="devnet">开发网 (Devnet)</option>
                            <option value="localnet">本地网 (Localnet)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">RPC 端点</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <input
                                type="text"
                                className="form-control"
                                value={rpcEndpoint}
                                onChange={(e) => setRpcEndpoint(e.target.value)}
                                placeholder="输入自定义RPC端点"
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    const connection = new Connection(rpcEndpoint, 'confirmed');
                                    connection.getLatestBlockhash()
                                        .then(() => alert('RPC连接测试成功！'))
                                        .catch(err => alert(`RPC连接失败: ${err.message}`));
                                }}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                测试连接
                            </button>
                        </div>
                        <small className="help-text">
                            默认端点会根据网络选择自动设置
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">确认级别</label>
                        <select
                            className="form-control"
                            value={commitment}
                            onChange={(e) => setCommitment(e.target.value)}
                        >
                            <option value="processed">已处理 (Processed)</option>
                            <option value="confirmed">已确认 (Confirmed)</option>
                            <option value="finalized">已最终化 (Finalized)</option>
                        </select>
                        <small className="help-text">
                            选择交易确认的级别，级别越高越安全但速度越慢
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">预设端点</label>
                        <div className="preset-endpoints">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setRpcEndpoint('https://api.mainnet-beta.solana.com')}
                            >
                                官方主网
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setRpcEndpoint('https://solana-api.projectserum.com')}
                            >
                                Project Serum
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setRpcEndpoint('https://rpc.ankr.com/solana')}
                            >
                                Ankr
                            </button>
                        </div>
                    </div>
                </div>

                <div className="config-modal-footer">
                    <button className="btn btn-primary" onClick={handleSave}>
                        保存配置
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigModal;
