import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';

// 将Uint8Array转换为Base64字符串
export const arrayToBase64 = (array) => {
  const bytes = new Uint8Array(array);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// 从私钥创建Keypair（支持多种格式，包括Phantom钱包）
export const createKeypairFromPrivateKey = (privateKey) => {
  console.log('createKeypairFromPrivateKey 被调用，输入类型:', typeof privateKey);

  if (Array.isArray(privateKey)) {
    console.log('处理数组格式私钥，长度:', privateKey.length);
    // 数组格式：期望64字节；若为32字节，按seed处理
    const arr = Uint8Array.from(privateKey);
    if (arr.length === 64) {
      console.log('64字节数组，使用 fromSecretKey');
      return Keypair.fromSecretKey(arr);
    }
    if (arr.length === 32) {
      console.log('32字节数组，使用 fromSeed');
      return Keypair.fromSeed(arr);
    }
    throw new Error('数组私钥长度必须为32或64字节');
  }

  if (typeof privateKey === 'string') {
    const privateKeyStr = privateKey.trim();
    console.log('处理字符串格式私钥，长度:', privateKeyStr.length, '内容:', privateKeyStr.substring(0, 20) + '...');

    // 数组字符串
    if (privateKeyStr.startsWith('[') && privateKeyStr.endsWith(']')) {
      console.log('检测到数组字符串格式');
      const parsed = JSON.parse(privateKeyStr);
      if (!Array.isArray(parsed)) throw new Error('数组字符串解析失败');
      return createKeypairFromPrivateKey(parsed);
    }

    // 十六进制
    if (/^[0-9a-fA-F]+$/.test(privateKeyStr)) {
      console.log('检测到十六进制格式');
      if (privateKeyStr.length === 128) {
        console.log('128字符十六进制，转换为64字节');
        const bytes = new Uint8Array(64);
        for (let i = 0; i < 64; i++) bytes[i] = parseInt(privateKeyStr.substr(i * 2, 2), 16);
        return Keypair.fromSecretKey(bytes);
      }
      if (privateKeyStr.length === 64) {
        console.log('64字符十六进制，转换为32字节，使用 fromSeed');
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) bytes[i] = parseInt(privateKeyStr.substr(i * 2, 2), 16);
        return Keypair.fromSeed(bytes);
      }
    }

    // Base58（Phantom常见）
    console.log('尝试Base58解码...');
    try {
      const decoded = bs58.decode(privateKeyStr);
      console.log('Base58解码成功，长度:', decoded.length);
      if (decoded.length === 64) {
        console.log('64字节Base58，使用 fromSecretKey');
        return Keypair.fromSecretKey(decoded);
      }
      if (decoded.length === 32) {
        console.log('32字节Base58，使用 fromSeed');
        return Keypair.fromSeed(decoded);
      }
      console.log('Base58解码后长度不正确:', decoded.length);
    } catch (e) {
      console.log('Base58解码失败:', e.message);
    }

    // Base64（极少数情况）
    console.log('尝试Base64解码...');
    try {
      const decodedB64 = Uint8Array.from(atob(privateKeyStr), c => c.charCodeAt(0));
      console.log('Base64解码成功，长度:', decodedB64.length);
      if (decodedB64.length === 64) return Keypair.fromSecretKey(decodedB64);
      if (decodedB64.length === 32) return Keypair.fromSeed(decodedB64);
    } catch (e) {
      console.log('Base64解码失败:', e.message);
    }

    throw new Error('无法解析私钥，请确认格式为数组/十六进制/Base58');
  }

  throw new Error('不支持的私钥格式');
};

// 将Base64字符串转换为Uint8Array
export const base64ToArray = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// 安全的字符串截取函数
export const safeSubstring = (str, start, end) => {
  if (!str) return '';
  const strValue = String(str);
  if (strValue.length <= start) return strValue;
  return strValue.substring(start, end || strValue.length);
};

// 安全的签名处理函数
export const processSignature = (signature) => {
  if (!signature) return '';

  // 如果签名是对象，尝试提取signature属性
  if (typeof signature === 'object' && signature.signature) {
    return String(signature.signature);
  }

  // 如果签名是字符串或其他类型，直接转换
  return String(signature);
};

// 添加域名解析函数（将 .sol 域名解析为公钥）
export const resolveSolDomain = async (address) => {
  if (typeof address === 'string' && address.toLowerCase().endsWith('.sol')) {
    try {
      const response = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${address}`);
      const data = await response.json();
      if (data && data.result) {
        return data.result;
      }
      throw new Error('域名解析失败');
    } catch (error) {
      console.error('域名解析错误:', error);
      throw new Error(`域名解析失败: ${error.message}`);
    }
  }
  return address;
};

// 创建转账交易
export const createTransferTransaction = (fromPubkey, toPubkey, amount, blockhash) => {
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(fromPubkey),
      toPubkey: new PublicKey(toPubkey),
      lamports: amount
    })
  );
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(fromPubkey);
  return transaction;
};

// 创建批量转账交易
export const createBatchTransferTransaction = (fromPubkey, toPubkeys, amount, blockhash) => {
  const transaction = new Transaction();
  toPubkeys.forEach(toPubkey => {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromPubkey),
        toPubkey: new PublicKey(toPubkey),
        lamports: amount
      })
    );
  });
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(fromPubkey);
  return transaction;
};

// 计算SOL到lamports
export const solToLamports = (solAmount) => {
  return Math.floor(parseFloat(solAmount) * LAMPORTS_PER_SOL);
};

// 计算lamports到SOL
export const lamportsToSol = (lamports) => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(6);
};

// 生成随机Solana地址
export const generateRandomAddresses = (count) => {
  const addresses = [];
  for (let i = 0; i < count; i++) {
    const keypair = Keypair.generate();
    addresses.push({
      id: i + 1,
      publicKey: keypair.publicKey.toString(),
      privateKey: bs58.encode(keypair.secretKey),
      isGenerated: true
    });
  }
  return addresses;
};

// 验证Solana地址格式
export const validateSolanaAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};
