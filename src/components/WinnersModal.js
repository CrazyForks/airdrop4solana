import React, { useState } from 'react';

const WinnersModal = ({
    isOpen,
    onClose,
    winners,
    transactionHash,
    allTransactionHashes = [], // 新增：所有批次的交易哈希
    postUrl,
    postTitle,
    onAddLog
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // 调试：输出接收到的参数
    console.log('WinnersModal props:', { winners, transactionHash, postUrl, postTitle });

    // 生成中奖人信息文本
    const generateWinnersText = () => {
        const winnersList = winners.map(winner => `@${winner.username}`).join(' ');
        
        // 处理交易哈希信息
        let txInfo = '';
        if (allTransactionHashes && allTransactionHashes.length > 0) {
            if (allTransactionHashes.length === 1) {
                // 单批次
                const hash = allTransactionHashes[0].hash;
                txInfo = `TX: ${hash}`;
            } else {
                // 多批次
                txInfo = '交易哈希:\n' + allTransactionHashes.map(batch => 
                    `第${batch.batch}批次: ${batch.hash}`
                ).join('\n');
            }
        } else if (transactionHash) {
            // 兼容旧版本
            txInfo = `TX: ${transactionHash}`;
        } else {
            txInfo = '交易哈希获取中...';
        }

        // 生成查询链接
        let explorerLinks = '';
        if (allTransactionHashes && allTransactionHashes.length > 0) {
            if (allTransactionHashes.length === 1) {
                // 单批次
                explorerLinks = `查询链接: [https://explorer.solana.com/tx/${allTransactionHashes[0].hash}](https://explorer.solana.com/tx/${allTransactionHashes[0].hash})`;
            } else {
                // 多批次
                explorerLinks = '查询链接:\n' + allTransactionHashes.map(batch => 
                    `第${batch.batch}批次: [https://explorer.solana.com/tx/${batch.hash}](https://explorer.solana.com/tx/${batch.hash})`
                ).join('\n');
            }
        } else if (transactionHash) {
            // 兼容旧版本
            explorerLinks = `查询链接: [https://explorer.solana.com/tx/${transactionHash}](https://explorer.solana.com/tx/${transactionHash})`;
        } else {
            explorerLinks = '查询链接: 请稍后查看Solana Explorer';
        }

        return `${winnersList}

空投已经发放完毕

代币: Solana

${txInfo}

${explorerLinks}`;
    };

    // 复制到剪贴板
    const copyToClipboard = async () => {
        const text = generateWinnersText();

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            onAddLog('中奖人信息已复制到剪贴板', 'success');

            // 跳转到帖子回复地址
            if (postUrl) {
                // 从帖子URL中提取帖子ID
                const topicIdMatch = postUrl.match(/\/t\/(\d+)/);
                if (topicIdMatch) {
                    const topicId = topicIdMatch[1];
                    const replyUrl = `https://www.v2ex.com/append/topic/${topicId}`;
                    window.open(replyUrl, '_blank', 'noopener,noreferrer');
                    onAddLog(`已跳转到帖子回复页: ${topicId}`, 'info');
                } else {
                    // 如果无法提取ID，则跳转到原始地址
                    window.open(postUrl, '_blank', 'noopener,noreferrer');
                    onAddLog(`已跳转到帖子: ${postTitle}`, 'info');
                }
            }

            // 3秒后重置复制状态
            setTimeout(() => setCopied(false), 3000);
        } catch (error) {
            onAddLog('复制失败，请手动复制', 'error');
            console.error('复制失败:', error);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content winners-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <svg className="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                        🎉 空投完成！
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    {/* 成功图标 */}
                    <div className="success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22,4 12,14.01 9,11.01" />
                        </svg>
                    </div>

                    {/* 中奖人信息 */}
                    <div className="winners-info">
                        <h3>中奖用户</h3>
                        <div className="winners-list">
                            {winners.map((winner, index) => (
                                <span key={index} className="winner-tag">
                                    @{winner.username}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 交易信息 */}
                    <div className="transaction-info">
                        {allTransactionHashes && allTransactionHashes.length > 0 ? (
                            // 多批次交易信息
                            <>
                                <div className="info-item">
                                    <span className="label">交易批次:</span>
                                    <span className="value">{allTransactionHashes.length} 个批次</span>
                                </div>
                                {allTransactionHashes.map((batch, index) => (
                                    <div key={index} className="info-item batch-info">
                                        <span className="label">第{batch.batch}批次:</span>
                                        <div className="batch-details">
                                            <span className="value tx-hash">{batch.hash}</span>
                                            <span className="batch-address-count">({batch.addressCount}个地址)</span>
                                            <a
                                                href={`https://explorer.solana.com/tx/${batch.hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="explorer-link"
                                            >
                                                查看
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            // 单批次交易信息（兼容旧版本）
                            <>
                                <div className="info-item">
                                    <span className="label">交易哈希:</span>
                                    <span className="value tx-hash">{transactionHash || '获取中...'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">查询链接:</span>
                                    {transactionHash ? (
                                        <a
                                            href={`https://explorer.solana.com/tx/${transactionHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="explorer-link"
                                        >
                                            Solana Explorer
                                        </a>
                                    ) : (
                                        <span className="value">请稍后查看</span>
                                    )}
                                </div>
                            </>
                        )}
                        {postTitle && (
                            <div className="info-item">
                                <span className="label">帖子原地址:</span>
                                <span className="value post-title">{postUrl ? postUrl : '未知'}</span>
                            </div>
                        )}
                    </div>

                    {/* 复制预览 */}
                    <div className="copy-preview">
                        <h4>复制内容预览 -- 注意: 请使用Markdown格式发布 </h4>
                        <div className="preview-content">
                            <pre>{generateWinnersText()}</pre>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <div className="action-buttons">
                        <button
                            className={`btn btn-primary ${copied ? 'success' : ''}`}
                            onClick={copyToClipboard}
                        >
                            {copied ? (
                                <>
                                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20,6 9,17 4,12" />
                                    </svg>
                                    已复制并跳转
                                </>
                            ) : (
                                <>
                                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    复制并跳转到追加回复页
                                </>
                            )}
                        </button>
                        <button className="btn btn-outline" onClick={onClose}>
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WinnersModal;
