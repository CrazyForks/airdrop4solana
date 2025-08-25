# Airdrop4Solana

一个基于 Solana 区块链的空投工具，支持 V2EX 帖子解析和用户抽奖。

## 功能特性

- 🎯 V2EX 帖子解析，自动提取 Solana 地址
- 🎲 智能抽奖系统，支持打赏后接口抽奖和本地抽奖
- 💰 支持 SOL 和 V2EX 代币空投
- 🔗 批量交易处理，智能分批避免交易过大
- 📱 支持 Phantom 和 Solflare 钱包
- 🌐 多网络支持（主网、测试网、开发网）

## 抽奖系统说明

### 抽奖方式

1. **打赏后抽奖**：用户打赏后，系统自动使用接口请求执行抽奖

   - 使用交易哈希作为随机种子
   - 通过 GitHub 集成接口执行抽奖
   - 支持结果提交到 GitHub 仓库
   - 接口不可用时自动回退到本地抽奖

2. **本地抽奖**：用户选择"下次一定"时，使用本地抽奖逻辑
   - 使用时间戳作为随机种子
   - 完全本地执行，无需网络请求

### 抽奖接口配置

抽奖接口配置位于 `src/utils/lottery.js` 文件中：

```javascript
const LOTTERY_API_CONFIG = {
  BASE_URL: "http://localhost:8787",
  ENDPOINTS: {
    LOTTERY: "/",
    STATUS: "/github/status",
  },
  ENVIRONMENTS: {
    TEST: "test",
    PRODUCTION: "prod",
  },
  DEFAULT_ENVIRONMENT: "prod",
  TIMEOUT: 30000,
};
```

### 接口请求格式

打赏后的抽奖请求格式：

```javascript
{
  users: [
    { username: "用户名", publickey: "Solana地址" }
  ],
  excludeUsers: ["要排除的用户名"],
  drawCount: 抽奖数量,
  seed: "交易哈希种子",
  environment: "test|prod",
  postInfo: {
    postId: "帖子ID",
    postTitle: "帖子标题",
    postContent: "帖子内容",
    replyCount: 回复数量,
    createdAt: "创建时间",
    originalUrl: "原帖链接"
  }
}
```

## 安装和运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

## 使用说明

1. 连接 Solana 钱包（Phantom 或 Solflare）
2. 输入 V2EX 帖子链接或 ID
3. 解析帖子获取用户地址
4. 选择抽奖方式：
   - 打赏后抽奖：选择打赏金额，完成支付后自动使用接口抽奖
   - 本地抽奖：选择"下次一定"，使用本地抽奖逻辑
5. 配置抽奖参数（数量、是否排除作者等）
6. 执行抽奖
7. 应用抽奖结果进行空投

## 技术架构

- **前端框架**：React 18
- **区块链交互**：@solana/web3.js, @solana/spl-token
- **V2EX 解析**：v2ex-api-parser
- **抽奖算法**：Fisher-Yates 洗牌算法
- **接口集成**：GitHub API 集成抽奖接口

## 注意事项

- 确保抽奖接口服务正常运行（默认端口 8787）
- 打赏后的抽奖需要网络连接，接口不可用时会自动回退
- 本地抽奖完全离线，无需网络连接
- 生产环境使用前请修改接口配置为生产环境地址

## 许可证

MIT License
