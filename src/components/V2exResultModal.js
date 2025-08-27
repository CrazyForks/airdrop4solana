import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { drawUsers, executeLotteryViaAPI, checkLotteryAPIStatus } from '../utils/lottery';
import { batchParseUserInfo } from '../utils/v2ex';
import TipModal from './TipModal';
import LotteryCompleteModal from './LotteryCompleteModal';
import { LOTTERY_API_CONFIG } from '../utils/lottery';

const V2exResultModal = ({ result, onClose, onApplyAddresses, onAddLog, onShowMessage, defaultShowLottery = false, userWallet, rpcEndpoint, connectWallet, onLotteryComplete }) => {
  const [showLotterySettings, setShowLotterySettings] = useState(defaultShowLottery);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectionCount, setSelectionCount] = useState(10);
  const [excludePostAuthor, setExcludePostAuthor] = useState(true);
  const [needAirdrop, setNeedAirdrop] = useState(true); // 新增：是否需要空投
  const [showLotteryComplete, setShowLotteryComplete] = useState(false); // 新增：显示抽奖完成界面
  const [showLotteryCompleteModal, setShowLotteryCompleteModal] = useState(false); // 新增：显示抽奖完成模态框
  const [parsingAddresses, setParsingAddresses] = useState(false);
  const [parsingProgress, setParsingProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [isPostContentExpanded, setIsPostContentExpanded] = useState(false);

  // 打赏相关状态
  const [showTipModal, setShowTipModal] = useState(false);
  const [lotterySeed, setLotterySeed] = useState(null);
  const [lotteryResultInfo, setLotteryResultInfo] = useState(null);

  // 新增：处理没有地址用户的选项模态框
  const [showAddressOptionsModal, setShowAddressOptionsModal] = useState(false);
  const [usersWithoutAddresses, setUsersWithoutAddresses] = useState([]);

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

  // 抽奖功能 - 先显示打赏菜单，与首页保持一致
  const handleRandomSelection = useCallback(() => {
    if (!result?.detailedReplies || result.detailedReplies.length === 0) {
      onShowMessage('没有可用的回复进行抽奖', 'warning');
      return;
    }

    // 先显示打赏菜单，与首页逻辑保持一致
    setShowTipModal(true);
  }, [result?.detailedReplies, onShowMessage]);

  // 处理打赏完成
  const handleTipComplete = useCallback((seed, tipType) => {
    setLotterySeed(seed);
    setShowTipModal(false);

    // 记录随机种子信息
    onAddLog(`随机种子: ${seed}`, 'info');

    // 显示抽奖设置
    setShowLotterySettings(true);
  }, [onAddLog]); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理抽奖完成模态框
  const handleLotteryCompleteModal = useCallback(() => {
    setShowLotteryCompleteModal(true);
  }, []);

  // 显示抽奖设置
  const showLotterySettingsModal = useCallback(() => {
    setShowLotteryComplete(false);
    setShowLotteryCompleteModal(false);
    setShowLotterySettings(true);
  }, []);

  // 执行抽奖选择
  const executeRandomSelection = useCallback(async () => {
    if (!result?.detailedReplies || result.detailedReplies.length === 0) {
      onShowMessage('没有可用的回复进行抽奖', 'warning');
      return;
    }

    // 检查是否已经完成打赏流程（有随机种子）
    if (!lotterySeed) {
      // 重新显示打赏界面
      setShowTipModal(true);
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

      // 判断是否使用接口抽奖（打赏后的抽奖）
      const isTipLottery = lotterySeed && lotterySeed.length > 20; // 交易哈希通常很长

      if (isTipLottery) {
        // 打赏后的抽奖：使用接口请求
        onAddLog(`🎲 检测到打赏抽奖，使用接口请求执行抽奖...`, 'info');
        onShowMessage('正在通过接口执行抽奖...', 'info');

        // 检查接口状态
        const apiStatus = await checkLotteryAPIStatus();
        if (!apiStatus.success) {
          onAddLog(`⚠️ 抽奖接口不可用，回退到本地抽奖: ${apiStatus.error}`, 'warning');
          onShowMessage('抽奖接口不可用，使用本地抽奖', 'warning');
          // 回退到本地抽奖
          const selected = drawUsers({
            allUsers: allUsers,
            excludeUsers: excludeUsers,
            count: selectionCount,
            seed: lotterySeed
          });
          setSelectedUsers(selected);
          setShowLotterySettings(false);

          const authorNote = excludePostAuthor && postAuthor ? `（已排除作者：${postAuthor}）` : '';
          onAddLog(`🎲 本地抽奖完成！从 ${allUsers.length} 个可用用户中选择了 ${selected.length} 个${authorNote}`, 'success');
          onShowMessage(`本地抽奖完成！选择了 ${selected.length} 个用户`, 'success');

          if (!needAirdrop) {
            setTimeout(() => {
              onAddLog(`🎉 抽奖完成！成功抽取了 ${selected.length} 个用户`, 'success');
              onShowMessage(`🎉 抽奖完成！成功抽取了 ${selected.length} 个用户`, 'success');
              setShowLotteryCompleteModal(true);
            }, 1000);
          }
          return;
        }

        // 执行接口抽奖
        const lotteryResult = await executeLotteryViaAPI({
          users: allUsers,
          excludeUsers: excludeUsers,
          drawCount: selectionCount,
          seed: lotterySeed,
          environment: LOTTERY_API_CONFIG.DEFAULT_ENVIRONMENT, // 使用测试环境，生产环境可设置为 'prod'
          postInfo: {
            postId: result.postId,
            title: result.title,
            content: result.content,
            replyCount: result.replyCount,
            sourceUrl: result.sourceUrl
          }
        });

        if (lotteryResult.success) {
          setSelectedUsers(lotteryResult.winners);
          setShowLotterySettings(false);

          const authorNote = excludePostAuthor && postAuthor ? `（已排除作者：${postAuthor}）` : '';
          onAddLog(`🎲 接口抽奖完成！从 ${lotteryResult.totalUsers} 个可用用户中选择了 ${lotteryResult.winners.length} 个${authorNote}`, 'success');
          onShowMessage(`接口抽奖完成！选择了 ${lotteryResult.winners.length} 个用户`, 'success');

          // 检查GitHub提交结果
          if (lotteryResult.githubCommit && lotteryResult.githubCommit.success) {
            onAddLog(`🏠 目标仓库: ${lotteryResult.githubCommit.repository}`, 'info');
          }

          // 存储抽奖结果信息，包括GitHub提交信息
          setLotteryResultInfo({
            winners: lotteryResult.winners,
            totalUsers: lotteryResult.totalUsers,
            drawCount: selectionCount,
            seed: lotterySeed,
            environment:  LOTTERY_API_CONFIG.DEFAULT_ENVIRONMENT,
            githubCommit: lotteryResult.githubCommit,
            isTipLottery: true
          });

          // 通知父组件抽奖完成
          if (onLotteryComplete) {
            onLotteryComplete({
              winners: lotteryResult.winners,
              totalUsers: lotteryResult.totalUsers,
              drawCount: selectionCount,
              seed: lotterySeed,
              environment: LOTTERY_API_CONFIG.DEFAULT_ENVIRONMENT,
              githubCommit: lotteryResult.githubCommit,
              isTipLottery: true
            });
          }

          // 如果不需要空投，直接显示完成消息
          if (!needAirdrop) {
            setTimeout(() => {
              onAddLog(`🎉 抽奖完成！成功抽取了 ${lotteryResult.winners.length} 个用户`, 'success');
              onShowMessage(`🎉 抽奖完成！成功抽取了 ${lotteryResult.winners.length} 个用户`, 'success');
              setShowLotteryCompleteModal(true);
            }, 1000);
          }
        } else {
          throw new Error(`接口抽奖失败: ${lotteryResult.error}`);
        }
      } else {
        // 不打赏的抽奖：使用本地抽奖逻辑
        onAddLog(`🎲 使用本地抽奖逻辑...`, 'info');

        const selected = drawUsers({
          allUsers: allUsers,
          excludeUsers: excludeUsers,
          count: selectionCount,
          seed: lotterySeed
        });

        setSelectedUsers(selected);
        setShowLotterySettings(false);

        // 通知父组件本地抽奖完成
        if (onLotteryComplete) {
          onLotteryComplete({
            winners: selected,
            totalUsers: allUsers.length,
            drawCount: selectionCount,
            seed: lotterySeed,
            environment: LOTTERY_API_CONFIG.DEFAULT_ENVIRONMENT,
            githubCommit: null,
            isTipLottery: false
          });
        }

        const authorNote = excludePostAuthor && postAuthor ? `（已排除作者：${postAuthor}）` : '';
        onAddLog(`🎲 本地抽奖完成！从 ${allUsers.length} 个可用用户中选择了 ${selected.length} 个${authorNote}`, 'success');
        onShowMessage(`本地抽奖完成！选择了 ${selected.length} 个用户`, 'success');

        // 如果不需要空投，直接显示完成消息
        if (!needAirdrop) {
          setTimeout(() => {
            onAddLog(`🎉 抽奖完成！成功抽取了 ${selected.length} 个用户`, 'success');
            onShowMessage(`🎉 抽奖完成！成功抽取了 ${selected.length} 个用户`, 'success');
            setShowLotteryCompleteModal(true);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('抽奖失败:', error.message);
      onAddLog(`抽奖失败: ${error.message}`, 'error');
      onShowMessage(`抽奖失败: ${error.message}`, 'error');
    }
  }, [result?.detailedReplies, result?.author, selectionCount, excludePostAuthor, lotterySeed, onAddLog, onShowMessage, needAirdrop, onLotteryComplete]);

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

        // 检查是否还有用户没有地址
        const stillWithoutAddresses = updatedUsers.filter(user => !user.address || user.address === '');
        if (stillWithoutAddresses.length > 0) {
          setUsersWithoutAddresses(stillWithoutAddresses);
          setShowAddressOptionsModal(true);
        }
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

  // 处理没有地址用户的选择
  const handleAddressOptionsChoice = useCallback((choice) => {

    if (choice === 'replace') {
      // 选择重新抽取：排除没有地址的用户，重新抽取对应数量
      const usersWithAddresses = selectedUsers.filter(user => user.address && user.address !== '');
      const needMoreCount = selectionCount - usersWithAddresses.length;

      if (needMoreCount > 0) {
        // 从原始回复中排除已有用户，重新抽取
        const postAuthor = result.author;
        const excludeUsers = (postAuthor && excludePostAuthor) ? [postAuthor] : [];

        // 排除已经选中的用户（有地址的）
        const excludeUsernames = usersWithAddresses.map(u => u.username);
        excludeUsers.push(...excludeUsernames);

        // 从原始回复中重新选择 - 不预先过滤地址，从所有用户中抽取
        let allUsers = result.detailedReplies.map((reply, index) => ({
          userId: reply.userId || `用户${index + 1}`,
          username: reply.userId || `用户${index + 1}`,
          address: reply.solanaAddresses && reply.solanaAddresses.length > 0 ? reply.solanaAddresses[0] : '',
          hasSolanaAddress: !!(reply.solanaAddresses && reply.solanaAddresses.length > 0),
          replyContent: reply.content || '',
          replyTime: reply.replyTime || '',
          floor: reply.floor || index + 1
        }));

        // 检查是否有足够的用户可供抽取（不预先过滤地址）
        if (allUsers.length <= excludeUsers.length) {
          onAddLog(`❌ 重新抽取失败：可用用户数量不足，需要 ${needMoreCount} 个，但只有 ${allUsers.length - excludeUsers.length} 个可用`, 'error');
          onShowMessage('重新抽取失败：可用用户数量不足', 'error');
          setShowAddressOptionsModal(false);
          setUsersWithoutAddresses([]);
          return;
        }

        try {
          // 重新抽取 - 从所有未被选中的用户中抽取，不预先过滤地址
          const newSelected = drawUsers({
            allUsers: allUsers,
            excludeUsers: excludeUsers,
            count: needMoreCount,
            seed: lotterySeed
          });

          // 合并结果
          const finalUsers = [...usersWithAddresses, ...newSelected];
          setSelectedUsers(finalUsers);

          onAddLog(`🔄 已重新抽取 ${needMoreCount} 个用户，总计 ${finalUsers.length} 个用户。注意：新抽取的用户可能需要解析地址`, 'success');
          onShowMessage(`重新抽取完成！现在有 ${finalUsers.length} 个用户，可能需要解析地址`, 'success');
        } catch (error) {
          console.error('重新抽取失败:', error);
          onAddLog(`❌ 重新抽取失败: ${error.message}`, 'error');
          onShowMessage(`重新抽取失败: ${error.message}`, 'error');
        }
      } else {
        onAddLog(`✅ 当前已有足够的有效用户，无需重新抽取`, 'info');
        onShowMessage('当前已有足够的有效用户', 'info');
      }
    } else if (choice === 'keep') {
      // 选择保留：记录日志说明这些用户没有地址
      const missingCount = usersWithoutAddresses.length;
      onAddLog(`📝 选择保留 ${missingCount} 个没有地址的用户，将在结果中特别说明`, 'info');
      onShowMessage(`已保留 ${missingCount} 个没有地址的用户，可以继续操作`, 'info');

      // 更新用户状态，标记没有地址的用户为已处理
      setSelectedUsers(prevUsers =>
        prevUsers.map(user => {
          if (!user.address || user.address === '') {
            return { ...user, addressHandled: 'kept' };
          }
          return user;
        })
      );
    }

    // 关闭选项模态框
    setShowAddressOptionsModal(false);
    setUsersWithoutAddresses([]);
  }, [selectedUsers, selectionCount, result?.detailedReplies, result?.author, excludePostAuthor, onAddLog, onShowMessage, usersWithoutAddresses.length, lotterySeed]);

  // 应用抽奖结果
  const applyLotteryResult = useCallback(() => {
    if (needAirdrop) {
      // 如果需要空投，检查是否有用户没有地址
      const usersWithoutAddresses = selectedUsers.filter(user =>
        (!user.address || user.address === '') && user.addressHandled !== 'kept'
      );

      if (usersWithoutAddresses.length > 0) {
        // 有用户没有地址，显示地址选项模态框
        setUsersWithoutAddresses(usersWithoutAddresses);
        setShowAddressOptionsModal(true);
      } else {
        // 所有用户都有地址，可以直接使用
        onAddLog(`✅ 抽奖结果应用成功！${selectedUsers.length} 个用户都有 Solana 地址，可以进行空投操作`, 'success');
        onShowMessage(`抽奖结果应用成功！${selectedUsers.length} 个用户可以进行空投`, 'success');
        // 传递完整的用户信息，包括用户名和地址
        const userAddresses = selectedUsers.map(user => ({
          address: user.address,
          username: user.username
        }));
        onApplyAddresses(userAddresses);
      }
    } else {
      // 不需要空投，显示抽奖完成界面
      onAddLog(`🎉 抽奖完成！成功抽取了 ${selectedUsers.length} 个用户`, 'success');
      onShowMessage(`🎉 抽奖完成！成功抽取了 ${selectedUsers.length} 个用户`, 'success');
      // 显示抽奖完成模态框
      setShowLotteryCompleteModal(true);
    }
  }, [selectedUsers, needAirdrop, onAddLog, onShowMessage, onApplyAddresses]);

  // 重置抽奖结果
  const resetLotteryResult = () => {
    setSelectedUsers([]);
    setShowLotterySettings(false);
    setShowLotteryComplete(false);
    setShowLotteryCompleteModal(false);
    onAddLog('🔄 抽奖结果已重置', 'info');
  };

  // 检查是否有用户没有 Solana 地址且未处理
  const hasUsersWithoutAddresses = useMemo(() => {
    if (!needAirdrop) {
      // 如果不需要空投，就不需要检查地址
      return false;
    }
    return selectedUsers.some(user =>
      (!user.address || user.address === '') && user.addressHandled !== 'kept'
    );
  }, [selectedUsers, needAirdrop]);

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

  // 当defaultShowLottery为true时，需要先完成打赏流程
  useEffect(() => {
    if (defaultShowLottery && !lotterySeed) {
      // 如果是抽奖操作进入但还没有完成打赏，显示打赏界面
      setShowTipModal(true);
    } else if (defaultShowLottery && lotterySeed) {
      // 如果已经完成打赏，显示抽奖设置
      setShowLotterySettings(true);
    }
  }, [defaultShowLottery, lotterySeed]);

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
                        {/* 只在需要空投时显示地址信息 */}
                        {needAirdrop && (
                          <span className={`user-address ${!user.address || user.address === '' ? 'missing' : ''}`}>
                            {user.address || '暂无地址'}
                          </span>
                        )}
                      </span>
                      {/* 解析状态显示 - 只在需要空投时显示 */}
                      {needAirdrop && (
                        <>
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
                        </>
                      )}

                      {/* 解析到的用户信息 - 只在需要空投时显示 */}
                      {needAirdrop && user.parseStatus === 'success' && (
                        <div className="parsed-user-info">
                          {user.bio && (
                            <div className="user-bio">
                              <span className="bio-label">个人简介:</span>
                              <span className="bio-content">{user.bio}</span>
                            </div>
                          )}
                          {user.location && (
                            <div className="user-location">
                              <span className="location-label">位置:</span>
                              <span className="location-content">{user.location}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 解析失败信息 - 只在需要空投时显示 */}
                      {needAirdrop && user.parseStatus === 'failed' && user.parseError && (
                        <div className="parse-error">
                          <span className="error-text">解析失败: {user.parseError}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 解析进度 - 只在需要空投时显示 */}
                {needAirdrop && parsingAddresses && (
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
                        数量:
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

                  {/* 新增：空投设置选项 */}
                  <div className="option-group-row">
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={needAirdrop}
                          onChange={(e) => setNeedAirdrop(e.target.checked)}
                        />
                        是否需要进行空投
                      </label>
                      <div className="option-description">
                        {needAirdrop ?
                          '选中：抽奖完成后需要解析Solana地址并进行空投操作' :
                          '未选中：抽奖完成后直接显示结果，无需解析地址和空投'
                        }
                      </div>
                    </div>
                  </div>

                  {/* 抽奖信息预览 */}
                  <div className="lottery-preview">
                    <div className="preview-header">
                      <span>抽奖预览</span>
                    </div>
                    <div className="preview-content">
                      <div className="preview-item">
                        <span className="preview-label">总回复数：</span>
                        <span className="preview-value">{result.detailedReplies.length}</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-label">抽奖数量：</span>
                        <span className="preview-value">{selectionCount}</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-label">排除作者：</span>
                        <span className="preview-value">{excludePostAuthor ? '是' : '否'}</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-label">空投模式：</span>
                        <span className={`preview-value ${needAirdrop ? 'preview-active' : 'preview-inactive'}`}>
                          {needAirdrop ? '需要空投' : '仅抽奖'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="lottery-settings-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        // 检查是否已经完成打赏流程
                        if (!lotterySeed) {
                          setShowLotterySettings(false);
                          setShowTipModal(true);
                          return;
                        }
                        executeRandomSelection();
                      }}
                    >
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

          {/* 抽奖完成界面 - 已替换为LotteryCompleteModal组件 */}
        </div>

        <div className="modal-footer">
          <div className="action-buttons">
            {/* 如果没有抽奖结果，显示"使用这些地址"按钮 */}
            {selectedUsers.length === 0 && (
              <button className="btn btn-primary" onClick={() => {
                // 从result.detailedReplies中构建用户地址信息
                const userAddresses = result.detailedReplies
                  .filter(reply => reply.solanaAddresses && reply.solanaAddresses.length > 0)
                  .map(reply => ({
                    address: reply.solanaAddresses[0],
                    username: reply.userId
                  }));
                onApplyAddresses(userAddresses);
              }}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c-1 0-2-.5-2-1.5V5c0-1.5 1-2.5-2-2.5s2 1 2 2.5v5.5c0 1-1 1.5-2 1.5z" />
                  <path d="M3 12c1 0 2-.5 2-1.5V5c0-1.5-1-2.5-2-2.5S1 3.5 1 5v5.5c0 1 1 1.5 2 1.5z" />
                </svg>
                使用这些地址
              </button>
            )}

            {/* 抽奖操作按钮 - 只在没有抽奖结果时显示 */}
            {selectedUsers.length === 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  // 检查是否已经完成打赏流程
                  if (!lotterySeed) {
                    setShowTipModal(true);
                    return;
                  }
                  handleRandomSelection();
                }}
              >
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
                {/* 警告提示 - 只在需要空投且有用户没有地址时显示 */}
                {needAirdrop && hasUsersWithoutAddresses && (
                  <div className="inline-warning">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-text">部分用户没有 Solana 地址，需要先解析地址</span>
                  </div>
                )}

                {/* 解析地址按钮 - 只在需要空投且有用户没有地址时显示 */}
                {needAirdrop && hasUsersWithoutAddresses && (
                  <button
                    className="btn btn-warning"
                    onClick={parseMissingAddresses}
                    disabled={parsingAddresses}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {parsingAddresses ? '解析中...' : '解析地址'}
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

                {/* 使用抽奖用户按钮 - 根据是否需要空投显示不同的文字 */}
                <button
                  className="btn btn-primary"
                  onClick={applyLotteryResult}
                  disabled={needAirdrop && hasUsersWithoutAddresses}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12c1 0 2-.5 2-1.5V5c0-1.5-1-2.5-2-2.5S1 3.5 1 5v5.5c0 1 1 1.5 2 1.5z" />
                  </svg>
                  {needAirdrop ? '使用抽奖用户' : '完成抽奖'}
                </button>
              </div>
            )}
            <button className="btn btn-outline" onClick={onClose}>
              关闭
            </button>
          </div>


        </div>
      </div>

      {/* 打赏模态框 */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        onTipComplete={handleTipComplete}
        userWallet={userWallet}
        rpcEndpoint={rpcEndpoint}
        onAddLog={onAddLog}
        onShowMessage={onShowMessage}
        connectWallet={connectWallet}
      />

      {/* 抽奖完成模态框 */}
      <LotteryCompleteModal
        isOpen={showLotteryCompleteModal}
        onClose={() => setShowLotteryCompleteModal(false)}
        winners={selectedUsers}
        postUrl={result?.sourceUrl}
        postTitle={result?.title}
        onAddLog={onAddLog}
        onResetLottery={resetLotteryResult}
        onShowLotterySettings={showLotterySettingsModal}
        lotteryResultInfo={lotteryResultInfo}
      />

      {/* 地址选项模态框 */}
      {showAddressOptionsModal && (
        <div className="modal-overlay" onClick={() => setShowAddressOptionsModal(false)}>
          <div className="modal-content address-options-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <svg className="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                发现没有 Solana 地址的用户
              </h3>
              <button className="modal-close" onClick={() => setShowAddressOptionsModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="address-options-description">
                <p>地址解析完成后，仍有 <strong>{usersWithoutAddresses.length}</strong> 个用户没有 Solana 地址：</p>
                <div className="users-without-addresses">
                  {usersWithoutAddresses.map((user, index) => (
                    <div key={index} className="user-without-address">
                      <span className="user-username">@{user.username}</span>
                      <span className="user-floor">#{user.floor}</span>
                      {user.replyContent && (
                        <span className="user-reply-content">: {user.replyContent.substring(0, 50)}...</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="options-note">请选择如何处理这些没有地址的用户：</p>
              </div>

              <div className="address-options">
                <div className="option-item">
                  <button
                    className="btn btn-primary option-button"
                    onClick={() => handleAddressOptionsChoice('replace')}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <path d="M12 12h.01" />
                      <path d="M12 16h.01" />
                    </svg>
                    重新抽取用户
                  </button>
                  <div className="option-description">
                    将排除这些没有地址的用户，从剩余未被抽中的用户中重新抽取。新抽取的用户可能需要解析地址，但会保持原有的抽奖数量。
                  </div>
                </div>

                <div className="option-item">
                  <button
                    className="btn btn-secondary option-button"
                    onClick={() => handleAddressOptionsChoice('keep')}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    保留这些用户
                  </button>
                  <div className="option-description">
                    保留这些没有地址的用户，在最终结果中会特别说明他们没有 Solana 地址，无法参与空投。
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddressOptionsModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default V2exResultModal;
