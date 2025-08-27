/**
 * 抽楼工具类
 * 用于从用户列表中随机选择指定数量的用户
 */

// 抽奖接口配置
const LOTTERY_API_CONFIG = {
    // 接口基础URL
    BASE_URL: 'https://lottey.grabcoffee.cc/',
    // BASE_URL: 'http://localhost:61191/',

    // 接口端点
    ENDPOINTS: {
        LOTTERY: '',
        STATUS: 'github/status',
        VERIFY: 'verify'
    },

    // 环境配置
    ENVIRONMENTS: {
        TEST: 'test',
        PRODUCTION: 'prod'
    },

    // 默认环境
    DEFAULT_ENVIRONMENT: 'prod',

    // 请求超时时间（毫秒）
    TIMEOUT: 30000
};

/**
 * 抽楼函数
 * @param {Object} options - 抽楼选项
 * @param {Array} options.allUsers - 所有参与的用户数组
 * @param {Array} options.excludeUsers - 需要排除的用户名数组（可选）
 * @param {number} options.count - 需要抽取的用户数量
 * @param {string|number} options.seed - 随机数种子（可选），用于保证结果可重现
 * @returns {Array} 选中的用户数组
 */
export const drawUsers = ({ allUsers, excludeUsers = [], count, seed = null }) => {
    // 参数验证
    if (!Array.isArray(allUsers) || allUsers.length === 0) {
        throw new Error('allUsers必须是有效的用户数组');
    }

    if (!Array.isArray(excludeUsers)) {
        throw new Error('excludeUsers必须是数组');
    }

    if (!Number.isInteger(count) || count <= 0) {
        throw new Error('count必须是正整数');
    }

    if (count > allUsers.length) {
        throw new Error(`抽取数量(${count})不能超过总用户数(${allUsers.length})`);
    }

    // 过滤掉需要排除的用户
    const availableUsers = allUsers.filter(user => {
        const username = typeof user === 'string' ? user : user.userId;
        return !excludeUsers.includes(username);
    });

    if (availableUsers.length === 0) {
        throw new Error('过滤后没有可用的用户');
    }

    if (count > availableUsers.length) {
        throw new Error(`抽取数量(${count})不能超过可用用户数(${availableUsers.length})`);
    }

    // 设置随机数种子（如果提供）
    if (seed !== null) {
        setRandomSeed(seed);
    }

    // 随机抽取用户
    const selectedUsers = [];
    const shuffledUsers = [...availableUsers];

    // Fisher-Yates 洗牌算法
    for (let i = shuffledUsers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledUsers[i], shuffledUsers[j]] = [shuffledUsers[j], shuffledUsers[i]];
    }

    // 选择前count个用户
    selectedUsers.push(...shuffledUsers.slice(0, count));

    // 重置随机数种子
    if (seed !== null) {
        resetRandomSeed();
    }

    return selectedUsers;
};

/**
 * 设置随机数种子
 * @param {string|number} seed - 随机数种子
 */
let originalRandom = null;

const setRandomSeed = (seed) => {
    // 保存原始的Math.random
    if (!originalRandom) {
        originalRandom = Math.random;
    }

    // 创建基于种子的伪随机数生成器
    const seedNum = typeof seed === 'string' ? hashString(seed) : seed;
    let currentSeed = seedNum;

    Math.random = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        return currentSeed / 233280;
    };
};

/**
 * 重置随机数种子
 */
const resetRandomSeed = () => {
    if (originalRandom) {
        Math.random = originalRandom;
        originalRandom = null;
    }
};

/**
 * 简单的字符串哈希函数
 * @param {string} str - 输入字符串
 * @returns {number} 哈希值
 */
const hashString = (str) => {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash);
};

/**
 * 批量抽楼函数（支持多次抽楼）
 * @param {Object} options - 抽楼选项
 * @param {Array} options.allUsers - 所有参与的用户数组
 * @param {Array} options.excludeUsers - 需要排除的用户名数组（可选）
 * @param {Array} options.draws - 多次抽楼的配置数组，每个元素包含count和seed
 * @returns {Array} 多次抽楼的结果数组
 */
export const batchDrawUsers = ({ allUsers, excludeUsers = [], draws }) => {
    if (!Array.isArray(draws) || draws.length === 0) {
        throw new Error('draws必须是有效的抽楼配置数组');
    }

    const results = [];

    for (let i = 0; i < draws.length; i++) {
        const draw = draws[i];
        try {
            const selectedUsers = drawUsers({
                allUsers,
                excludeUsers,
                count: draw.count,
                seed: draw.seed || null
            });

            results.push({
                drawIndex: i + 1,
                count: draw.count,
                seed: draw.seed || null,
                selectedUsers,
                success: true
            });
        } catch (error) {
            results.push({
                drawIndex: i + 1,
                count: draw.count,
                seed: draw.seed || null,
                selectedUsers: [],
                success: false,
                error: error.message
            });
        }
    }

    return results;
};

/**
 * 验证抽楼参数
 * @param {Object} options - 抽楼选项
 * @returns {Object} 验证结果
 */
export const validateDrawOptions = ({ allUsers, excludeUsers = [], count, seed = null }) => {
    const errors = [];
    const warnings = [];

    // 检查必需参数
    if (!Array.isArray(allUsers) || allUsers.length === 0) {
        errors.push('allUsers必须是有效的用户数组');
    }

    if (!Array.isArray(excludeUsers)) {
        errors.push('excludeUsers必须是数组');
    }

    if (!Number.isInteger(count) || count <= 0) {
        errors.push('count必须是正整数');
    }

    // 检查逻辑关系
    if (Array.isArray(allUsers) && Array.isArray(excludeUsers) && Number.isInteger(count)) {
        const availableUsers = allUsers.filter(user => {
            const username = typeof user === 'string' ? user : user.userId;
            return !excludeUsers.includes(username);
        });

        if (count > availableUsers.length) {
            errors.push(`抽取数量(${count})不能超过可用用户数(${availableUsers.length})`);
        }

        if (excludeUsers.length > 0) {
            warnings.push(`将排除 ${excludeUsers.length} 个用户`);
        }

        if (availableUsers.length < allUsers.length) {
            warnings.push(`可用用户数: ${availableUsers.length}/${allUsers.length}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * 执行抽奖函数
 * @param {Array} addresses - 地址数组
 * @param {number} count - 抽奖数量
 * @param {string|number} seed - 随机种子（可选）
 * @returns {Array} 抽奖结果
 */
export const performLottery = (addresses, count, seed = null) => {
    if (!Array.isArray(addresses) || addresses.length === 0) {
        throw new Error('地址数组不能为空');
    }

    if (!Number.isInteger(count) || count <= 0) {
        throw new Error('抽奖数量必须是正整数');
    }

    if (count > addresses.length) {
        throw new Error(`抽奖数量(${count})不能超过地址总数(${addresses.length})`);
    }

    // 使用现有的抽楼逻辑
    const allUsers = addresses.map(addr => ({
        userId: addr.publicKey || addr,
        address: addr.publicKey || addr,
        ...addr
    }));

    return drawUsers({
        allUsers,
        excludeUsers: [],
        count,
        seed
    });
};

/**
 * 通过接口请求执行抽奖（打赏后的抽奖）
 * @param {Object} options - 抽奖选项
 * @param {Array} options.users - 用户数组
 * @param {Array} options.excludeUsers - 需要排除的用户名数组（可选）
 * @param {number} options.drawCount - 抽奖数量
 * @param {string|number} options.seed - 随机种子
 * @param {string} options.environment - 环境（test或prod）
 * @param {Object} options.postInfo - 帖子信息
 * @returns {Promise<Object>} 抽奖结果
 */
export const executeLotteryViaAPI = async (options) => {
    try {
        const {
            users,
            excludeUsers = [],
            drawCount,
            seed,
            environment = LOTTERY_API_CONFIG.DEFAULT_ENVIRONMENT,
            postInfo = {}
        } = options;

        // 验证参数
        if (!Array.isArray(users) || users.length === 0) {
            throw new Error('用户数组不能为空');
        }

        if (!Number.isInteger(drawCount) || drawCount <= 0) {
            throw new Error('抽奖数量必须是正整数');
        }

        if (!seed) {
            throw new Error('随机种子不能为空');
        }
        // 准备请求数据
        const requestData = {
            users: users.map(user => {
                const username = user.userId || user.username || `用户${users.indexOf(user) + 1}`;
                const publickey = user.address || user.publicKey || '';

                // 验证字段有效性
                if (!username || username.trim() === '') {
                    throw new Error(`用户 ${users.indexOf(user) + 1} 缺少有效的username字段`);
                }
                if (!publickey || publickey.trim() === '') {
                }

                return {
                    username: username.trim(),
                    publickey: publickey.trim()
                };
            }),
            excludeUsers,
            drawCount,
            seed,
            environment,
            postInfo: {
                postId: postInfo.postId || '',
                postTitle: postInfo.title || '', // 接口期望的是 postTitle 字段
                postContent: postInfo.content || '', // 接口期望的是 postContent 字段
                replyCount: postInfo.replyCount || 0,
                createdAt: postInfo.createdAt || new Date().toISOString(),
                originalUrl: postInfo.sourceUrl || ''
            }
        };

        console.log('🎲 准备发送抽奖请求:', requestData);
        console.log('🔍 请求URL:', `${LOTTERY_API_CONFIG.BASE_URL}${LOTTERY_API_CONFIG.ENDPOINTS.LOTTERY}`);
        console.log('📋 请求头:', { 'Content-Type': 'application/json' });
        console.log('📦 请求体大小:', JSON.stringify(requestData).length, '字符');

        // 添加用户字段映射调试信息
        console.log('👥 用户字段映射详情:');
        requestData.users.forEach((user, index) => {
            console.log(`  用户${index + 1}: username="${user.username}", publickey="${user.publickey}"`);
        });

        // 发送抽奖请求
        const response = await fetch(`${LOTTERY_API_CONFIG.BASE_URL}${LOTTERY_API_CONFIG.ENDPOINTS.LOTTERY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            console.error('❌ HTTP响应错误:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                headers: Object.fromEntries(response.headers.entries())
            });

            // 尝试读取错误响应体
            let errorBody = '';
            try {
                errorBody = await response.text();
                console.error('❌ 错误响应体:', errorBody);
            } catch (e) {
                console.error('❌ 无法读取错误响应体:', e.message);
            }

            throw new Error(`HTTP错误: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`);
        }

        const result = await response.json();
        console.log('✅ 接口响应成功:', result);

        if (!result.success) {
            throw new Error(`抽奖失败: ${result.message || '未知错误'}`);
        }

        console.log('✅ 抽奖接口请求成功:', result);

        // 处理抽奖结果
        const winners = result.winners || [];

        // 将接口返回的中奖用户信息映射回原始用户数据
        const mappedWinners = winners.map(winner => {
            const originalUser = users.find(user =>
                (user.userId === winner.username) ||
                (user.username === winner.username) ||
                (user.address === winner.publickey) ||
                (user.publicKey === winner.publickey)
            );

            return {
                ...originalUser,
                username: winner.username,
                address: winner.publickey,
                publicKey: winner.publickey
            };
        });

        // 返回处理后的结果
        return {
            success: true,
            winners: mappedWinners,
            totalUsers: users.length,
            drawCount,
            seed,
            environment,
            githubCommit: result.githubCommit || null,
            rawResult: result
        };

    } catch (error) {
        console.error('❌ 抽奖接口请求失败:', error);
        return {
            success: false,
            error: error.message,
            winners: [],
            totalUsers: options.users ? options.users.length : 0,
            drawCount: options.drawCount,
            seed: options.seed,
            environment: options.environment
        };
    }
};

/**
 * 检查抽奖接口状态
 * @returns {Promise<Object>} 接口状态
 */
export const checkLotteryAPIStatus = async () => {
    try {
        const response = await fetch(`${LOTTERY_API_CONFIG.BASE_URL}${LOTTERY_API_CONFIG.ENDPOINTS.STATUS}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.error('❌ 状态检查HTTP响应错误:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ 状态检查响应成功:', result);
        return result;

    } catch (error) {
        console.error('❌ 检查抽奖接口状态失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 导出抽奖接口配置
export { LOTTERY_API_CONFIG };
