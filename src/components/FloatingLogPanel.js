import React, { useState } from 'react';

const FloatingLogPanel = ({ logs, clearLogs, exportLogs }) => {
  const [copiedIndex, setCopiedIndex] = useState(-1);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // 检测是否为哈希值（长度大于40且只包含字母数字的字符串）
  const isHashValue = (text) => {
    if (typeof text !== 'string') return false;
    const hashPattern = /^[a-zA-Z0-9]{40,}$/;
    return hashPattern.test(text.trim());
  };

  // 从日志消息中提取哈希值
  const extractHashFromMessage = (message) => {
    if (typeof message !== 'string') return null;

    // 匹配"完整TX哈希: xxxxx"格式
    const hashMatch = message.match(/完整TX哈希:\s*([a-zA-Z0-9]{40,})/);
    if (hashMatch) {
      return hashMatch[1];
    }

    // 匹配其他可能的哈希格式
    const generalHashMatch = message.match(/([a-zA-Z0-9]{40,})/);
    if (generalHashMatch && isHashValue(generalHashMatch[1])) {
      return generalHashMatch[1];
    }

    return null;
  };

  // 截断哈希值显示
  const truncateHash = (hash) => {
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  // 处理日志消息显示
  const formatLogMessage = (message) => {
    const hash = extractHashFromMessage(message);
    if (hash) {
      return message.replace(hash, truncateHash(hash));
    }
    return message;
  };

  // 复制到剪贴板
  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(-1), 2000); // 2秒后重置状态
    } catch (err) {
      console.error('复制失败:', err);
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(-1), 2000);
    }
  };

  // 切换折叠状态
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 如果处于折叠状态，显示简化版本
  if (isCollapsed) {
    return (
      <div className="floating-log-panel">
        <div className="log-panel-collapsed">
          <div className="log-header-collapsed">
            <h3 className="log-title">操作日志</h3>
            <button 
              className="log-expand-btn" 
              onClick={toggleCollapse}
              title="展开日志面板"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
          <div className="log-content-collapsed">
            <div className="log-summary">
              <div className="log-summary-row">
                <div className="log-count-badge">
                  {logs.length} 条日志
                </div>
                <div className="log-actions-collapsed">
                  <button className="btn btn-secondary log-btn compact" onClick={clearLogs} title="清空日志">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                  <button className="btn btn-secondary log-btn compact" onClick={exportLogs} title="导出日志">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
              </div>
              {logs.length > 0 && (
                <div className="log-latest">
                  <div className="log-latest-header">
                    <span className="log-latest-label">最新日志</span>
                    <span className="log-latest-time">{logs[0]?.timestamp}</span>
                  </div>
                  <div className="log-latest-message">
                    {logs[0]?.message || '暂无日志'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 显示完整日志面板
  return (
    <div className="floating-log-panel">
      <div className="log-panel-expanded">
        <div className="log-header">
          <h3 className="log-title">操作日志</h3>
          <div className="log-controls">
            <button 
              className="log-collapse-btn" 
              onClick={toggleCollapse}
              title="折叠日志面板"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button className="btn btn-secondary log-btn" onClick={clearLogs} title="清空日志">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            <button className="btn btn-secondary log-btn" onClick={exportLogs} title="导出日志">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="log-content">
          {logs.length === 0 ? (
            <div className="log-empty">
              <p>暂无操作日志</p>
              <p>开始操作后会显示详细日志</p>
            </div>
          ) : (
            <div className="log-entries">
              {logs.map((log, index) => {
                const hash = extractHashFromMessage(log.message);

                return (
                  <div key={index} className={`log-entry ${log.type}`}>
                    <span className="log-timestamp">{log.timestamp}</span>
                    <div className="log-message-container">
                      <span className="log-message">{formatLogMessage(log.message)}</span>
                      {hash && (
                        <button
                          className="copy-hash-btn"
                          onClick={() => copyToClipboard(hash, index)}
                          title={copiedIndex === index ? "已复制!" : "复制完整哈希"}
                        >
                          {copiedIndex === index ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 日志数量提示 */}
              <div className="log-controls-footer">
                <div className="log-info">
                  共 {logs.length} 条日志
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingLogPanel;
