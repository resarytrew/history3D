import { useState } from 'react'
import type { SemanticEntity } from '../../content/semantics'
import type { SemanticDisplayMode } from '../../three/SemanticPresentation'

interface Props {
  readonly entities: readonly SemanticEntity[]
  readonly onAmount: (amount: number, animate: boolean) => void
  readonly onSelect: (id: string | null, mode: SemanticDisplayMode) => void
}

export function AssemblyControls({ entities, onAmount, onSelect }: Props) {
  const [amount, setAmount] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<SemanticDisplayMode>('all')
  const path = (id: string): SemanticEntity[] => {
    const entity = entities.find(item => item.id === id)!
    return [...(entity.parentId ? path(entity.parentId) : []), entity]
  }
  const changeAmount = (value: number, animate: boolean) => { setAmount(value); onAmount(value, animate) }
  return <details className="assembly-controls">
    <summary>Устройство</summary>
    <div className="assembly-controls-body">
      <label htmlFor="assembly-amount">Разнесение деталей <output>{Math.round(amount * 100)}%</output></label>
      <input id="assembly-amount" type="range" min="0" max="1" step="0.01" value={amount} onChange={event => changeAmount(Number(event.target.value), false)} />
      <div className="assembly-actions">
        <button type="button" onClick={() => changeAmount(1, true)}>Разнести</button>
        <button type="button" onClick={() => { changeAmount(0, true); setSelected(null); setMode('all'); onSelect(null, 'all') }}>Собрать</button>
      </div>
      <label htmlFor="assembly-entity">Элемент</label>
      <select id="assembly-entity" value={selected ?? ''} onChange={event => {
        const id = event.target.value || null
        setSelected(id)
        if (!id) setMode('all')
        onSelect(id, id ? mode : 'all')
      }}>
        <option value="">Весь экспонат</option>
        {entities.map(entity => <option key={entity.id} value={entity.id}>{'— '.repeat(path(entity.id).length - 1)}{entity.label.ru}</option>)}
      </select>
      {selected && <nav aria-label="Путь элемента" className="assembly-path">{path(selected).map((entity, i) => <span key={entity.id}>
        {i > 0 && ' › '}<button type="button" onClick={() => { setSelected(entity.id); onSelect(entity.id, mode) }}>{entity.label.ru}</button>
      </span>)}</nav>}
      <label htmlFor="assembly-display">Окружение</label>
      <select id="assembly-display" disabled={!selected} value={mode} onChange={event => {
        const next = event.target.value as SemanticDisplayMode
        setMode(next); onSelect(selected, next)
      }}>
        <option value="all">Показать всё</option>
        <option value="isolate">Только выбранное</option>
        <option value="ghost">Полупрозрачное окружение</option>
      </select>
    </div>
  </details>
}
