import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { filesApi } from '../api/client'

/** Build the path relative to STORAGE_PATH from the breadcrumb + filename.
 *  The top-level 'Quotes' node is synthetic, so we strip it. */
function relPath(pathArr, filename) {
  return [...pathArr.slice(1), filename].join('/')
}

async function openPreview(pathArr, filename) {
  const blob = await filesApi.serveBlob(relPath(pathArr, filename))
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

const FILE_TYPES = {
  pdf:  { color: '#dc2626', bg: '#fff1f2', border: '#fecaca', label: 'PDF' },
  xls:  { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', label: 'XLS' },
  xlsx: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', label: 'XLSX' },
  doc:  { color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', label: 'DOC' },
  docx: { color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', label: 'DOCX' },
  csv:  { color: '#92400e', bg: '#fef3c7', border: '#fcd34d', label: 'CSV' },
  img:  { color: '#6b21a8', bg: '#fdf4ff', border: '#e9d5ff', label: 'IMG' },
  folder: { color: '#1a3a5c', bg: '#e8f0fe', border: '#bfdbfe', label: '' },
}

function getType(name) {
  const ext = name.split('.').pop().toLowerCase()
  return FILE_TYPES[ext] || { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: ext.toUpperCase() }
}

function FileIcon({ name, isFolder }) {
  const t = isFolder ? FILE_TYPES.folder : getType(name)
  if (isFolder) return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M3 10a3 3 0 013-3h8l3 3h13a3 3 0 013 3v14a3 3 0 01-3 3H6a3 3 0 01-3-3V10z"
        fill={t.bg} stroke={t.border} strokeWidth="1.5"/>
      <path d="M3 13h30" stroke={t.border} strokeWidth="1.5"/>
    </svg>
  )
  return (
    <div style={{ width: 36, height: 44, position: 'relative', flexShrink: 0 }}>
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
        <path d="M4 2h20l8 8v32a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z"
          fill={t.bg} stroke={t.border} strokeWidth="1.5"/>
        <path d="M24 2v8h8" stroke={t.border} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {t.label && (
        <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0,
          textAlign: 'center', fontSize: 8, fontWeight: 800,
          color: t.color, letterSpacing: '0.04em' }}>
          {t.label}
        </div>
      )}
    </div>
  )
}

const STATIC_FOLDERS = [
  {
    name: 'Equipment', type: 'folder', modified: '2026-03-01', children: [
      { name: 'Carrier.xls',  type: 'file', size: '199 KB', modified: '2026-02-25' },
      { name: 'Goodman.xls',  type: 'file', size: '361 KB', modified: '2026-02-25' },
      { name: 'Lennox.xls',   type: 'file', size: '172 KB', modified: '2026-02-25' },
      { name: 'Rheem.xls',    type: 'file', size: '141 KB', modified: '2026-02-25' },
      { name: 'Daikin.xls',   type: 'file', size: '65 KB',  modified: '2026-02-25' },
      { name: 'MisclEqp.xls', type: 'file', size: '157 KB', modified: '2026-02-25' },
    ]
  },
  {
    name: 'Templates', type: 'folder', modified: '2026-03-10', children: [
      { name: 'EstimatorsBidSystemMasterSheet.xls', type: 'file', size: '312 KB', modified: '2026-03-10' },
      { name: 'Attachment_A_Template.docx',         type: 'file', size: '48 KB',  modified: '2026-03-01' },
      { name: 'Field_Sheet_Template.docx',          type: 'file', size: '42 KB',  modified: '2026-03-01' },
      { name: 'Contract_Template.docx',             type: 'file', size: '56 KB',  modified: '2026-02-15' },
    ]
  },
  {
    name: 'Archive', type: 'folder', modified: '2026-01-01', children: [
      { name: 'Pre_Migration_Backup_2026', type: 'folder', modified: '2026-01-01', children: [
        { name: 'EstimatorsBidSystem.mdb',          type: 'file', size: '175 MB', modified: '2026-01-01' },
        { name: 'EstimatorsBidSystemReference.mdb', type: 'file', size: '48 MB',  modified: '2026-01-01' },
        { name: 'LoginANewPlan.mdb',                type: 'file', size: '32 MB',  modified: '2026-01-01' },
      ]}
    ]
  },
]

function Breadcrumb({ path, onNav }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 13, marginBottom: 16, flexWrap: 'wrap' }}>
      <button onClick={() => onNav([])}
        style={{ background: 'none', border: 'none', color: 'var(--blue-mid)',
          cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}>
        Files
      </button>
      {path.map((seg, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--gray-300)' }}>/</span>
          <button
            onClick={() => onNav(path.slice(0, i + 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, padding: '2px 4px',
              color: i === path.length - 1 ? 'var(--gray-800)' : 'var(--blue-mid)',
              fontWeight: i === path.length - 1 ? 600 : 400 }}>
            {seg}
          </button>
        </span>
      ))}
    </div>
  )
}

function getFolder(tree, path) {
  let current = tree
  for (const seg of path) {
    const node = current.find(n => n.name === seg && n.type === 'folder')
    if (!node) return []
    current = node.children || []
  }
  return current
}

export default function Files() {
  const { user } = useAuth()
  const [path, setPath]     = useState([])
  const [view, setView]     = useState('grid') // grid | list
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const [fileLoading, setFileLoading] = useState(null) // 'preview' | 'download' | null

  const { data: quoteFolders = [], isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: filesApi.list,
  })

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
  )

  const quotesFolder = quoteFolders.length > 0
    ? [{ name: 'Quotes', type: 'folder',
         modified: quoteFolders[0]?.modified ?? '',
         children: quoteFolders }]
    : []

  const TREE = [...quotesFolder, ...STATIC_FOLDERS]

  const currentItems = getFolder(TREE, path)

  const filtered = currentItems.filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  )

  const folders = filtered.filter(i => i.type === 'folder')
  const files   = filtered.filter(i => i.type === 'file')

  function navigate(folderName) {
    setPath(p => [...p, folderName])
    setSearch('')
    setSelected(null)
  }

  function handleClick(item) {
    if (item.type === 'folder') {
      navigate(item.name)
    } else {
      setSelected(s => s?.name === item.name ? null : item)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Files</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            File browser — quotes, templates, equipment pricing, archives
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--gray-200)',
            borderRadius: 8, overflow: 'hidden' }}>
            {['grid','list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ background: view === v ? 'var(--blue)' : 'white',
                  color: view === v ? 'white' : 'var(--gray-600)',
                  border: 'none', padding: '7px 14px', fontSize: 13,
                  cursor: 'pointer' }}>
                {v === 'grid'
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor"/><rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor"/><rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor"/><rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="0" y1="2" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="0" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                }
              </button>
            ))}
          </div>
          {user?.role === 'admin' && (
            <button className="btn-primary" style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Upload coming soon">
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Search + breadcrumb */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        {path.length > 0 && (
          <button className="btn-secondary btn-sm"
            onClick={() => { setPath(p => p.slice(0,-1)); setSearch(''); setSelected(null) }}>
            ← Back
          </button>
        )}
      </div>

      <Breadcrumb path={path} onNav={setPath} />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{search ? `No files match "${search}"` : 'This folder is empty.'}</p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12 }}>
          {[...folders, ...files].map(item => (
            <div
              key={item.name}
              onClick={() => handleClick(item)}
              style={{
                background: selected?.name === item.name ? 'var(--blue-light)' : 'var(--card-bg)',
                border: `1px solid ${selected?.name === item.name ? 'var(--blue-mid)' : 'var(--gray-200)'}`,
                borderRadius: 10, padding: '16px 12px',
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.15s', userSelect: 'none',
              }}
              onMouseEnter={e => {
                if (selected?.name !== item.name)
                  e.currentTarget.style.background = 'var(--gray-50)'
              }}
              onMouseLeave={e => {
                if (selected?.name !== item.name)
                  e.currentTarget.style.background = 'var(--card-bg)'
              }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <FileIcon name={item.name} isFolder={item.type === 'folder'} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-800)',
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                {item.name}
              </div>
              {item.size && (
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                  {item.size}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Name</th>
                <th>Modified</th>
                <th style={{ textAlign: 'right', paddingRight: 20 }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {[...folders, ...files].map(item => (
                <tr key={item.name}
                  onClick={() => handleClick(item)}
                  style={{ cursor: 'pointer',
                    background: selected?.name === item.name ? 'var(--blue-light)' : '' }}>
                  <td style={{ paddingLeft: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileIcon name={item.name} isFolder={item.type === 'folder'} />
                      <span style={{ fontWeight: item.type === 'folder' ? 600 : 400,
                        fontSize: 14 }}>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                    {item.modified}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: 20,
                    fontSize: 13, color: 'var(--gray-400)' }}>
                    {item.type === 'folder'
                      ? `${(item.children||[]).length} items`
                      : item.size || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected file panel */}
      {selected && (
        <div style={{ position: 'fixed', right: 24, bottom: 24,
          background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
          borderRadius: 12, padding: 20, width: 260,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 14 }}>
            <FileIcon name={selected.name} isFolder={false} />
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', fontSize: 18,
                color: 'var(--gray-400)', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8,
            wordBreak: 'break-all' }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>
            Size: {selected.size || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 16 }}>
            Modified: {selected.modified}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(selected.name.endsWith('.pdf') || selected.name.endsWith('.html')) && (
              <button
                className="btn-primary btn-sm"
                disabled={fileLoading !== null}
                onClick={async () => {
                  setFileLoading('preview')
                  try { await openPreview(path, selected.name) }
                  catch { alert('Could not load preview.') }
                  finally { setFileLoading(null) }
                }}>
                {fileLoading === 'preview' ? 'Loading…' : 'Preview'}
              </button>
            )}
            <button
              className="btn-secondary btn-sm"
              disabled={fileLoading !== null}
              onClick={async () => {
                setFileLoading('download')
                try { await filesApi.download(relPath(path, selected.name), selected.name) }
                catch { alert('Could not download file.') }
                finally { setFileLoading(null) }
              }}>
              {fileLoading === 'download' ? 'Downloading…' : 'Download'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
