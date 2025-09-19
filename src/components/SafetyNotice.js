import React from 'react';

const SafetyNotice = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      maxWidth: 420,
      padding: '12px 14px',
      background: 'var(--bg-card, rgba(0,0,0,0.6))',
      color: 'var(--text-secondary, #ddd)',
      border: '1px solid var(--border-primary, rgba(255,255,255,0.15))',
      borderRadius: 10,
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      fontSize: 12,
      lineHeight: 1.5
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary, #fff)', marginBottom: 6 }}>安全与合规提示</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>本工具不收集助记词/私钥，签名均在您的钱包扩展中完成。</li>
        <li>本工具为演示用途，不承诺收益或回报，请谨慎操作。</li>
        <li>
          使用前请阅读
          {' '}<a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary, #5aa9ff)' }}>服务条款</a>
          {' '}与{' '}
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary, #5aa9ff)' }}>隐私政策</a>。
        </li>
      </ul>
    </div>
  );
};

export default SafetyNotice;
