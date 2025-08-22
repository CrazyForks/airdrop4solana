import React, { useState, useEffect } from 'react';

// Solana 导入
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

// 组件导入
import Header from './components/Header';
import ActionButtons from './components/ActionButtons';
import FloatingToast from './components/FloatingToast';
import V2exResultModal from './components/V2exResultModal';
import ConfigModal from './components/ConfigModal';
import FloatingLogPanel from './components/FloatingLogPanel';

// 工具函数导入
import { useWallet } from './hooks/useWallet';
import { useLogger } from './hooks/useLogger';
import { parseV2exPost } from './utils/v2ex';

function App() {
  // 状态管理
  const [theme, setTheme] = useState('dark');

  // V2EX 相关状态
  const [v2exUrl, setV2exUrl] = useState('');
  const [v2exParsing, setV2exParsing] = useState(false);
  const [v2exParseResult, setV2exParseResult] = useState(null);
  const [showV2exResultModal, setShowV2exResultModal] = useState(false);

  // 地址和空投相关状态
  const [targetAddresses, setTargetAddresses] = useState([]);
  const [airdropAmount, setAirdropAmount] = useState('0.001');

  // RPC端点状态
  const [rpcEndpoint, setRpcEndpoint] = useState(() => {
    // 从localStorage读取保存的RPC端点，如果没有则使用默认值
    const saved = localStorage.getItem('solana-rpc-endpoint');
    return saved || 'https://api.mainnet-beta.solana.com';
  });

  // 调试模式
  const [debugMode] = useState(() => {
    return localStorage.getItem('debug-mode') === 'true' || process.env.NODE_ENV === 'development';
  });

  // 钱包和网络状态
  const { userWallet, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const { logs, addLog, clearLogs, exportLogs } = useLogger();

  // 添加初始测试日志（临时用于测试日志面板显示）
  const hasInitialized = React.useRef(false);
  React.useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      addLog('应用已启动', 'info');
      addLog('等待用户操作...', 'info');
    }
  }, [addLog]); // 包含 addLog 依赖，但使用 ref 防止重复执行

  // 通知状态
  const [message, setMessage] = useState(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // 主题切换
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // 保存网络配置
  const handleSaveConfig = (config) => {
    setRpcEndpoint(config.rpcEndpoint);
    // 保存到localStorage
    localStorage.setItem('solana-rpc-endpoint', config.rpcEndpoint);
    localStorage.setItem('solana-network', config.network);
    localStorage.setItem('solana-commitment', config.commitment);

    addLog(`网络配置已更新: ${config.network}, RPC: ${config.rpcEndpoint}`, 'success');
    showMessage('网络配置已保存', 'success');
  };

  // 测试RPC连接
  const testRpcConnection = async () => {
    addLog('正在测试RPC连接...', 'info');
    showMessage('正在测试RPC连接...', 'info');

    try {
      const connection = new Connection(rpcEndpoint, 'confirmed');
      const blockhash = await connection.getLatestBlockhash();

      addLog(`RPC连接成功！最新区块哈希: ${blockhash.blockhash.substring(0, 8)}...`, 'success');
      showMessage('RPC连接测试成功', 'success');
    } catch (error) {
      addLog(`RPC连接失败: ${error.message}`, 'error');
      showMessage(`RPC连接失败: ${error.message}`, 'error');
    }
  };

  // 开启调试模式
  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    localStorage.setItem('debug-mode', newDebugMode.toString());
    addLog(`调试模式${newDebugMode ? '开启' : '关闭'}`, 'info');
    showMessage(`调试模式${newDebugMode ? '开启' : '关闭'}`, 'info');
    // 需要刷新页面使调试模式生效
    window.location.reload();
  };

  const showMessage = (content, type = 'info', duration = 3000) => {
    const newMessage = {
      id: Date.now(),
      content,
      type,
      duration
    };
    setMessage(newMessage);
    setTimeout(() => {
      setMessage(null);
    }, duration);
  };

  // 辅助函数
  const solToLamports = (sol) => {
    return Math.floor(parseFloat(sol) * 1000000000);
  };

  const safeSubstring = (str, start, end) => {
    if (!str || typeof str !== 'string') return '';
    return str.substring(start, end);
  };

  const processSignature = (signature) => {
    if (typeof signature === 'string') {
      return signature;
    } else if (signature && signature.signature) {
      return signature.signature;
    }
    return signature;
  };

  // .sol 域名解析函数
  const resolveSolDomain = async (domain) => {
    // 如果不是 .sol 域名，直接返回（假设是有效的公钥）
    if (!domain.endsWith('.sol')) {
      return domain;
    }

    // 这里应该实现 .sol 域名解析逻辑
    // 目前简单返回原域名，实际项目中需要集成域名解析服务
    throw new Error(`暂不支持 .sol 域名解析: ${domain}`);
  };

  // V2EX 解析功能
  const handleParseV2exPost = async () => {
    if (!v2exUrl.trim()) {
      showMessage('请输入V2EX帖子链接或ID', 'warning');
      return;
    }

    setV2exParsing(true);
    addLog('开始解析V2EX帖子...', 'info');

    try {
      const result = await parseV2exPost(v2exUrl.trim());
      setV2exParseResult(result);

      // 显示解析结果弹窗让用户操作
      setShowV2exResultModal(true);

      addLog(`成功解析V2EX帖子，找到 ${result.addresses.length} 个Solana地址`, 'success');
      showMessage(`解析成功！找到 ${result.addresses.length} 个地址`, 'success');
    } catch (error) {
      addLog(`解析V2EX帖子失败: ${error.message}`, 'error');
      showMessage(`解析失败: ${error.message}`, 'error');
    } finally {
      setV2exParsing(false);
    }
  };

  // 应用V2EX地址
  const applyV2exAddresses = (addresses, closeModal = false) => {
    if (!Array.isArray(addresses)) {
      showMessage('地址数据格式错误', 'error');
      return;
    }

    const formattedAddresses = addresses.map((addr, index) => {
      if (typeof addr === 'string') {
        // 如果地址是字符串，创建标准格式
        return {
          id: index + 1,
          publicKey: addr,
          username: `用户${index + 1}`,
          privateKey: null,
          isFromV2ex: true
        };
      } else if (addr.address) {
        // 如果地址有 address 属性
        return {
          id: index + 1,
          publicKey: addr.address,
          username: addr.username || `用户${index + 1}`,
          privateKey: null,
          isFromV2ex: true
        };
      } else if (addr.publicKey) {
        // 如果地址有 publicKey 属性
        return {
          id: index + 1,
          publicKey: addr.publicKey,
          username: addr.username || `用户${index + 1}`,
          privateKey: null,
          isFromV2ex: true
        };
      } else {
        // 默认情况
        return {
          id: index + 1,
          publicKey: String(addr),
          username: `用户${index + 1}`,
          privateKey: null,
          isFromV2ex: true
        };
      }
    });

    setTargetAddresses(formattedAddresses);
    addLog(`已应用 ${formattedAddresses.length} 个V2EX地址`, 'success');
    showMessage(`已成功添加 ${formattedAddresses.length} 个地址`, 'success');

    // 如果需要关闭弹窗，则关闭V2EX结果弹窗
    if (closeModal) {
      setShowV2exResultModal(false);
    }
  };



  // 执行批量空投
  const executeBatchAirdrop = async () => {
    if (!userWallet || !userWallet.publicKey || targetAddresses.length === 0 || !airdropAmount) {
      addLog('请先连接钱包并完成设置', 'error');
      showMessage('请先连接钱包并完成设置', 'error');
      return;
    }

    // 调试信息
    if (debugMode) {
      addLog(`调试模式开启 - 钱包信息: ${JSON.stringify({
        provider: userWallet.provider,
        publicKey: userWallet.publicKey?.toString().substring(0, 8) + '...',
        connected: userWallet.connected
      })}`, 'info');
      addLog(`调试模式开启 - 目标地址数量: ${targetAddresses.length}`, 'info');
      addLog(`调试模式开启 - RPC端点: ${rpcEndpoint}`, 'info');
    }

    try {
      const MAX_TRANSACTIONS_PER_BATCH = 20;
      const totalAddresses = targetAddresses.length;

      if (totalAddresses > MAX_TRANSACTIONS_PER_BATCH) {
        addLog(`地址数量 ${totalAddresses} 超过建议限制 ${MAX_TRANSACTIONS_PER_BATCH}，将自动分批处理`, 'warning');
        showMessage(`地址数量较多，将分批处理以避免交易过大`, 'warning');
      }

      addLog(`开始执行批量空投，目标地址: ${totalAddresses} 个，将使用合并交易模式`, 'info');
      showMessage('🚀 开始执行批量空投（合并交易模式）...', 'info');

      const connection = new Connection(rpcEndpoint, 'confirmed');
      try {
        await connection.getLatestBlockhash();
      } catch (error) {
        throw new Error(`RPC连接失败: ${error.message}。请检查网络配置或点击"测试RPC连接"`);
      }

      const amount = solToLamports(airdropAmount);
      const fromPubkey = new PublicKey(userWallet.publicKey);

      addLog(`使用已连接钱包: ${fromPubkey.toString().substring(0, 8)}...`, 'info');
      addLog(`空投参数: 金额 ${airdropAmount} SOL (${amount} lamports), 地址数量 ${targetAddresses.length}`, 'info');

      // 在分批前解析 .sol 域名到公钥
      addLog('开始验证和解析目标地址...', 'info');
      const resolvedAddresses = [];
      for (const item of targetAddresses) {
        try {
          const maybeDomain = item.publicKey;

          // 验证地址格式
          if (!maybeDomain || typeof maybeDomain !== 'string') {
            addLog(`跳过无效地址: ${JSON.stringify(item)}`, 'warning');
            continue;
          }

          // 尝试解析域名或验证公钥
          const resolved = await resolveSolDomain(maybeDomain);

          // 再次验证解析后的地址
          try {
            new PublicKey(resolved);
            resolvedAddresses.push({ ...item, publicKey: resolved });
            addLog(`地址验证通过: ${resolved.substring(0, 8)}...`, 'info');
          } catch (pubkeyError) {
            addLog(`地址格式无效，已跳过: ${resolved}`, 'warning');
          }

        } catch (resolveError) {
          addLog(`地址处理失败，已跳过: ${item.publicKey} -> ${resolveError.message}`, 'warning');
        }
      }

      if (resolvedAddresses.length === 0) {
        const errorMsg = '没有可用的有效地址。请检查目标地址列表。';
        addLog(errorMsg, 'error');
        showMessage(errorMsg, 'error');
        return;
      }

      addLog(`地址验证完成，有效地址: ${resolvedAddresses.length} 个`, 'success');

      // 智能分批处理
      const buildBatchesBySize = async (addresses) => {
        const preparedBatches = [];
        let index = 0;
        const MAX_TX_SIZE = 1232;
        const { blockhash: sizeEstimateBlockhash } = await connection.getLatestBlockhash();

        while (index < addresses.length) {
          const batchAddresses = [];
          const tx = new Transaction();
          tx.feePayer = fromPubkey;
          tx.recentBlockhash = sizeEstimateBlockhash;

          while (index < addresses.length) {
            const addr = addresses[index];
            tx.add(
              SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: new PublicKey(addr.publicKey),
                lamports: amount
              })
            );

            let fits = true;
            try {
              const size = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length;
              if (size > MAX_TX_SIZE) {
                fits = false;
              }
            } catch (_) {
              fits = false;
            }

            if (fits) {
              batchAddresses.push(addr);
              index += 1;
            } else {
              tx.instructions.pop();
              break;
            }
          }

          if (batchAddresses.length === 0 && index < addresses.length) {
            const fallbackTx = new Transaction();
            fallbackTx.feePayer = fromPubkey;
            fallbackTx.recentBlockhash = sizeEstimateBlockhash;

            const addr = addresses[index];
            fallbackTx.add(
              SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: new PublicKey(addr.publicKey),
                lamports: amount
              })
            );
            batchAddresses.push(addr);
            index += 1;
          }

          preparedBatches.push({ addresses: batchAddresses });
        }

        return preparedBatches;
      };

      const preparedBatches = await buildBatchesBySize(resolvedAddresses);
      const batchCount = preparedBatches.length;

      if (batchCount > 1) {
        addLog(`智能分批完成，共分为 ${batchCount} 个批次，确保每个交易不超过1232字节`, 'info');
        showMessage(`📊 智能分批完成，共 ${batchCount} 个批次`, 'info');
      }

      let successCount = 0;
      let failCount = 0;
      let processedCount = 0;

      for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
        const { addresses: batchAddresses } = preparedBatches[batchIndex];
        const rangeStart = processedCount + 1;
        const rangeEnd = processedCount + batchAddresses.length;

        addLog(`开始处理第 ${batchIndex + 1}/${batchCount} 批次，地址范围: ${rangeStart}-${rangeEnd}，包含 ${batchAddresses.length} 个地址`, 'info');

        // 显示批次开始通知
        if (batchCount > 1) {
          showMessage(`🔄 正在处理第 ${batchIndex + 1}/${batchCount} 批次...`, 'info');
        }

        const transaction = new Transaction();

        for (let i = 0; i < batchAddresses.length; i++) {
          const target = batchAddresses[i];
          const globalIndexZero = processedCount + i;

          transaction.add(
            SystemProgram.transfer({
              fromPubkey: fromPubkey,
              toPubkey: new PublicKey(target.publicKey),
              lamports: amount
            })
          );

          addLog(`已添加第 ${globalIndexZero + 1}/${totalAddresses} 个转账指令: ${target.publicKey.substring(0, 8)}...`, 'info');
        }

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        addLog(`第 ${batchIndex + 1} 批次交易创建完成，包含 ${batchAddresses.length} 个转账指令`, 'info');
        showMessage(`正在发送第 ${batchIndex + 1}/${batchCount} 批次交易...`, 'info');

        let signature;
        try {
          if (userWallet.provider === 'phantom') {
            if (!window.solana) {
              throw new Error('Phantom 钱包未找到，请确保已安装并连接 Phantom 钱包');
            }
            if (!window.solana.isConnected) {
              throw new Error('Phantom 钱包未连接，请重新连接钱包');
            }
            addLog(`正在通过 Phantom 钱包发送第 ${batchIndex + 1} 批次交易...`, 'info');
            signature = await window.solana.signAndSendTransaction(transaction);
          } else if (userWallet.provider === 'solflare') {
            if (!window.solflare) {
              throw new Error('Solflare 钱包未找到，请确保已安装并连接 Solflare 钱包');
            }
            if (!window.solflare.isConnected) {
              throw new Error('Solflare 钱包未连接，请重新连接钱包');
            }
            addLog(`正在通过 Solflare 钱包发送第 ${batchIndex + 1} 批次交易...`, 'info');
            signature = await window.solflare.signAndSendTransaction(transaction);
          } else {
            throw new Error(`不支持的钱包类型: ${userWallet.provider}。目前支持 Phantom 和 Solflare 钱包。`);
          }
        } catch (walletError) {
          console.error('钱包交互失败:', walletError);
          if (walletError.message.includes('User rejected')) {
            throw new Error('用户取消了交易签名');
          } else if (walletError.message.includes('insufficient funds')) {
            throw new Error('钱包余额不足，请确保有足够的 SOL 支付交易费用和空投金额');
          } else if (walletError.message.includes('Transaction simulation failed')) {
            throw new Error('交易模拟失败，请检查目标地址是否有效以及账户余额是否充足');
          } else {
            throw new Error(`钱包交互失败: ${walletError.message}`);
          }
        }

        const signatureStr = processSignature(signature);
        console.log(`🔗 第 ${batchIndex + 1} 批次交易已发送，完整TX哈希:`, signatureStr);
        addLog(`第 ${batchIndex + 1} 批次交易已发送: ${safeSubstring(signatureStr, 0, 8)}...`, 'success');
        addLog(`完整TX哈希: ${signatureStr}`, 'info');
        showMessage(`第 ${batchIndex + 1} 批次交易已发送，等待确认...`, 'info');

        try {
          const confirmationStrategy = rpcEndpoint.includes('mainnet') ? 'finalized' : 'confirmed';
          const timeoutMs = rpcEndpoint.includes('mainnet') ? 120000 : 30000;

          addLog(`等待第 ${batchIndex + 1} 批次交易确认 (${confirmationStrategy})，超时时间: ${timeoutMs / 1000}秒...`, 'info');

          await connection.confirmTransaction(signature, confirmationStrategy, {
            commitment: confirmationStrategy,
            timeout: timeoutMs
          });

          successCount += batchAddresses.length;
          console.log(`✅ 第 ${batchIndex + 1} 批次交易确认成功！TX哈希:`, signatureStr);
          addLog(`第 ${batchIndex + 1} 批次交易确认成功！TX: ${signatureStr}`, 'success');

          // 显示批次成功通知
          if (batchCount > 1) {
            showMessage(`✅ 第 ${batchIndex + 1}/${batchCount} 批次完成！成功: ${batchAddresses.length} 个地址`, 'success');
          } else {
            showMessage(`✅ 空投完成！成功: ${batchAddresses.length} 个地址`, 'success');
          }

        } catch (confirmError) {
          if (confirmError.message.includes('not confirmed') || confirmError.message.includes('timeout')) {
            addLog(`第 ${batchIndex + 1} 批次交易确认超时，正在检查状态...`, 'warning');

            try {
              const status = await connection.getSignatureStatus(signature);
              if (status && status.value && status.value.confirmationStatus === 'confirmed') {
                console.log(`✅ 第 ${batchIndex + 1} 批次交易状态检查成功！TX哈希:`, signatureStr);
                addLog(`第 ${batchIndex + 1} 批次交易状态检查成功，已确认！TX: ${signatureStr}`, 'success');
                successCount += batchAddresses.length;

                // 显示状态检查成功通知
                if (batchCount > 1) {
                  showMessage(`✅ 第 ${batchIndex + 1}/${batchCount} 批次状态确认成功！`, 'success');
                } else {
                  showMessage(`✅ 空投状态确认成功！`, 'success');
                }
              } else {
                addLog(`第 ${batchIndex + 1} 批次交易状态待确认，签名: ${safeSubstring(signatureStr, 0, 8)}...`, 'warning');
                addLog(`建议: 在 Solana Explorer 中检查交易状态`, 'info');
                failCount += batchAddresses.length;
                showMessage(`第 ${batchIndex + 1} 批次状态待确认`, 'warning');
              }
            } catch (statusError) {
              addLog(`第 ${batchIndex + 1} 批次交易状态检查失败: ${statusError.message}`, 'warning');
              addLog(`建议: 在 Solana Explorer 中检查交易状态`, 'info');
              failCount += batchAddresses.length;
              showMessage(`第 ${batchIndex + 1} 批次状态检查失败`, 'warning');
            }
          } else {
            addLog(`第 ${batchIndex + 1} 批次交易确认失败: ${confirmError.message}`, 'error');
            failCount += batchAddresses.length;
            showMessage(`第 ${batchIndex + 1} 批次确认失败`, 'error');
          }
        }

        if (batchIndex < batchCount - 1) {
          addLog(`等待 2 秒后处理下一批次...`, 'info');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        processedCount += batchAddresses.length;
      }

      console.log(`🎉 批量空投完成！成功: ${successCount} 个, 失败: ${failCount} 个`);
      addLog(`批量空投完成！成功: ${successCount} 个, 失败: ${failCount} 个`, 'success');
      addLog(`建议：可在 Solana Explorer (https://explorer.solana.com) 中查看交易详情`, 'info');

      // 显示成功通知条
      if (batchCount > 1) {
        showMessage(`🎉 批量空投完成！共 ${batchCount} 个批次，成功: ${successCount} 个, 失败: ${failCount} 个`, 'success');
      } else {
        showMessage(`🎉 批量空投完成！成功: ${successCount} 个, 失败: ${failCount} 个`, 'success');
      }

      // 显示详细成功通知
      const successNotification = {
        title: '🎉 空投成功完成！',
        content: `成功空投 ${successCount} 个地址，${failCount > 0 ? `失败 ${failCount} 个` : '无失败'}。`,
        details: `总金额: ${(parseFloat(airdropAmount) * successCount).toFixed(6)} SOL`,
        explorer: 'https://explorer.solana.com'
      };

      // 在日志中添加成功通知
      addLog(`🎉 空投成功通知: ${successNotification.title}`, 'success');
      addLog(`📊 空投统计: ${successNotification.content}`, 'success');
      addLog(`💰 总金额: ${successNotification.details}`, 'success');
      addLog(`🔗 查看交易: ${successNotification.explorer}`, 'info');

    } catch (error) {
      console.error('批量空投失败:', error);
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });

      // 提供更详细的错误信息
      let errorMessage = error.message || 'Unknown error';
      let errorDetails = '';

      if (error.stack) {
        errorDetails = error.stack.split('\n')[0] || '';
      }

      addLog(`批量空投失败: ${errorMessage}`, 'error');
      if (errorDetails && errorDetails !== errorMessage) {
        addLog(`错误详情: ${errorDetails}`, 'error');
      }

      if (error.message && error.message.includes('RPC连接失败')) {
        showMessage(`批量空投失败: ${error.message}`, 'error');
      } else if (error.message && (error.message.includes('failed to fetch') || error.message.includes('ERR_CONNECTION_RESET'))) {
        showMessage('网络连接失败，请检查网络配置或尝试切换网络', 'error');
      } else if (error.message && error.message.includes('insufficient funds')) {
        showMessage('钱包余额不足，请确保有足够的SOL执行空投', 'error');
      } else if (error.message && error.message.includes('User rejected')) {
        showMessage('用户取消了交易签名', 'warning');
        addLog('用户取消了交易签名', 'warning');
      } else if (error.message && error.message.includes('Transaction simulation failed')) {
        showMessage('交易模拟失败，请检查账户余额和权限', 'error');
        addLog('交易模拟失败，可能原因：账户余额不足、权限不够或目标地址无效', 'error');
      } else if (error.name === 'TypeError') {
        showMessage('程序错误：请检查钱包连接和网络配置', 'error');
        addLog(`TypeError: ${error.message}`, 'error');
      } else {
        showMessage(`批量空投失败: ${errorMessage || 'Unexpected error'}`, 'error');
        addLog(`完整错误信息: ${JSON.stringify({
          name: error.name,
          message: error.message,
          constructor: error.constructor.name
        })}`, 'error');
      }
    }
  };



  return (
    <div className="container">
      <Header />

      <main className="main-content" id="main-content">
        {/* 左侧主要内容区域 */}
        <div className="content-area">


          {/* V2EX 页面 - 3列布局 */}
          <div className="three-column-layout">
            {/* 第一列：V2EX 解析功能 */}
            <div className="column">
              <div className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h2 className="feature-title">从 V2EX 获取地址</h2>
                </div>
                <p className="feature-description">
                  输入 V2EX 帖子链接或 ID，系统将自动解析并提取所有 Solana 地址和 .sol 域名
                </p>

                <div className="form-group">
                  <label className="form-label">V2EX 帖子链接或 ID</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={v2exUrl}
                      onChange={(e) => setV2exUrl(e.target.value)}
                      placeholder="https://www.v2ex.com/t/12345 或 12345"
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleParseV2exPost}
                      disabled={!v2exUrl.trim() || v2exParsing}
                    >
                      {v2exParsing ? (
                        <>
                          <div className="loading"></div>
                          解析中...
                        </>
                      ) : (
                        '开始解析'
                      )}
                    </button>
                  </div>


                </div>
              </div>

              {/* 帖子信息卡片 - 在解析完成后显示 */}
              {v2exParseResult && (
                <div className="feature-card">
                  <div className="feature-header">
                    <div className="feature-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <h2 className="feature-title">帖子信息</h2>
                  </div>

                  <div className="post-info-section">
                    <div className="post-basic-info">
                      <div className="info-item">
                        <span className="label">标题:</span>
                        <span className="value">{v2exParseResult.title || '未知标题'}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">作者:</span>
                        <span className="value">{v2exParseResult.author || '未知作者'}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">回复数:</span>
                        <span className="value">{v2exParseResult.detailedReplies?.length || 0} 条</span>
                      </div>
                      <div className="info-item">
                        <span className="label">地址数:</span>
                        <span className="value success">{v2exParseResult.addresses.length} 个</span>
                      </div>
                      <div className="info-item">
                        <span className="label">域名数:</span>
                        <span className="value info">{v2exParseResult.domains.length} 个</span>
                      </div>
                    </div>

                    {/* 抽奖配置信息 */}
                    {targetAddresses.length > 0 && (
                      <div className="lottery-config-section">
                        <h4 style={{ margin: '16px 0 12px 0', color: 'var(--text-primary)', fontSize: '14px' }}>
                          🎲 抽奖配置信息
                        </h4>
                        <div className="lottery-config-info">
                          <div className="info-item">
                            <span className="label">抽奖方式:</span>
                            <span className="value">
                              {targetAddresses.length === v2exParseResult.addresses.length ? '全部地址' : '抽奖选择'}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="label">目标数量:</span>
                            <span className="value">{targetAddresses.length} 个</span>
                          </div>
                          <div className="info-item">
                            <span className="label">随机种子:</span>
                            <span className="value">{Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 操作按钮组 */}
                    <div className="view-result-section" style={{ marginTop: '20px' }}>
                      <div className="btn-group" style={{ display: 'flex', gap: '12px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowV2exResultModal(true)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          查看详情
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            // 检查钱包连接状态
                            if (!userWallet || !userWallet.publicKey) {
                              showMessage('请先连接钱包再进行抽奖操作', 'warning');
                              addLog('用户尝试抽奖但钱包未连接', 'warning');
                              return;
                            }

                            setShowV2exResultModal(true);
                            // 设置一个标记，表示这是抽奖操作
                            setV2exParseResult(prev => ({ ...prev, isLotteryOperation: true }));
                          }}
                          title="进行抽奖操作"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          抽奖操作
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 第二列：空投目标用户 */}
            <div className="column">
              <div className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <h2 className="feature-title">空投目标用户</h2>
                </div>
                <p className="feature-description">
                  当前即将接受空投的用户列表
                </p>

                {targetAddresses.length > 0 ? (
                  <div className="airdrop-target-list">
                    <div className="summary-item">
                      <span className="label">目标用户数量:</span>
                      <span className="value">{targetAddresses.length} 个</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">地址来源:</span>
                      <span className="value">V2EX 解析</span>
                    </div>

                    {/* 用户列表显示 */}
                    <div className="address-list-section">
                      <h4 style={{ margin: '16px 0 12px 0', color: 'var(--text-primary)' }}>用户列表</h4>
                      <div className="address-list">
                        {targetAddresses.map((address, index) => (
                          <div key={address.id || index} className="address-item">
                            <span className="username">
                              {address.username || `用户${index + 1}`}
                            </span>
                            <span className="separator">:</span>
                            <span className="address">{address.publicKey}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="btn-group">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setTargetAddresses([])}
                      >
                        清空列表
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>请先解析 V2EX 帖子或添加目标地址</p>
                  </div>
                )}
              </div>
            </div>

            {/* 第三列：空投信息摘要和操作 */}
            <div className="column">
              <div className="feature-card">
                <div className="feature-header">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <h2 className="feature-title">空投信息摘要</h2>
                </div>
                <p className="feature-description">
                  当前空投配置和状态信息
                </p>

                <div className="form-group">
                  <label className="form-label">单个空投金额 (SOL)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={airdropAmount}
                    onChange={(e) => setAirdropAmount(e.target.value)}
                    placeholder="0.01"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="airdrop-summary">
                  <div className="summary-item">
                    <span className="label">目标地址数量:</span>
                    <span className="value">{targetAddresses.length} 个</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">单个空投金额:</span>
                    <span className="value">{airdropAmount} SOL</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">空投总价值:</span>
                    <span className="value">
                      {targetAddresses.length > 0 ? (parseFloat(airdropAmount || 0) * targetAddresses.length).toFixed(6) : '0'} SOL
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="label">钱包状态:</span>
                    <span className={`value ${userWallet ? 'success' : 'error'}`}>
                      {userWallet ? '已连接' : '未连接'}
                    </span>
                  </div>
                </div>

                <div className="btn-group">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => {
                      // 检查钱包连接状态
                      if (!userWallet || !userWallet.publicKey) {
                        showMessage('请先连接钱包再执行空投', 'warning');
                        addLog('用户尝试空投但钱包未连接', 'warning');
                        return;
                      }
                      executeBatchAirdrop();
                    }}
                    disabled={!userWallet || targetAddresses.length === 0 || !airdropAmount || parseFloat(airdropAmount) <= 0}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    启动空投
                  </button>
                </div>
              </div>
            </div>
          </div>




        </div>

        {/* 右侧面板 - 已移除钱包状态，日志面板移至悬浮显示 */}
      </main>

      {/* 全局组件 */}
      <ActionButtons
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onToggleTheme={toggleTheme}
        onTestRpc={testRpcConnection}
        onToggleDebug={toggleDebugMode}
        theme={theme}
        userWallet={userWallet}
        isConnecting={isConnecting}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        debugMode={debugMode}
      />

      {/* 悬浮操作日志面板 */}
      <FloatingLogPanel
        logs={logs}
        clearLogs={clearLogs}
        exportLogs={exportLogs}
      />

      {message && <FloatingToast message={message} />}

      {showV2exResultModal && (
        <V2exResultModal
          result={v2exParseResult}
          onClose={() => setShowV2exResultModal(false)}
          onApplyAddresses={(addresses) => applyV2exAddresses(addresses, true)}
          onAddLog={addLog}
          onShowMessage={showMessage}
          defaultShowLottery={v2exParseResult?.isLotteryOperation || false}
          userWallet={userWallet}
          rpcEndpoint={rpcEndpoint}
        />
      )}

      {/* 配置模态框 */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentRpcEndpoint={rpcEndpoint}
        onSaveConfig={handleSaveConfig}
      />
    </div>
  );
}

export default App;