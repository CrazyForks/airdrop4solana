import React, { useState } from 'react';
import { LOTTERY_API_CONFIG } from '../utils/lottery';

const LotteryCompleteModal = ({
    isOpen,
    onClose,
    winners,
    postUrl,
    postTitle,
    onAddLog,
    onResetLottery,
    onShowLotterySettings,
    lotteryResultInfo
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // 调试：输出接收到的参数
    console.log('LotteryCompleteModal props:', { winners, postUrl, postTitle });

    // 生成中奖人信息文本
    const generateWinnersText = () => {
        const winnersList = winners.map(winner => `@${winner.username}`).join(' ');

        return `${winnersList}

抽奖已经完成, 以上用户为中奖者

抽奖模式: 仅抽奖（无需空投）

抽奖数量: ${winners.length} 人

完成时间: ${new Date().toLocaleString('zh-CN')}

`;
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
                        🎉 抽奖完成！
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

                    {/* 抽奖信息 */}
                    <div className="transaction-info">
                        <div className="info-item">
                            <span className="label">抽奖数量:</span>
                            <span className="value">{winners.length} 人</span>
                        </div>
                        <div className="info-item">
                            <span className="label">抽奖模式:</span>
                            <span className="value">仅抽奖（无需空投）</span>
                        </div>
                        <div className="info-item">
                            <span className="label">完成时间:</span>
                            <span className="value">{new Date().toLocaleString('zh-CN')}</span>
                        </div>
                        {postTitle && (
                            <div className="info-item">
                                <span className="label">帖子标题:</span>
                                <span className="value post-title">{postTitle}</span>
                            </div>
                        )}
                        {postUrl && (
                            <div className="info-item">
                                <span className="label">帖子地址:</span>
                                <span className="value post-title">{postUrl}</span>
                            </div>
                        )}
                    </div>

                    {/* 打赏模式下的验证信息 */}
                    {lotteryResultInfo?.isTipLottery && (
                        <div className="verification-info">
                            <h4>验证信息</h4>
                            <div className="verification-links">
                                <div className="verification-item">
                                    <span className="label">验证地址:</span>
                                    <a
                                        href={`${LOTTERY_API_CONFIG.BASE_URL}${LOTTERY_API_CONFIG.ENDPOINTS.VERIFY}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="verification-link"
                                    >
                                        {LOTTERY_API_CONFIG.BASE_URL}{LOTTERY_API_CONFIG.ENDPOINTS.VERIFY}
                                    </a>
                                </div>
                                {lotteryResultInfo.githubCommit && (
                                    <div className="verification-item">
                                        <span className="label">GitHub地址:</span>
                                        <a
                                            href={lotteryResultInfo.githubCommit.repository}
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
                            className="btn btn-warning"
                            onClick={onResetLottery}
                        >
                            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                            重置抽奖
                        </button>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LotteryCompleteModal;
