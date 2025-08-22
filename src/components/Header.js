import React from 'react';

const Header = () => {
  return (
    <>
      {/* 顶部导航栏 */}
      <nav className="top-navbar">
        <div className="navbar-content">
          <img src="/favicon.ico" alt="Solana" className="brand-icon" />
          <div className="navbar-actions">
            {/* 这里可以放置一些顶部操作按钮 */}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header;