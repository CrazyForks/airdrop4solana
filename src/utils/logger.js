// 添加日志条目
export const createLogEntry = (message, type = 'info') => {
  return {
    id: Date.now() + Math.random(), // 使用时间戳+随机数确保唯一性
    message,
    type,
    timestamp: new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };
};

// 导出日志
export const exportLogs = (logs) => {
  const logText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
  const dataBlob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `airdrop-logs-${new Date().toISOString().split('T')[0]}.txt`;
  link.click();
  URL.revokeObjectURL(dataBlob);
  return '日志已导出';
};

// 限制日志数量
export const limitLogs = (logs, maxCount = 200) => {
  if (logs.length > maxCount) {
    return logs.slice(0, maxCount);
  }
  return logs;
};
