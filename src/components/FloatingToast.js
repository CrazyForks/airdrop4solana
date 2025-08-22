import React from 'react';

const FloatingToast = ({ message }) => {
  if (!message) return null;

  const { content, type } = message;

  return (
    <div className={`toast ${type || 'info'}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className="toast-message">{content}</span>
        <button
          className="toast-close"
          title="关闭通知"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default FloatingToast;
