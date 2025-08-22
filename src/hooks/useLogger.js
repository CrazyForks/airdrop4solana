import { useState, useCallback } from 'react';
import { createLogEntry, limitLogs } from '../utils/logger';

export const useLogger = () => {
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((message, type = 'info') => {
    const newLog = createLogEntry(message, type);
    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs]; // 新日志放在最前面
      return limitLogs(updatedLogs, 200); // 限制日志数量，保留最近200条
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    const { exportLogs: exportLogsUtil } = require('../utils/logger');
    return exportLogsUtil(logs);
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    exportLogs
  };
};
