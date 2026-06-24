import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRoles, createRole, updateRole, deleteRole,
  getDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType,
  type RoleConfig, type DocumentTypeConfig,
} from '../../api/admin'

// ── Badge poziomu uprawnień ───────────────────────────────────────────────────
const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-600',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-indigo-50 text-indigo-700',
  4: 'bg-amber-50 text-amber-700',
  5: 'bg-orange-50 text-orange-700',
  6: 'bg-red-50 text-red-700',
}
const LEVEL_LABELS: Record<number, string> = {
  1: 'Poziom 1', 2: 'Poziom 2', 3: 'Poziom 3',
  4: 'Poziom 4', 5: 'Poziom 5', 6: 'Poziom 6',
}

function LevelBadge({ level }: { level: number }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[level] ?? 'bg-gray-100 text-gray-600'}`}>
      {LEVEL_LABELS[level] ?? `Poziom ${level}`}
    </span>
  )
}

// ── Formularz dodawania roli ──────────────────────────────────────────────────
function AddRoleForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [level, setLevel] = useState(2)
  const [desc, setDesc] = useState('')
  const [sort, setSort] = useState(50)
  const [err, setErr] = useState('')

  const mut = useMutation({
    mutationFn: () => createRole({ key, label, permissionLevel: level, description: desc, sortOrder: sort }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); onDone() },
    onError: (e: any) => setErr(e?.response?.data?.error ?? 'Błąd zapisu'),
  })

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-blue-800">Nowa rola</h4>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Klucz (np. MAGAZYNIER)</label>
          <input value={key} onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
            placeholder="NOWA_ROLA"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nazwa wyświetlana</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Nowa rola"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Poziom uprawnień (1–6)</label>
          <select value={level} onChange={e => setLevel(Number(e.target.value))}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
            {[1,2,3,4,5,6].map(l => <option key={l} value={l}>Poziom {l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kolejność</label>
          <input type="number" value={sort} onChange={e => setSort(Number(e.target.value))}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Opis</label>
        <input value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Opcjonalny opis roli..."
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => mut.mutate()} disabled={!key || !label || mut.isPending}
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors">
          {mut.isPending ? 'Zapisuję…' : 'Dodaj rolę'}
        </button>
        <button onClick={onDone} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
          Anuluj
        </button>
      </div>
    </div>
  )
}

// ── Wiersz roli ───────────────────────────────────────────────────────────────
function RoleRow({ role }: { role: RoleConfig }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(role.label)
  const [desc, setDesc] = useState(role.description)
  const [sort, setSort] = useState(role.sortOrder)
  const [level, setLevel] = useState(role.permissionLevel)
  const [delConfirm, setDelConfirm] = useState(false)

  const saveMut = useMutation({
    mutationFn: () => updateRole(role.key, { label, description: desc, sortOrder: sort, permissionLevel: level }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); setEditing(false) },
  })

  const delMut = useMutation({
    mutationFn: () => deleteRole(role.key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); setDelConfirm(false) },
  })

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-semibold text-gray-700">{role.key}</span>
          {role.isSystem && <span className="ml-2 text-xs text-gray-400">systemowa</span>}
        </td>
        <td className="px-4 py-3">
          <input value={label} onChange={e => setLabel(e.target.value)}
            className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none" />
        </td>
        <td className="px-4 py-3">
          {role.isSystem
            ? <LevelBadge level={role.permissionLevel} />
            : <select value={level} onChange={e => setLevel(Number(e.target.value))}
                className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none">
                {[1,2,3,4,5,6].map(l => <option key={l} value={l}>Poziom {l}</option>)}
              </select>
          }
        </td>
        <td className="px-4 py-3">
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none" />
        </td>
        <td className="px-4 py-3">
          <input type="number" value={sort} onChange={e => setSort(Number(e.target.value))}
            className="w-16 text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none" />
        </td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg mr-2 cursor-pointer transition-colors">
            {saveMut.isPending ? '…' : 'Zapisz'}
          </button>
          <button onClick={() => { setEditing(false); setLabel(role.label); setDesc(role.description); setSort(role.sortOrder); setLevel(role.permissionLevel) }}
            className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer">
            Anuluj
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-gray-700">{role.key}</span>
        {role.isSystem && (
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
            systemowa
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{role.label}</td>
      <td className="px-4 py-3"><LevelBadge level={role.permissionLevel} /></td>
      <td className="px-4 py-3 text-xs text-gray-500">{role.description}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{role.sortOrder}</td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => setEditing(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 mr-3 cursor-pointer">
          Edytuj
        </button>
        {!role.isSystem && (
          delConfirm
            ? <>
                <span className="text-xs text-gray-600 mr-1">Usunąć?</span>
                <button onClick={() => delMut.mutate()} disabled={delMut.isPending}
                  className="text-xs font-medium text-red-600 hover:text-red-800 mr-2 cursor-pointer">
                  {delMut.isPending ? '…' : 'Tak'}
                </button>
                <button onClick={() => setDelConfirm(false)} className="text-xs text-gray-500 cursor-pointer">Nie</button>
              </>
            : <button onClick={() => setDelConfirm(true)}
                className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                Usuń
              </button>
        )}
      </td>
    </tr>
  )
}

// ── Formularz dodawania typu dokumentu ───────────────────────────────────────
function AddDocTypeForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [desc, setDesc] = useState('')
  const [sort, setSort] = useState(90)
  const [err, setErr] = useState('')

  const mut = useMutation({
    mutationFn: () => createDocumentType({ key, label, description: desc, sortOrder: sort }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-doc-types'] }); onDone() },
    onError: (e: any) => setErr(e?.response?.data?.error ?? 'Błąd zapisu'),
  })

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-green-800">Nowy typ dokumentu</h4>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Klucz (np. DZIENNIK_BUDOWY)</label>
          <input value={key} onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
            placeholder="TYP_DOKUMENTU"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300 font-mono" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nazwa wyświetlana</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Dziennik budowy"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Opis</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Opcjonalny opis..."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kolejność</label>
          <input type="number" value={sort} onChange={e => setSort(Number(e.target.value))}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => mut.mutate()} disabled={!key || !label || mut.isPending}
          className="px-4 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors">
          {mut.isPending ? 'Zapisuję…' : 'Dodaj typ'}
        </button>
        <button onClick={onDone} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
          Anuluj
        </button>
      </div>
    </div>
  )
}

// ── Wiersz typu dokumentu ─────────────────────────────────────────────────────
function DocTypeRow({ dt }: { dt: DocumentTypeConfig }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(dt.label)
  const [desc, setDesc] = useState(dt.description)
  const [sort, setSort] = useState(dt.sortOrder)
  const [delConfirm, setDelConfirm] = useState(false)

  const saveMut = useMutation({
    mutationFn: () => updateDocumentType(dt.key, { label, description: desc, sortOrder: sort }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-doc-types'] }); setEditing(false) },
  })

  const delMut = useMutation({
    mutationFn: () => deleteDocumentType(dt.key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-doc-types'] }); setDelConfirm(false) },
  })

  if (editing) {
    return (
      <tr className="bg-green-50">
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-semibold text-gray-700">{dt.key}</span>
        </td>
        <td className="px-4 py-3">
          <input value={label} onChange={e => setLabel(e.target.value)}
            className="w-full text-sm border border-green-300 rounded px-2 py-1 focus:outline-none" />
        </td>
        <td className="px-4 py-3">
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full text-sm border border-green-300 rounded px-2 py-1 focus:outline-none" />
        </td>
        <td className="px-4 py-3">
          <input type="number" value={sort} onChange={e => setSort(Number(e.target.value))}
            className="w-16 text-sm border border-green-300 rounded px-2 py-1 focus:outline-none" />
        </td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg mr-2 cursor-pointer transition-colors">
            {saveMut.isPending ? '…' : 'Zapisz'}
          </button>
          <button onClick={() => { setEditing(false); setLabel(dt.label); setDesc(dt.description); setSort(dt.sortOrder) }}
            className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer">
            Anuluj
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-gray-700">{dt.key}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{dt.label}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{dt.description}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{dt.sortOrder}</td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => setEditing(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 mr-3 cursor-pointer">
          Edytuj
        </button>
        {delConfirm
          ? <>
              <span className="text-xs text-gray-600 mr-1">Usunąć?</span>
              <button onClick={() => delMut.mutate()} disabled={delMut.isPending}
                className="text-xs font-medium text-red-600 hover:text-red-800 mr-2 cursor-pointer">
                {delMut.isPending ? '…' : 'Tak'}
              </button>
              <button onClick={() => setDelConfirm(false)} className="text-xs text-gray-500 cursor-pointer">Nie</button>
            </>
          : <button onClick={() => setDelConfirm(true)}
              className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
              Usuń
            </button>
        }
      </td>
    </tr>
  )
}

// ── Strona główna ─────────────────────────────────────────────────────────────
export default function ConfigAdmin() {
  const [tab, setTab] = useState<'roles' | 'docTypes'>('roles')
  const [addingRole, setAddingRole] = useState(false)
  const [addingDocType, setAddingDocType] = useState(false)

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getRoles,
  })

  const { data: docTypes, isLoading: dtLoading } = useQuery({
    queryKey: ['admin-doc-types'],
    queryFn: getDocumentTypes,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Konfiguracja</h1>
        <p className="text-sm text-gray-500 mt-0.5">Role w projektach i typy dokumentów</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['roles', 'Role w projekcie'], ['docTypes', 'Typy dokumentów']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer
              ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Roles tab */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Role w projekcie</h2>
              <p className="text-xs text-gray-500 mt-0.5">Role systemowe mają stały poziom uprawnień. Role niestandardowe można w pełni zarządzać.</p>
            </div>
            {!addingRole && (
              <button onClick={() => setAddingRole(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Dodaj rolę
              </button>
            )}
          </div>

          {addingRole && <AddRoleForm onDone={() => setAddingRole(false)} />}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Legenda */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-3 flex-wrap">
              {[1,2,3,4,5,6].map(l => (
                <span key={l} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[l]}`}>
                  Poziom {l}
                </span>
              ))}
              <span className="text-xs text-gray-400 self-center">— wyższy poziom = więcej uprawnień</span>
            </div>

            {rolesLoading
              ? <div className="p-8 text-center text-sm text-gray-400">Ładowanie…</div>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-4 py-3 text-left">Klucz</th>
                      <th className="px-4 py-3 text-left">Nazwa</th>
                      <th className="px-4 py-3 text-left">Uprawnienia</th>
                      <th className="px-4 py-3 text-left">Opis</th>
                      <th className="px-4 py-3 text-left">Kolejność</th>
                      <th className="px-4 py-3 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles?.map(r => <RoleRow key={r.key} role={r} />)}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}

      {/* Document types tab */}
      {tab === 'docTypes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Typy dokumentów</h2>
              <p className="text-xs text-gray-500 mt-0.5">Typy dokumentów dostępne przy wgrywaniu plików do projektów.</p>
            </div>
            {!addingDocType && (
              <button onClick={() => setAddingDocType(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Dodaj typ
              </button>
            )}
          </div>

          {addingDocType && <AddDocTypeForm onDone={() => setAddingDocType(false)} />}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {dtLoading
              ? <div className="p-8 text-center text-sm text-gray-400">Ładowanie…</div>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-4 py-3 text-left">Klucz</th>
                      <th className="px-4 py-3 text-left">Nazwa</th>
                      <th className="px-4 py-3 text-left">Opis</th>
                      <th className="px-4 py-3 text-left">Kolejność</th>
                      <th className="px-4 py-3 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docTypes?.map(dt => <DocTypeRow key={dt.key} dt={dt} />)}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}
    </div>
  )
}
