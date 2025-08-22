import React, { useState, useCallback, useEffect } from 'react';
import { drawUsers, validateDrawOptions } from '../utils/lottery';
import { batchParseUserInfo } from '../utils/v2ex';

const V2exResultModal = ({ result, onClose, onApplyAddresses, onAddLog, onShowMessage, defaultShowLottery = false }) => {
  const [showLotterySection, setShowLotterySection] = useState(false);
  const [showLotterySettings, setShowLotterySettings] = useState(defaultShowLottery);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectionCount, setSelectionCount] = useState(10);
  const [excludePostAuthor, setExcludePostAuthor] = useState(true);
  const [parsingAddresses, setParsingAddresses] = useState(false);
  const [parsingProgress, setParsingProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [isPostContentExpanded, setIsPostContentExpanded] = useState(false);

  // 根据回复数量动态设置选择数量的默认值
  useEffect(() => {
    if (result?.detailedReplies) {
      // 除以2 向上取整
      const replyCount = result.detailedReplies.length;
      const defaultCount = Math.ceil(replyCount / 10);
      setSelectionCount(defaultCount);
    }
  }, [result?.detailedReplies]);

  // 检查帖子内容是否超过4行
  const isPostContentLong = result?.content && result.content.split('\n').length > 4;

  // 抽奖功能
  const handleRandomSelection = useCallback(() => {
    if (!result?.detailedReplies || result.detailedReplies.length === 0) {
      onShowMessage('没有可用的回复进行抽奖', 'warning');
      return;
    }
    setShowLotterySettings(true);
  }, [result?.detailedReplies, onShowMessage]);

  // 执行抽奖选择
  const executeRandomSelection = useCallback(() => {
    if (!result?.detailedReplies || result.detailedReplies.length === 0) {
      onShowMessage('没有可用的回复进行抽奖', 'warning');
      return;
    }

    try {
      // 获取帖子作者用户名，用于排除
      const postAuthor = result.author;
      const excludeUsers = (postAuthor && excludePostAuthor) ? [postAuthor] : [];

      if (excludePostAuthor && postAuthor) {
        onAddLog(`🎯 抽奖设置：帖子作者 "${postAuthor}" 将被排除`, 'info');
      }

      // 准备用户数据 - 从回复中提取
      let allUsers = result.detailedReplies.map((reply, index) => ({
        userId: reply.userId || `用户${index + 1}`,
        username: reply.userId || `用户${index + 1}`,
        address: reply.solanaAddresses && reply.solanaAddresses.length > 0 ? reply.solanaAddresses[0] : '',
        hasSolanaAddress: !!(reply.solanaAddresses && reply.solanaAddresses.length > 0),
        replyContent: reply.content || '',
        replyTime: reply.replyTime || '',
        floor: reply.floor || index + 1
      }));



      if (allUsers.length === 0) {
        onShowMessage('没有符合条件的用户进行抽奖', 'warning');
        return;
      }

      // 使用抽奖工具类，排除帖子作者
      const selected = drawUsers({
        allUsers: allUsers,
        excludeUsers: excludeUsers,
        count: selectionCount,
        seed: null
      });

      setSelectedUsers(selected);
      setShowLotterySettings(false);

      const authorNote = excludePostAuthor && postAuthor ? `（已排除作者：${postAuthor}）` : '';
      onAddLog(`🎲 抽奖完成！从 ${allUsers.length} 个可用用户中选择了 ${selected.length} 个${authorNote}`, 'success');
      onShowMessage(`抽奖完成！选择了 ${selected.length} 个用户`, 'success');
    } catch (error) {
      console.error('抽奖失败:', error.message);
      onAddLog(`抽奖失败: ${error.message}`, 'error');
      onShowMessage(`抽奖失败: ${error.message}`, 'error');
    }
  }, [result?.detailedReplies, result?.author, selectionCount, excludePostAuthor, onAddLog, onShowMessage]);

  // 解析没有 Solana 地址的用户
  const parseMissingAddresses = useCallback(async () => {
    // 找出没有 Solana 地址的用户
    const usersWithoutAddresses = selectedUsers.filter(user => !user.address || user.address === '');

    if (usersWithoutAddresses.length === 0) {
      onShowMessage('所有用户都有 Solana 地址', 'info');
      return;
    }

    setParsingAddresses(true);
    setParsingProgress({ current: 0, total: usersWithoutAddresses.length, percentage: 0 });

    try {
      onAddLog(`🔍 开始解析 ${usersWithoutAddresses.length} 个用户的 Solana 地址...`, 'info');

      // 提取用户名列表
      const usernames = usersWithoutAddresses.map(user => user.username);

      // 调用批量解析函数
      const parseResult = await batchParseUserInfo(usernames, (progress) => {
        setParsingProgress({
          current: progress.current,
          total: progress.total,
          percentage: progress.percentage
        });

        // 根据状态提供不同的日志信息
        switch (progress.status) {
          case 'start':
            onAddLog(`🚀 ${progress.message}`, 'info');
            break;
          case 'success':
            onAddLog(`✅ ${progress.message}`, 'success');
            // 实时更新抽奖结果中的用户信息
            if (progress.userInfo) {
              setSelectedUsers(prevUsers =>
                prevUsers.map(user => {
                  if (user.username === progress.username) {
                    // 更新用户的Solana地址信息
                    const solanaAddress = progress.userInfo.solanaAddress ||
                      (progress.userInfo.solanaAddresses && progress.userInfo.solanaAddresses.length > 0 ? progress.userInfo.solanaAddresses[0] : '');

                    return {
                      ...user,
                      address: solanaAddress,
                      hasSolanaAddress: !!solanaAddress,
                      bio: progress.userInfo.bio || '',
                      website: progress.userInfo.website || '',
                      tagline: progress.userInfo.tagline || '',
                      parseStatus: 'success'
                    };
                  }
                  return user;
                })
              );
            }
            break;
          case 'retry':
            onAddLog(`🔄 ${progress.message}`, 'warning');
            break;
          case 'error':
            onAddLog(`❌ ${progress.message}`, 'error');
            // 标记解析失败的用户
            setSelectedUsers(prevUsers =>
              prevUsers.map(user => {
                if (user.username === progress.username) {
                  return {
                    ...user,
                    parseStatus: 'failed',
                    parseError: '解析失败'
                  };
                }
                return user;
              })
            );
            break;
          case 'complete':
            onAddLog(`🎉 ${progress.message}`, 'success');
            break;
          default:
            onAddLog(`📊 解析进度: ${progress.percentage}% (${progress.current}/${progress.total})`, 'info');
        }
      });

      if (parseResult.success) {
        // 更新用户数据，为有 Solana 地址的用户赋值
        const updatedUsers = selectedUsers.map(user => {
          if (!user.address || user.address === '') {
            // 查找对应的解析结果
            const parseUser = parseResult.results.find(r => r.username === user.username);
            if (parseUser && parseUser.hasSolanaInfo) {
              // 优先使用 solanaAddress，如果没有则使用第一个 solanaAddresses
              const solanaAddress = parseUser.solanaAddress ||
                (parseUser.solanaAddresses && parseUser.solanaAddresses.length > 0 ? parseUser.solanaAddresses[0] : '');

              if (solanaAddress) {
                onAddLog(`✅ 为用户 ${user.username} 解析到 Solana 地址: ${solanaAddress}`, 'success');
                return { ...user, address: solanaAddress, hasSolanaAddress: true };
              }
            }
          }
          return user;
        });

        setSelectedUsers(updatedUsers);

        const successCount = updatedUsers.filter(user => user.address && user.address !== '').length;
        onAddLog(`🎉 地址解析完成！成功为 ${successCount}/${selectedUsers.length} 个用户找到 Solana 地址`, 'success');
        onShowMessage(`地址解析完成！${successCount} 个用户获得地址`, 'success');
      } else {
        onAddLog(`❌ 地址解析失败: ${parseResult.error}`, 'error');
        onShowMessage(`地址解析失败: ${parseResult.error}`, 'error');
      }
    } catch (error) {
      console.error('解析地址失败:', error);
      onAddLog(`❌ 解析地址失败: ${error.message}`, 'error');
      onShowMessage(`解析地址失败: ${error.message}`, 'error');
    } finally {
      setParsingAddresses(false);
      setParsingProgress({ current: 0, total: 0, percentage: 0 });
    }
  }, [selectedUsers, onAddLog, onShowMessage]);

  // 应用抽奖结果
  const applyLotteryResult = () => {
    if (selectedUsers.length === 0) {
      onShowMessage('没有选中的用户', 'warning');
      return;
    }

    // 过滤掉没有地址的用户
    const usersWithAddresses = selectedUsers.filter(user => user.address && user.address.trim() !== '');

    if (usersWithAddresses.length === 0) {
      onShowMessage('选中的用户都没有有效的 Solana 地址', 'warning');
      return;
    }

    const addressesWithUsers = usersWithAddresses.map(user => ({
      address: user.address,
      username: user.username,
      source: 'v2ex_lottery'
    }));

    onAddLog(`🎯 应用抽奖结果：${addressesWithUsers.length} 个有效地址`, 'info');
    onApplyAddresses(addressesWithUsers);
    onClose();
  };

  // 重置抽奖结果
  const resetLotteryResult = () => {
    setSelectedUsers([]);
    setShowLotterySection(false);
    onAddLog('🔄 抽奖结果已重置', 'info');
  };

  // 检查是否有用户没有 Solana 地址
  const hasUsersWithoutAddresses = selectedUsers.some(user => !user.address || user.address === '');

  // 格式化时间显示
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeStr;
    }
  };

  // 当defaultShowLottery为true时，只在初始化时自动显示抽奖设置
  useEffect(() => {
    if (defaultShowLottery) {
      setShowLotterySettings(true);
    }
  }, [defaultShowLottery]); // 移除showLotterySettings依赖，避免循环触发

  // 在所有 hooks 调用之后进行条件渲染检查
  if (!result) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content v2ex-result-modal ${selectedUsers.length > 0 ? 'has-lottery-result' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <svg className="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {defaultShowLottery ? '抽奖操作' : 'V2EX 帖子解析结果'}
          </h2>
          <button className="modal-close" onClick={() => {
            // 重置抽奖操作标记
            if (result.isLotteryOperation) {
              result.isLotteryOperation = false;
            }
            onClose();
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* 帖子基本信息 */}
          <div className="post-summary">
            <div className="post-header">
              <h3 className="post-title">{result.title}</h3>
              {/* 帖子内容 */}
              {result.content && result.content.trim() && (
                <div className={`post-content ${isPostContentLong && !isPostContentExpanded ? 'post-content-collapsed' : ''}`}>
                  {result.content}
                  {isPostContentLong && (
                    <button
                      className="post-content-toggle"
                      onClick={() => setIsPostContentExpanded(!isPostContentExpanded)}
                    >
                      {isPostContentExpanded ? (
                        <>
                          <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                          收起
                        </>
                      ) : (
                        <>
                          <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                          展开
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              <div className="post-meta">
                <span className="meta-item">
                  <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  作者: {result.author}
                </span>
                <span className="meta-item">
                  <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  回复数: {result.replyCount}
                </span>
                <span className="meta-item">
                  <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                    查看原帖
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* 解析结果统计 */}
          <div className="result-stats">
            <div className="stat-card">
              <div className="stat-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{result.addresses.length}</div>
                <div className="stat-label">回复中的Solana地址</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{result.domains.length}</div>
                <div className="stat-label">回复中的.sol域名</div>
              </div>
            </div>
          </div>

          {/* 两列布局：回复列表和抽奖结果 */}
          <div className="two-column-layout">
            {/* 左列：回复列表 */}
            {result.detailedReplies && result.detailedReplies.length > 0 && (
              <div className="replies-section">
                <h4 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  回复列表 ({result.detailedReplies.length})
                </h4>
                <div className="replies-container">
                  <div className="replies-list">
                    {result.detailedReplies.map((reply, index) => (
                      <div key={index} className="reply-item">
                        <div className="reply-header">
                          <span className="reply-floor">#{reply.floor}</span>
                          <span className="reply-username">@{reply.userId}</span>
                          <span className="reply-time">{formatTime(reply.replyTime)}</span>
                        </div>
                        <div className="reply-content">{reply.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 抽奖结果 */}
            {selectedUsers.length > 0 && (
              <div className="lottery-result">
                <h4 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  抽奖结果 ({selectedUsers.length})
                </h4>



                <div className="selected-users-list">
                  {selectedUsers.map((user, index) => (
                    <div key={index} className={`selected-user-item ${!user.address || user.address === '' ? 'no-address' : ''}`}>
                      <span className="user-index">{index + 1}</span>
                      <span className="user-floor">#{user.floor}</span>
                      <span className="user-info">
                        <span className="user-username">
                          {user.username} {user.replyContent && (
                            <span className="user-reply-content">: {user.replyContent}</span>
                          )}
                        </span>
                        <span className={`user-address ${!user.address || user.address === '' ? 'missing' : ''}`}>
                          {user.address || '暂无地址'}
                        </span>
                      </span>
                      {/* 解析状态显示 */}
                      {user.parseStatus === 'success' && (
                        <span className="address-status found">✅ 已解析</span>
                      )}
                      {user.parseStatus === 'failed' && (
                        <span className="address-status failed">❌ 解析失败</span>
                      )}
                      {(!user.address || user.address === '') && !user.parseStatus && (
                        <span className="address-status missing">需要解析</span>
                      )}
                      {user.address && user.address !== '' && !user.parseStatus && (
                        <span className="address-status found">✓ 已找到</span>
                      )}

                      {/* 解析到的用户信息 */}
                      {user.parseStatus === 'success' && (
                        <div className="parsed-user-info">
                          {user.bio && (
                            <div className="user-bio">
                              <strong>简介:</strong> {user.bio}
                            </div>
                          )}
                          {user.website && (
                            <div className="user-website">
                              <strong>网站:</strong> {user.website}
                            </div>
                          )}
                          {user.tagline && (
                            <div className="user-tagline">
                              <strong>标语:</strong> {user.tagline}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 解析失败信息 */}
                      {user.parseStatus === 'failed' && user.parseError && (
                        <div className="parse-error">
                          <span className="error-text">解析失败: {user.parseError}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 解析进度 - 保留进度显示 */}
                {parsingAddresses && (
                  <div className="parse-progress">
                    <div className="progress-header">
                      <span className="progress-status">正在解析 Solana 地址...</span>
                      <span className="progress-count">{parsingProgress.current}/{parsingProgress.total}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${parsingProgress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {parsingProgress.percentage}% 完成
                    </div>
                  </div>
                )}


              </div>
            )}

            {/* 右列结束 */}
          </div>
          {/* 两列布局结束 */}

          {/* 抽奖设置弹窗 */}
          {showLotterySettings && (
            <div className="lottery-settings-modal">
              <div className="lottery-settings-content">
                <h4 className="section-title">抽奖设置</h4>
                <div className="lottery-options">
                  <div className="option-group-row">
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={excludePostAuthor}
                          onChange={(e) => setExcludePostAuthor(e.target.checked)}
                        />
                        排除帖子作者
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        选择数量:
                        <input
                          type="number"
                          value={selectionCount}
                          onChange={(e) => setSelectionCount(parseInt(e.target.value) || 10)}
                          min="1"
                          max={result.detailedReplies.length}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="lottery-settings-actions">
                    <button className="btn btn-primary" onClick={executeRandomSelection}>
                      开始抽奖
                    </button>
                    <button className="btn btn-outline" onClick={() => {
                      if (defaultShowLottery) {
                        // 如果是从抽奖操作进入的，直接关闭整个弹窗
                        if (result.isLotteryOperation) {
                          result.isLotteryOperation = false;
                        }
                        onClose();
                      } else {
                        // 如果是从详情页进入的，只关闭抽奖设置
                        setShowLotterySettings(false);
                      }
                    }}>
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="action-buttons">
            {/* 如果没有抽奖结果，显示"使用这些地址"按钮 */}
            {selectedUsers.length === 0 && (
              <button className="btn btn-primary" onClick={() => onApplyAddresses(result.addresses)}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c-1 0-2-.5-2-1.5V5c0-1.5 1-2.5 2-2.5s2 1 2 2.5v5.5c0 1-1 1.5-2 1.5z" />
                  <path d="M3 12c1 0 2-.5 2-1.5V5c0-1.5-1-2.5-2-2.5S1 3.5 1 5v5.5c0 1 1 1.5 2 1.5z" />
                </svg>
                使用这些地址
              </button>
            )}

            {/* 抽奖操作按钮 - 只在没有抽奖结果时显示 */}
            {selectedUsers.length === 0 && (
              <button className="btn btn-secondary" onClick={handleRandomSelection}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                抽奖操作
              </button>
            )}

            {/* 如果有抽奖结果，显示所有按钮 */}
            {selectedUsers.length > 0 && (
              <div className="lottery-buttons-group">
                {/* 警告提示 - 放在解析按钮左侧 */}
                {hasUsersWithoutAddresses && (
                  <div className="inline-warning">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-text">
                      {selectedUsers.filter(u => !u.address || u.address === '').length} 个用户没有 Solana 地址, 请先解析没有地址的用户或重新抽奖.
                    </span>
                  </div>
                )}

                {/* 解析地址按钮 */}
                {hasUsersWithoutAddresses && (
                  <button
                    className="btn btn-warning"
                    onClick={parseMissingAddresses}
                    disabled={parsingAddresses}
                  >
                    {parsingAddresses ? (
                      <>
                        <div className="loading-spinner"></div>
                        解析中... ({parsingProgress.percentage}%)
                      </>
                    ) : (
                      <>
                        <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          <path d="M13 8H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2z" />
                        </svg>
                        解析 Solana 地址
                      </>
                    )}
                  </button>
                )}

                {/* 重置抽奖按钮 */}
                <button className="btn btn-warning" onClick={resetLotteryResult}>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  重置抽奖
                </button>

                {/* 使用抽奖用户按钮 - 放在重置抽奖按钮右侧 */}
                <button
                  className="btn btn-primary"
                  onClick={applyLotteryResult}
                  disabled={hasUsersWithoutAddresses}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c-1 0-2-.5-2-1.5V5c0-1.5 1-2.5 2-2.5s2 1 2 2.5v5.5c0 1-1 1.5-2 1.5z" />
                    <path d="M3 12c1 0 2-.5 2-1.5V5c0-1.5-1-2.5-2-2.5S1 3.5 1 5v5.5c0 1 1 1.5 2 1.5z" />
                  </svg>
                  使用抽奖用户
                </button>
              </div>
            )}
            <button className="btn btn-outline" onClick={onClose}>
              关闭
            </button>
          </div>


        </div>
      </div>
    </div>
  );
};

export default V2exResultModal;
