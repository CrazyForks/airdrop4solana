import React, { useState } from 'react';
import { LOTTERY_API_CONFIG } from '../utils/lottery';
const WinnersModal = ({
    isOpen,
    onClose,
    winners,
    transactionHash,
    allTransactionHashes = [], // 新增：所有批次的交易哈希
    postUrl,
    postTitle,
    onAddLog,
    tokenType = 'solana', // 新增：代币类型参数
    lotteryResultInfo = null // 新增：抽奖结果信息（用于打赏模式）
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // 调试：输出接收到的参数
    console.log('WinnersModal props:', { winners, transactionHash, postUrl, postTitle, tokenType });

    // 获取代币显示名称
    const getTokenDisplayName = () => {
        switch (tokenType) {
            case 'solana':
                return 'Solana (SOL)';
            case 'v2ex':
                return 'V2EX 代币';
            default:
                return '未知代币';
        }
    };

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
                explorerLinks = `查询链接: [${allTransactionHashes[0].hash}](https://explorer.solana.com/tx/${allTransactionHashes[0].hash})`;
            } else {
                // 多批次
                explorerLinks = '查询链接:\n' + allTransactionHashes.map(batch =>
                    `第${batch.batch}批次: [${batch.hash}](https://explorer.solana.com/tx/${batch.hash})`
                ).join('\n');
            }
        } else {
            explorerLinks = '查询链接: 请稍后查看Solana Explorer';
        }

        // 处理验证地址信息和github地址
        let verificationInfo = '';
        let githubInfo = '';
        if (lotteryResultInfo && lotteryResultInfo.isTipLottery) {
            verificationInfo = `验证地址: [${LOTTERY_API_CONFIG.BASE_URL}verify](${LOTTERY_API_CONFIG.BASE_URL}verify)`;
            githubInfo = `GitHub元文件地址: [${lotteryResultInfo.githubCommit.repository}](${lotteryResultInfo.githubCommit.fileUrl})`;
        }

        // 构建最终文本，避免多余的空白行
        let finalText = `${winnersList}

空投已经发放完毕

代币: ${getTokenDisplayName()}

${txInfo}

${explorerLinks}`;

        // 只有在有验证信息时才添加
        if (verificationInfo) {
            finalText += `\n\n${verificationInfo}`;
        }
        if (githubInfo) {
            finalText += `\n\n${githubInfo}`;
        }

        return finalText;
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

                <div className="modal-body scrollable">
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

                    {/* 交易信息和复制预览并列显示 */}
                    <div className="info-preview-row">
                        {/* 交易信息 */}
                        <div className="transaction-info" title="显示所有交易批次的详细信息，包括交易哈希和地址数量">
                            <h4 className="section-title">
                                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                                交易批次信息
                                <span className="status-badge success">已完成</span>
                            </h4>
                            <div className="progress-indicator">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: '100%' }}></div>
                                </div>
                                <span className="progress-text">处理完成</span>
                            </div>
                            <div className="stats-summary">
                                <div className="stat-item">
                                    <span className="stat-label">总批次:</span>
                                    <span className="stat-value">{allTransactionHashes ? allTransactionHashes.length : 1}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">总地址:</span>
                                    <span className="stat-value">{allTransactionHashes ? allTransactionHashes.reduce((sum, batch) => sum + (batch.addressCount || 0), 0) : winners.length}</span>
                                </div>
                            </div>
                            <div className="action-buttons-mini">
                                <button
                                    className="btn-mini btn-outline"
                                    onClick={() => {
                                        const text = allTransactionHashes ?
                                            allTransactionHashes.map(batch =>
                                                `第${batch.batch}批次: ${batch.hash}`
                                            ).join('\n') :
                                            transactionHash || '无交易哈希';
                                        navigator.clipboard.writeText(text);
                                        onAddLog('交易哈希已复制到剪贴板', 'success');
                                    }}
                                    title="复制所有交易哈希"
                                >
                                    <svg className="btn-icon-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    复制哈希
                                </button>
                            </div>
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
                        <div className="copy-preview" title="预览将要复制到剪贴板的内容，支持Markdown格式">
                            <h4 className="section-title">
                                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                复制内容预览
                                <span className="status-badge info">可复制</span>
                            </h4>
                            <p className="preview-note">注意: 请使用Markdown格式发布</p>
                            <div className="help-tip">
                                <svg className="help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <span>点击下方按钮可一键复制并跳转到回复页面</span>
                            </div>
                            <div className="preview-content">
                                <pre>{generateWinnersText()}</pre>
                            </div>
                            <div className="error-tip">
                                <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>如果复制失败，请手动选择文本复制</span>
                            </div>
                        </div>
                    </div>

                    {/* 打赏模式下的验证信息 */}
                    {lotteryResultInfo && lotteryResultInfo.isTipLottery && (
                        <div className="verification-info">
                            <h4>验证信息</h4>
                            <div className="verification-links">
                                <div className="verification-item">
                                    <span className="label">验证地址:</span>
                                    <a
                                        href={`${LOTTERY_API_CONFIG.BASE_URL}/verify`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="verification-link"
                                    >
                                        {`${LOTTERY_API_CONFIG.BASE_URL}/verify`}
                                    </a>
                                </div>
                                {lotteryResultInfo.githubCommit && (
                                    <div className="verification-item">
                                        <span className="label">GitHub地址:</span>
                                        <a
                                            href={lotteryResultInfo.githubCommit.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="verification-link"
                                        >
                                            {lotteryResultInfo.githubCommit.repository}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
