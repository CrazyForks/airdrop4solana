import React from 'react';

const Header = () => {
  return (
    <>
      {/* 顶部导航栏 */}
      <nav className="top-navbar">
        <div className="navbar-content">
          <img src="/favicon.ico" alt="Solana" className="brand-icon" />
          <div className="navbar-actions" style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: 12, opacity: 0.9 }}>非官方演示工具 · 无收益承诺</span>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>服务条款</a>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>隐私政策</a>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header;