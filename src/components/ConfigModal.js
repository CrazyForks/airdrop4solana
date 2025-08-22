import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';

const ConfigModal = ({ isOpen, onClose, currentRpcEndpoint, onSaveConfig }) => {
    const [rpcEndpoint, setRpcEndpoint] = useState(currentRpcEndpoint || 'https://solana-rpc.publicnode.com');
    const [commitment, setCommitment] = useState('confirmed');
    const [isTestingConnection, setIsTestingConnection] = useState(false);

    // 当模态框打开时，同步当前配置
    useEffect(() => {
        if (isOpen) {
            setRpcEndpoint(currentRpcEndpoint || 'https://solana-rpc.publicnode.com');
        }
    }, [isOpen, currentRpcEndpoint]);

    if (!isOpen) return null;

    const handleSave = () => {
        // 保存配置到父组件
        onSaveConfig({ rpcEndpoint, commitment });
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
                        <label className="form-label">预设网络</label>
                        <div className="preset-networks">
                            <button
                                type="button"
                                className={`btn btn-secondary ${rpcEndpoint === 'https://solana-rpc.publicnode.com' ? 'active' : ''}`}
                                onClick={() => setRpcEndpoint('https://solana-rpc.publicnode.com')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                                主网: https://solana-rpc.publicnode.com
                            </button>
                            <button
                                type="button"
                                className={`btn btn-secondary ${rpcEndpoint === 'https://api.devnet.solana.com' ? 'active' : ''}`}
                                onClick={() => setRpcEndpoint('https://api.devnet.solana.com')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                    <path d="M9 12l2 2 4-4" />
                                    <path d="M21 12c-1 0-2-.5-2-1.5V5c0-1.5 1-2.5 2-2.5s2 1 2 2.5v5.5c0 1-1 1.5-2 1.5z" />
                                    <path d="M3 12c1 0 2-.5 2-1.5V5c0-1.5-1-2.5-2-2.5S1 3.5 1 5v5.5c0 1 1 1.5 2 1.5z" />
                                </svg>
                                Dev: https://api.devnet.solana.com
                            </button>
                            <button
                                type="button"
                                className={`btn btn-secondary ${rpcEndpoint === 'https://api.testnet.solana.com' ? 'active' : ''}`}
                                onClick={() => setRpcEndpoint('https://api.testnet.solana.com')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                    <path d="M12 2v6m0 0l4-4m-4 4L8 8m12 4v6m0 0l-4-4m4 4l4-4M6 12v6m0 0L2 16m4 4l4-4" />
                                </svg>
                                Test: https://api.testnet.solana.com
                            </button>
                        </div>
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
                                className={`btn btn-secondary ${isTestingConnection ? 'loading' : ''}`}
                                onClick={async () => {
                                    setIsTestingConnection(true);
                                    try {
                                        const connection = new Connection(rpcEndpoint, 'confirmed');
                                        await connection.getLatestBlockhash();
                                        alert('RPC连接测试成功！');
                                    } catch (err) {
                                        alert(`RPC连接失败: ${err.message}`);
                                    } finally {
                                        setIsTestingConnection(false);
                                    }
                                }}
                                disabled={isTestingConnection}
                                style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
                            >
                                {isTestingConnection ? (
                                    <>
                                        <span className="loading-spinner-small"></span>
                                        测试中...
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                            <path d="M9 12l2 2 4-4" />
                                            <path d="M21 12c-1 0-2-.5-2-1.5V5c0-1.5 1-2.5 2-2.5s2 1 2 2.5v5.5c0 1-1 1.5-2 1.5z" />
                                            <path d="M3 12c1 0 2-.5 2-1.5V5c0-1.5-1-2.5-2-2.5S1 3.5 1 5v5.5c0 1 1 1.5 2 1.5z" />
                                        </svg>
                                        测试连接
                                    </>
                                )}
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
