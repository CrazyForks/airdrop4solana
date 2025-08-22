/**
 * 抽楼工具类
 * 用于从用户列表中随机选择指定数量的用户
 */

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
