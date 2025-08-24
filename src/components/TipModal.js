import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import joeTreatsData from '../data/joe_treats.json';
import joeActionsData from '../data/joe_actions.json';

const TipModal = ({ isOpen, onClose, onTipComplete, userWallet, rpcEndpoint, onAddLog, onShowMessage, connectWallet }) => {
    const [selectedTip, setSelectedTip] = useState(null);
    const [isPaying, setIsPaying] = useState(false);
    const [randomTreat, setRandomTreat] = useState(null);

    // Joe的收款地址 - 这里需要设置实际的地址
    const JOE_RECEIVER_ADDRESS = 'H5uYBn9MSrMTEz9deLDGBe9eczsfzXjZjX1xVcB6FJgU';

    // 根据金额获取Joe的动作
    const getJoeActionByAmount = (amount) => {
        const amountStr = amount.toString();
        return joeActionsData[amountStr] || `Joe为您准备了${amount} SOL的特别表演`;
    };

    // 随机选择打赏选项
    useEffect(() => {
        if (isOpen && !randomTreat) {
            const randomIndex = Math.floor(Math.random() * joeTreatsData.length);
            setRandomTreat(joeTreatsData[randomIndex]);
        }
    }, [isOpen, randomTreat]);

    // 关闭模态框时重置状态
    useEffect(() => {
        if (!isOpen) {
            setSelectedTip(null);
            setIsPaying(false);
            setRandomTreat(null);
        }
    }, [isOpen]);

    // 创建支付交易
    const createPaymentTransaction = async (amount, memoText, fromFeePayer = true) => {
        try {
            console.log('Creating transaction with amount:', amount, 'memo:', memoText);
            const connection = new Connection(rpcEndpoint, 'confirmed');
            const fromPubkey = new PublicKey(userWallet.publicKey);
            const toPubkey = new PublicKey(JOE_RECEIVER_ADDRESS);

            const transaction = new Transaction();

            // 添加转账指令
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: fromPubkey,
                    toPubkey: toPubkey,
                    lamports: Math.floor(parseFloat(amount) * 1000000000) // SOL to lamports
                })
            );

            // 暂时移除memo指令，先测试基本支付
            console.log('Basic transfer instruction added');

            // 获取最新blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            if (fromFeePayer) {
                transaction.feePayer = fromPubkey;
            } else {
                transaction.feePayer = toPubkey;
            }

            console.log('Transaction created successfully');
            return transaction;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw new Error(`创建交易失败: ${error.message}`);
        }
    };

    // 使用指定钱包信息执行支付
    const executePaymentWithWallet = async (walletInfo, amount, memoText, fromFeePayer = true) => {
        console.log('Using wallet info:', walletInfo);
        console.log('Window solana:', window.solana);
        console.log('Window solflare:', window.solflare);

        if (!walletInfo || !walletInfo.publicKey) {
            onShowMessage('钱包信息无效', 'error');
            return null;
        }

        setIsPaying(true);
        onAddLog(`开始支付 ${amount} SOL...`, 'info');

        try {
            onAddLog(`创建支付交易...`, 'info');
            const transaction = await createPaymentTransaction(amount, memoText, fromFeePayer);
            onAddLog(`交易创建成功，准备发送...`, 'info');

            let signature;

            if (walletInfo.provider === 'phantom') {
                if (!window.solana) {
                    throw new Error('Phantom 钱包未找到');
                }

                onAddLog(`正在通过 Phantom 钱包支付...`, 'info');
                console.log('Calling window.solana.signAndSendTransaction');

                // 简化调用
                const result = await window.solana.signAndSendTransaction(transaction);
                console.log('Phantom result:', result);

                signature = typeof result === 'string' ? result : result.signature;

            } else if (walletInfo.provider === 'solflare') {
                if (!window.solflare) {
                    throw new Error('Solflare 钱包未找到');
                }

                onAddLog(`正在通过 Solflare 钱包支付...`, 'info');
                console.log('Calling window.solflare.signAndSendTransaction');

                const result = await window.solflare.signAndSendTransaction(transaction);
                console.log('Solflare result:', result);

                signature = typeof result === 'string' ? result : result.signature;

            } else {
                throw new Error(`不支持的钱包类型: ${walletInfo.provider}`);
            }

            const signatureStr = processSignature(signature);
            console.log('Final signature:', signatureStr);

            onAddLog(`支付完成！交易哈希: ${signatureStr}`, 'success');
            onShowMessage(`支付成功！交易哈希: ${signatureStr}`, 'success');

            return signatureStr;

        } catch (error) {
            console.error('Payment error:', error);
            onAddLog(`支付失败: ${error.message}`, 'error');
            onShowMessage(`支付失败: ${error.message}`, 'error');
            return null;
        } finally {
            setIsPaying(false);
        }
    };

    // 执行支付 - 简化版本用于测试
    const executePayment = async (amount, memoText, fromFeePayer = true) => {
        console.log('User wallet:', userWallet);
        console.log('Window solana:', window.solana);
        console.log('Window solflare:', window.solflare);

        if (!userWallet || !userWallet.publicKey) {
            onShowMessage('请先连接钱包', 'error');
            return null;
        }

        setIsPaying(true);
        onAddLog(`开始支付 ${amount} SOL...`, 'info');

        try {
            onAddLog(`创建支付交易...`, 'info');
            const transaction = await createPaymentTransaction(amount, memoText, fromFeePayer);
            onAddLog(`交易创建成功，准备发送...`, 'info');

            let signature;

            if (userWallet.provider === 'phantom') {
                if (!window.solana) {
                    throw new Error('Phantom 钱包未找到');
                }

                onAddLog(`正在通过 Phantom 钱包支付...`, 'info');
                console.log('Calling window.solana.signAndSendTransaction');

                // 简化调用
                const result = await window.solana.signAndSendTransaction(transaction);
                console.log('Phantom result:', result);

                signature = typeof result === 'string' ? result : result.signature;

            } else if (userWallet.provider === 'solflare') {
                if (!window.solflare) {
                    throw new Error('Solflare 钱包未找到');
                }

                onAddLog(`正在通过 Solflare 钱包支付...`, 'info');
                console.log('Calling window.solflare.signAndSendTransaction');

                const result = await window.solflare.signAndSendTransaction(transaction);
                console.log('Solflare result:', result);

                signature = typeof result === 'string' ? result : result.signature;

            } else {
                throw new Error(`不支持的钱包类型: ${userWallet.provider}`);
            }

            const signatureStr = processSignature(signature);
            console.log('Final signature:', signatureStr);

            onAddLog(`支付完成！交易哈希: ${signatureStr}`, 'success');
            onShowMessage(`支付成功！交易哈希: ${signatureStr}`, 'success');

            return signatureStr;

        } catch (error) {
            console.error('Payment error:', error);
            onAddLog(`支付失败: ${error.message}`, 'error');
            onShowMessage(`支付失败: ${error.message}`, 'error');
            return null;
        } finally {
            setIsPaying(false);
        }
    };

    // 处理打赏选择
    const handleTipSelection = async (tipType, amount, memoText) => {
        setSelectedTip(tipType);

        if (tipType === 'skip') {
            // 第三项：直接关闭，使用时间戳作为种子
            onAddLog(`下次一定, 我可记住了哦`, 'info');
            const timestamp = Date.now().toString();
            onTipComplete(timestamp, tipType);
            onClose();
            return;
        }

                // 前两项：执行支付前先检查钱包连接状态
        if (!userWallet || !userWallet.publicKey) {
            onAddLog('用户尝试打赏但钱包未连接，正在自动连接钱包...', 'info');
            onShowMessage('正在连接钱包...', 'info');
            
            try {
                // 自动连接钱包
                const result = await connectWallet();
                onAddLog('钱包连接成功，继续打赏流程', 'success');
                onShowMessage('钱包连接成功！', 'success');
                
                // 等待一下让钱包状态更新
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 延时1秒后继续执行打赏操作
                onAddLog('延时1秒后继续执行打赏操作...', 'info');
                
                // 使用连接结果中的钱包信息，而不是依赖可能未更新的状态
                if (result && result.success && result.wallet) {
                    onAddLog('使用连接结果中的钱包信息继续执行...', 'info');
                    // 直接使用连接结果中的钱包信息执行支付
                    const txHash = await executePaymentWithWallet(result.wallet, amount, memoText);
                    if (txHash) {
                        // 支付成功，记录打赏完成日志
                        const actionDescription = getJoeActionByAmount(amount);
                        onAddLog(`打赏完成: ${actionDescription}`, 'success');
                        // 使用交易哈希作为种子
                        onTipComplete(txHash, tipType);
                        onClose();
                    } else {
                        // 支付失败，重置选择状态
                        setSelectedTip(null);
                    }
                    return; // 已经处理完成，直接返回
                }
            } catch (error) {
                onAddLog(`自动连接钱包失败: ${error.message}`, 'error');
                onShowMessage('自动连接钱包失败，请手动连接', 'error');
                setSelectedTip(null);
                return;
            }
        }
        
        // 前两项：执行支付（使用当前状态中的钱包信息）
        const txHash = await executePayment(amount, memoText, false);
        if (txHash) {
            // 支付成功，记录打赏完成日志
            const actionDescription = getJoeActionByAmount(amount);
            onAddLog(`打赏完成: ${actionDescription}`, 'success');

            // 使用交易哈希作为种子
            onTipComplete(txHash, tipType);
            onClose();
        } else {
            // 支付失败，重置选择状态
            setSelectedTip(null);
        }
    };

    // 辅助函数：处理签名
    const processSignature = (signature) => {
        if (typeof signature === 'string') {
            return signature;
        } else if (signature && signature.signature) {
            return signature.signature;
        }
        return signature;
    };

    // 如果模态框未打开，不渲染
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content tip-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <svg className="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                        想请Joe干点什么吗?
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="tip-description">
                        <p> 您选择的行为将决定Joe的谄媚方式：</p>
                        <p className="tip-note">您花费的SOL将用于支持Joe的谄媚行为，抽奖结果将基于您的选择生成随机种子。</p>
                    </div>

                    <div className="tip-options">
                        {/* 第一项：白开水 */}
                        <div className="tip-option">
                            <button
                                className={`tip-button ${selectedTip === 'water' ? 'selected' : ''}`}
                                onClick={() => handleTipSelection('water', '0.002', '请Joe喝一杯白开水')}
                                disabled={isPaying}
                            >
                                <div className="tip-content">
                                    <div className="tip-text">请Joe喝一杯白开水</div>
                                    <div className="tip-amount">(0.002 SOL)</div>
                                </div>
                                {selectedTip === 'water' && isPaying && (
                                    <div className="loading-spinner"></div>
                                )}
                            </button>
                        </div>

                        {/* 第二项：随机打赏 */}
                        {randomTreat && (
                            <div className="tip-option">
                                <button
                                    className={`tip-button ${selectedTip === 'treat' ? 'selected' : ''}`}
                                    onClick={() => handleTipSelection('treat', randomTreat.amount.toString(), `请Joe${randomTreat.title}`)}
                                    disabled={isPaying}
                                >
                                    <div className="tip-content">
                                        <div className="tip-text">请Joe{randomTreat.title}</div>
                                        <div className="tip-amount">({randomTreat.amount} SOL)</div>
                                    </div>
                                    {selectedTip === 'treat' && isPaying && (
                                        <div className="loading-spinner"></div>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* 第三项：跳过 */}
                        <div className="tip-option">
                            <button
                                className={`tip-button skip-button ${selectedTip === 'skip' ? 'selected' : ''}`}
                                onClick={() => handleTipSelection('skip', '0', '今天没空，下次一定！')}
                                disabled={isPaying}
                            >
                                <div className="tip-content">
                                    <div className="tip-text">今天没空，下次一定！</div>
                                    <div className="tip-amount">(免费)</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {isPaying && (
                        <div className="payment-status">
                            <p>正在处理支付，请在钱包中确认交易...</p>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
};

export default TipModal;
