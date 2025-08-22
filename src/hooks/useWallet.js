import { useState, useCallback } from 'react';

export const useWallet = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [userWallet, setUserWallet] = useState(null);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      // 检查是否安装了 Phantom 钱包
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        setUserWallet({ publicKey, provider: 'phantom' });
        return { success: true, message: 'Phantom 钱包连接成功', wallet: { publicKey, provider: 'phantom' } };
      } else if (window.solflare && window.solflare.isSolflare) {
        const response = await window.solflare.connect();
        const publicKey = response.publicKey.toString();
        setUserWallet({ publicKey, provider: 'solflare' });
        return { success: true, message: 'Solflare 钱包连接成功', wallet: { publicKey, provider: 'solflare' } };
      } else {
        throw new Error('未找到支持的钱包扩展');
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
      return { success: false, message: `连接钱包失败: ${error.message}` };
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    try {
      if (userWallet?.provider === 'phantom' && window.solana) {
        window.solana.disconnect();
      } else if (userWallet?.provider === 'solflare' && window.solflare) {
        window.solflare.disconnect();
      }
      setUserWallet(null);
      return { success: true, message: '钱包已断开连接' };
    } catch (error) {
      console.error('断开连接失败:', error);
      return { success: false, message: `断开连接失败: ${error.message}` };
    }
  }, [userWallet]);

  const testWalletConnection = useCallback(async (rpcEndpoint) => {
    try {
      if (userWallet?.provider === 'phantom') {
        if (!window.solana) {
          throw new Error('Phantom 钱包未找到');
        }
        // 测试获取余额
        const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
        const connection = new Connection(rpcEndpoint, 'confirmed');
        const publicKey = new PublicKey(userWallet.publicKey);
        const balance = await connection.getBalance(publicKey);
        return { 
          success: true, 
          message: `钱包连接正常！余额: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL` 
        };
      } else if (userWallet?.provider === 'solflare') {
        if (!window.solflare) {
          throw new Error('Solflare 钱包未找到');
        }
        // 测试获取余额
        const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
        const connection = new Connection(rpcEndpoint, 'confirmed');
        const publicKey = new PublicKey(userWallet.publicKey);
        const balance = await connection.getBalance(publicKey);
        return { 
          success: true, 
          message: `钱包连接正常！余额: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL` 
        };
      } else {
        throw new Error('未知的钱包类型');
      }
    } catch (error) {
      console.error('测试钱包连接失败:', error);
      return { success: false, message: `测试失败: ${error.message}` };
    }
  }, [userWallet]);

  return {
    isConnecting,
    userWallet,
    connectWallet,
    disconnectWallet,
    testConnection: testWalletConnection
  };
};
