import React from 'react';

function AddressManagementTab({
  addressSource,
  setAddressSource,
  manualAddresses,
  setManualAddresses,
  airdropCount,
  setAirdropCount,
  targetAddresses,
  onGenerateNewAddresses,
  onParseManualAddresses,
  onClearManualAddresses,
  onExportTargetAddresses
}) {
  return (
    <>
      {/* 地址来源选择 */}
      <div className="feature-card compact-source-selection">
        <div className="feature-header compact">
          <h2 className="feature-title">选择地址来源</h2>
          <p className="feature-description">选择空投目标地址的来源方式</p>
        </div>

        <div className="compact-option-cards">
          <div
            className={`compact-option-card ${addressSource === 'manual' ? 'selected' : ''}`}
            onClick={() => setAddressSource('manual')}
          >
            <div className="compact-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div className="compact-option-content">
              <h3 className="compact-option-title">手动输入</h3>
              <p className="compact-option-description">手动输入目标地址列表</p>
            </div>
            <div className="compact-option-check">
              {addressSource === 'manual' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              )}
            </div>
          </div>

          <div
            className={`compact-option-card ${addressSource === 'generate' ? 'selected' : ''}`}
            onClick={() => setAddressSource('generate')}
          >
            <div className="compact-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="compact-option-content">
              <h3 className="compact-option-title">生成新地址</h3>
              <p className="compact-option-description">自动生成新的 Solana 地址</p>
            </div>
            <div className="compact-option-check">
              {addressSource === 'generate' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              )}
            </div>
          </div>

          <div
            className={`compact-option-card ${addressSource === 'import' ? 'selected' : ''}`}
            onClick={() => setAddressSource('import')}
          >
            <div className="compact-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="compact-option-content">
              <h3 className="compact-option-title">导入文件</h3>
              <p className="compact-option-description">从 JSON 文件导入地址列表</p>
            </div>
            <div className="compact-option-check">
              {addressSource === 'import' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* 手动输入区域 */}
        {addressSource === 'manual' && (
          <div style={{ marginTop: '24px' }}>
            <div className="form-group">
              <label className="form-label">输入地址列表</label>
              <textarea
                className="form-control"
                value={manualAddresses}
                onChange={(e) => setManualAddresses(e.target.value)}
                placeholder="每行输入一个 Solana 地址..."
                rows="6"
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
              />
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={onParseManualAddresses}>
                解析地址
              </button>
              <button className="btn btn-secondary" onClick={onClearManualAddresses}>
                清空输入
              </button>
            </div>
          </div>
        )}

        {/* 生成地址区域 */}
        {addressSource === 'generate' && (
          <div style={{ marginTop: '24px' }}>
            <div className="form-group">
              <label className="form-label">生成地址数量</label>
              <input
                type="number"
                className="form-control"
                value={airdropCount}
                onChange={(e) => setAirdropCount(e.target.value)}
                placeholder="输入要生成的地址数量 (1-1000)"
                min="1"
                max="1000"
              />
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={onGenerateNewAddresses}>
                生成地址
              </button>
              {targetAddresses.length > 0 && (
                <button className="btn btn-secondary" onClick={onExportTargetAddresses}>
                  导出地址
                </button>
              )}
            </div>
          </div>
        )}

        {/* 导入文件区域 */}
        {addressSource === 'import' && (
          <div style={{ marginTop: '24px' }}>
            <div className="form-group">
              <label className="form-label">选择地址文件</label>
              <input
                type="file"
                className="form-control"
                accept=".json"
                onChange={() => {}} // TODO: 实现文件导入功能
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                选择包含 Solana 地址的 JSON 文件进行导入
              </p>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" disabled>
                导入地址
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 当前地址状态 */}
      {targetAddresses.length > 0 && (
        <div className="feature-card">
          <div className="feature-header">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="feature-title">当前地址列表</h2>
          </div>
          <p className="feature-description">
            已选择 {targetAddresses.length} 个目标地址
          </p>

          <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="status-indicator success">
                地址数量: {targetAddresses.length} 个
              </div>
              <div className="status-indicator success">
                来源: {addressSource === 'manual' ? '手动输入' : addressSource === 'generate' ? '自动生成' : '文件导入'}
              </div>
            </div>
          </div>

          <div className="btn-group">
            <button className="btn btn-secondary" onClick={onExportTargetAddresses}>
              导出地址列表
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AddressManagementTab;
