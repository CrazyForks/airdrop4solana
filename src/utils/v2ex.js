// 导入V2EX解析器
import V2exParser from 'v2ex-api-parser';

// 创建V2EX解析器实例
const v2exParser = new V2exParser();
v2exParser.setBaseUrl('https://v2ex.grabcoffee.cc');

/**
 * 解析V2EX帖子并提取Solana地址
 * @param {string} input - V2EX帖子链接或ID
 * @param {Object} options - 解析选项
 * @returns {Promise<Object>} 解析结果
 */
export const parseV2exPost = async (input, options = {}) => {
  try {
    let postId, sourceUrl;

    // 解析输入，支持帖子ID或完整URL
    if (input.includes('/t/')) {
      // 从URL中提取帖子ID
      const urlMatch = input.match(/\/t\/(\d+)/);
      if (!urlMatch) {
        throw new Error('无法从URL中提取帖子ID，请确保是有效的V2EX帖子链接');
      }
      postId = urlMatch[1];
      sourceUrl = input.trim();
    } else if (/^\d+$/.test(input.trim())) {
      // 直接输入的是帖子ID
      postId = input.trim();
      sourceUrl = `https://www.v2ex.com/t/${postId}`;
    } else {
      throw new Error('请输入有效的V2EX帖子链接或帖子ID（纯数字）');
    }

    // 使用v2ex-api-parser解析帖子
    const postInfo = await v2exParser.parsePost(postId, {
      useMultiPage: true,  // 支持多页帖子
      timeout: options.timeout || 15000        // 15秒超时
    });

    // 提取所有回复中的Solana地址
    const allAddresses = new Set();
    const allDomains = new Set();
    const detailedReplies = [];

    // 从帖子内容中提取地址（直接使用返回的数据）
    if (postInfo.content) {
      // 如果帖子内容中已经有解析好的Solana地址，直接使用
      if (postInfo.solanaAddresses && postInfo.solanaAddresses.length > 0) {
        postInfo.solanaAddresses.forEach(addr => allAddresses.add(addr));
      }
      if (postInfo.solanaDomains && postInfo.solanaDomains.length > 0) {
        postInfo.solanaDomains.forEach(domain => allDomains.add(domain));
      }
    }

    // 从所有回复中提取地址并构建详细回复信息（直接使用返回的数据）
    if (postInfo.replies && postInfo.replies.length > 0) {
      for (let i = 0; i < postInfo.replies.length; i++) {
        const reply = postInfo.replies[i];

        // 直接使用返回数据中的Solana地址信息
        const replySolanaAddresses = reply.solanaAddresses || [];
        const replySolanaDomains = reply.solanaDomains || [];

        // 添加到总地址集合
        replySolanaAddresses.forEach(addr => allAddresses.add(addr));
        replySolanaDomains.forEach(domain => allDomains.add(domain));

        // 获取有效的用户ID
        let userId = '未知用户';
        if (reply.author) {
          if (typeof reply.author === 'string') {
            userId = reply.author.trim() || '未知用户';
          } else if (reply.author.id) {
            userId = reply.author.id.trim() || '未知用户';
          } else if (reply.author.name) {
            userId = reply.author.name.trim() || '未知用户';
          }
        }

        // 构建详细回复信息
        detailedReplies.push({
          floor: reply.floor || (i + 1), // 使用返回的楼层号，如果没有则使用索引
          userId: userId,
          content: reply.content || '',
          solanaAddresses: replySolanaAddresses,
          solanaDomains: replySolanaDomains,
          replyTime: reply.time || reply.created || null,
          hasSolanaInfo: replySolanaAddresses.length > 0 || replySolanaDomains.length > 0
        });
      }
    }

    // 转换为数组并去重
    const uniqueAddresses = Array.from(allAddresses);
    const uniqueDomains = Array.from(allDomains);

    // 构建解析结果
    return {
      title: postInfo.title,
      postId: postId,
      sourceUrl: sourceUrl,
      content: postInfo.content || '', // 添加帖子内容
      addresses: uniqueAddresses,
      domains: uniqueDomains,
      replyCount: postInfo.replies ? postInfo.replies.length : 0,
      author: postInfo.author ? (postInfo.author.name || postInfo.author.id || '未知') : '未知',
      statistics: postInfo.statistics || {},
      detailedReplies: detailedReplies,
      success: true
    };

  } catch (error) {
    console.error('V2EX解析失败:', error);
    return {
      success: false,
      error: error.message,
      addresses: [],
      domains: [],
      detailedReplies: []
    };
  }
};

/**
 * 批量解析用户信息并提取Solana地址
 * @param {Array} usernames - 用户名数组
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<Object>} 解析结果
 */
export const batchParseUserInfo = async (usernames, onProgress = null) => {
  try {
    const total = usernames.length;

    // 使用v2ex-api-parser的批量解析接口
    const batchResults = await v2exParser.parseMultipleUsers(usernames, {
      timeout: 15000,
      delay: 1000,
      retryCount: 2,
      showProgress: true,
      onProgress: onProgress ? (progressInfo) => {
        const { currentIndex, totalUsers, username, status, message, userInfo } = progressInfo;

        // 根据状态类型提供不同的进度信息
        switch (status) {
          case "start": // 开始解析用户
            onProgress({
              current: currentIndex,
              total: totalUsers,
              username: username,
              status: 'start',
              message: `开始解析用户: ${username}`,
              percentage: Math.round((currentIndex / totalUsers) * 100)
            });
            break;
          case "success": // 解析成功
            onProgress({
              current: currentIndex,
              total: totalUsers,
              username: username,
              status: 'success',
              message: `成功解析用户: ${username}`,
              userInfo: userInfo,
              percentage: Math.round((currentIndex / totalUsers) * 100)
            });
            break;
          case "retry": // 重试中
            onProgress({
              current: currentIndex,
              total: totalUsers,
              username: username,
              status: 'retry',
              message: `重试解析用户: ${username}`,
              percentage: Math.round((currentIndex / totalUsers) * 100)
            });
            break;
          case "error": // 最终失败
            onProgress({
              current: currentIndex,
              total: totalUsers,
              username: username,
              status: 'error',
              message: `解析失败用户: ${username}`,
              percentage: Math.round((currentIndex / totalUsers) * 100)
            });
            break;
          case "complete": // 全部完成
            onProgress({
              current: totalUsers,
              total: totalUsers,
              username: '',
              status: 'complete',
              message: '所有用户解析完成',
              percentage: 100
            });
            break;
          default:
            break;
        }
      } : null
    });

    // 处理批量解析结果，提取Solana地址
    const results = [];

    for (const userResult of batchResults || []) {
      try {
        if (!userResult.success) {
          // 解析失败的用户
          results.push({
            username: userResult.username,
            bio: '',
            website: '',
            solanaAddresses: [],
            solanaDomains: [],
            hasSolanaInfo: false,
            success: false,
            error: userResult.error || '解析失败'
          });
          continue;
        }

        const userInfo = userResult.data;
        let solanaAddresses = [];
        let solanaDomains = [];

        // 直接使用API返回的Solana地址（优先级最高）
        if (userInfo.solanaAddress) {
          solanaAddresses.push(userInfo.solanaAddress);
        }
        if (userInfo.solanaDomain) {
          solanaDomains.push(userInfo.solanaDomain);
        }

        // 从用户简介中提取Solana地址（作为补充）
        if (userInfo.bio) {
          const bioAddresses = v2exParser.extractSolanaAddressesFromText(userInfo.bio);
          bioAddresses.solanaAddresses.forEach(addr => {
            if (!solanaAddresses.includes(addr)) solanaAddresses.push(addr);
          });
          bioAddresses.solanaDomains.forEach(domain => {
            if (!solanaDomains.includes(domain)) solanaDomains.push(domain);
          });
        }

        // 从用户网站信息中提取Solana地址（作为补充）
        if (userInfo.website) {
          const websiteAddresses = v2exParser.extractSolanaAddressesFromText(userInfo.website);
          websiteAddresses.solanaAddresses.forEach(addr => {
            if (!solanaAddresses.includes(addr)) solanaAddresses.push(addr);
          });
          websiteAddresses.solanaDomains.forEach(domain => {
            if (!solanaDomains.includes(domain)) solanaDomains.push(domain);
          });
        }

        // 从用户的其他文本字段中提取（作为补充）
        if (userInfo.tagline) {
          const taglineAddresses = v2exParser.extractSolanaAddressesFromText(userInfo.tagline);
          taglineAddresses.solanaAddresses.forEach(addr => {
            if (!solanaAddresses.includes(addr)) solanaAddresses.push(addr);
          });
          taglineAddresses.solanaDomains.forEach(domain => {
            if (!solanaDomains.includes(domain)) solanaDomains.push(domain);
          });
        }

        results.push({
          username: userResult.username,
          bio: userInfo.bio || '',
          website: userInfo.website || '',
          tagline: userInfo.tagline || '',
          solanaAddresses: solanaAddresses,
          solanaDomains: solanaDomains,
          hasSolanaInfo: solanaAddresses.length > 0 || solanaDomains.length > 0,
          success: true
        });

      } catch (error) {
        console.warn(`处理用户 ${userResult.username} 数据失败:`, error);
        results.push({
          username: userResult.username || '',
          bio: '',
          website: '',
          solanaAddresses: [],
          solanaDomains: [],
          hasSolanaInfo: false,
          success: false,
          error: error.message
        });
      }
    }

    // 检查批量解析是否成功（通过检查batchResults本身是否为有效数组）
    const hasResults = Array.isArray(batchResults) && batchResults.length > 0;

    // 计算成功和失败的数量
    const completed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: hasResults,
      results: results,
      total: total,
      completed: completed,
      failed: failed,
      error: hasResults ? null : '批量解析未返回有效结果'
    };

  } catch (error) {
    console.error('批量解析用户信息失败:', error);
    return {
      success: false,
      error: error.message,
      results: [],
      total: usernames.length,
      completed: 0,
      failed: usernames.length
    };
  }
};