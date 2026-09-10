import { useRef, useState, type KeyboardEvent } from 'react'
import type { Exhibit } from '../../content/types'
import { assembledState, groupSelection, isWithin, selectionKey, selectionMembers, type SemanticState } from '../../content/assembly'
import { useLocale } from '../../i18n/ui'

interface Props {
  readonly exhibit: Exhibit; readonly state: SemanticState
  readonly onChange: (state: SemanticState) => void; readonly onFocus: (id: string) => void; readonly onReference: () => void
}

export function AssemblyControls({ exhibit, state, onChange, onFocus, onReference }: Props) {
  const locale = useLocale(), en = locale === 'en', entities = exhibit.semantics ?? [], config = exhibit.assembly
  const { selection, assemblyContext: context, displayMode } = state
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(entities.filter(e => !e.parentId).map(e => e.id)))
  const [focused, setFocused] = useState(entities[0]?.id ?? '')
  const [previousSelection, setPreviousSelection] = useState(selection)
  const tree = useRef<HTMLDivElement>(null)
  const members = selectionMembers(selection, config)
  const entity = selection?.kind === 'entity' ? entities.find(e => e.id === selection.entityId) : undefined
  const layout = context.kind === 'layout' ? config?.layouts.find(l => l.id === context.layoutId) : undefined
  const group = selection?.kind === 'layout-group' ? config?.layouts.find(l => l.id === selection.layoutId)?.groups.find(g => g.id === selection.groupId) : layout?.groups.find(g => selectionKey(groupSelection(layout.id, g)) === selectionKey(selection))
  const label = (id: string) => { const e = entities.find(e => e.id === id); return e?.label[locale] ?? e?.label.ru ?? id }
  const visible = entities.filter(e => {
    let parent = e.parentId
    while (parent) { if (!expanded.has(parent)) return false; parent = entities.find(e => e.id === parent)?.parentId }
    return true
  })
  if (previousSelection !== selection) {
    setPreviousSelection(selection)
    const selected = selectionMembers(selection, config)
    setExpanded(previous => {
      const next = new Set(previous)
      for (const id of selected) {
        let parent = entities.find(e => e.id === id)?.parentId
        while (parent) { next.add(parent); parent = entities.find(e => e.id === parent)?.parentId }
      }
      return next
    })
  }
  const selectEntity = (id: string) => {
    let nextContext = context
    if (context.kind === 'layout') {
      const detail = config?.layouts.find(l => l.parentLayoutId && l.groups.some(g => g.memberEntityIds.includes(id) || entities.find(e => e.id === id)?.kind === 'feature' && g.memberEntityIds.some(member => isWithin(id, member, entities))))
      if (detail) nextContext = { kind: 'layout', layoutId: detail.id }
    }
    if (context.kind === 'layout' && nextContext === context && !layout?.groups.some(g => g.memberEntityIds.some(member => isWithin(id, member, entities)))) nextContext = { kind: 'layout', layoutId: 'overview' }
    if (id === entities.find(e => !e.parentId)?.id) nextContext = { kind: 'assembled' }
    onChange({ selection: { kind: 'entity', entityId: id }, displayMode: 'all', assemblyContext: nextContext })
  }
  const focus = (id: string) => { setFocused(id); tree.current?.querySelector<HTMLElement>(`[data-entity-id="${id}"]`)?.focus() }
  const keyDown = (event: KeyboardEvent, id: string) => {
    const index = visible.findIndex(e => e.id === id), children = entities.filter(e => e.parentId === id), parent = entities.find(e => e.id === id)?.parentId
    const toggle = (open: boolean) => setExpanded(previous => { const next = new Set(previous); if (open) next.add(id); else next.delete(id); return next })
    switch (event.key) {
      case 'ArrowDown': focus(visible[Math.min(visible.length - 1, index + 1)].id); break
      case 'ArrowUp': focus(visible[Math.max(0, index - 1)].id); break
      case 'Home': focus(visible[0].id); break
      case 'End': focus(visible[visible.length - 1].id); break
      case 'ArrowRight': if (children.length && !expanded.has(id)) toggle(true); else if (children.length) focus(children[0].id); break
      case 'ArrowLeft': if (children.length && expanded.has(id)) toggle(false); else if (parent) focus(parent); break
      case 'Enter': case ' ': selectEntity(id); break
      case 'Escape': onChange({ ...state, selection: null, displayMode: 'all' }); break
      default: return
    }
    event.preventDefault(); event.stopPropagation()
  }
  const renderTree = (parent?: string) => entities.filter(e => e.parentId === parent).map(e => {
    const children = entities.some(child => child.parentId === e.id), open = expanded.has(e.id)
    return <div key={e.id} role="treeitem" tabIndex={focused === e.id ? 0 : -1} data-entity-id={e.id}
        aria-label={label(e.id)}
        aria-selected={entity?.id === e.id} aria-expanded={children ? open : undefined}
        data-group-member={selection?.kind === 'layout-group' && members.some(id => isWithin(e.id, id, entities)) || undefined}
        onFocus={event => { if (event.target === event.currentTarget) setFocused(e.id) }} onKeyDown={event => keyDown(event, e.id)} onClick={event => { event.stopPropagation(); selectEntity(e.id) }}>
      <div className="tree-row">
        {children && <button type="button" tabIndex={-1} aria-label={`${open ? (en ? 'Collapse' : 'Свернуть') : (en ? 'Expand' : 'Раскрыть')} ${label(e.id)}`} onClick={event => { event.stopPropagation(); if (open && isWithin(focused, e.id, entities)) focus(e.id); setExpanded(previous => { const next = new Set(previous); if (open) next.delete(e.id); else next.add(e.id); return next }) }}>{open ? '−' : '+'}</button>}
        {label(e.id)}
      </div>
      {children && open && <div role="group">{renderTree(e.id)}</div>}
    </div>
  })
  const physical = !!group || entity && ['part', 'assembly'].includes(entity.kind)
  const annotations = exhibit.annotations ?? [], direct = entity ? annotations.filter(a => a.entityId === entity.id) : []
  const related = entity ? annotations.filter(a => a.entityId !== entity.id && isWithin(entity.id, a.entityId, entities)) : []
  const path = entity ? entities.filter(e => isWithin(entity.id, e.id, entities)) : []
  return <details className="assembly-controls" open>
    <summary>{en ? 'Explore structure' : 'Устройство'}</summary>
    <div className="assembly-controls-body">
      <div className="assembly-actions">
        {!layout && config && <button onClick={() => onChange({ ...assembledState, assemblyContext: { kind: 'layout', layoutId: 'overview' } })}>{en ? 'Assembly overview' : 'Схема разборки'}</button>}
        {layout && <>
          {layout.parentLayoutId && <button onClick={() => {
            const parent = config!.layouts.find(l => l.id === layout.parentLayoutId)!, closed = parent.groups.find(g => g.drilldownLayoutId === layout.id)
            onChange({ selection: closed ? groupSelection(parent.id, closed) : null, displayMode: 'all', assemblyContext: { kind: 'layout', layoutId: parent.id } })
          }}>{en ? 'Back' : 'Назад'}</button>}
          <button onClick={() => onChange(assembledState)}>{en ? 'Assemble all' : 'Собрать всё'}</button>
          <button onClick={onReference}>{en ? 'Restore diagram' : 'Вернуть схему'}</button>
        </>}
      </div>
      {layout && <section aria-label={en ? 'Diagram groups' : 'Группы схемы'} className="layout-groups">
        {layout.groups.map(g => <button key={g.id} aria-pressed={selectionKey(groupSelection(layout.id, g)) === selectionKey(selection)} onClick={() => onChange({ ...state, selection: groupSelection(layout.id, g), displayMode: 'all' })}>{g.label[locale]}</button>)}
      </section>}
      <h3>{en ? 'Structure' : 'Структура'}</h3>
      <div ref={tree} role="tree" aria-label={en ? 'Structure' : 'Структура'} className="semantic-tree">{renderTree()}</div>
      {selection && <section className="semantic-card" aria-live="polite" aria-label={en ? 'Selection' : 'Выбранный элемент'}>
        {selection.kind === 'layout-group' && <small>{en ? 'Diagram group' : 'Группа схемы'}</small>}
        <h3>{selection.kind === 'layout-group' ? group?.label[locale] : entity && label(entity.id)}</h3>
        {entity && <nav className="assembly-path" aria-label={en ? 'Semantic path' : 'Путь элемента'}>{path.map((e, i) => <span key={e.id}>{i > 0 && ' › '}<button onClick={() => selectEntity(e.id)}>{label(e.id)}</button></span>)}</nav>}
        {selection.kind === 'layout-group' && <p>{members.map(label).join(' · ')}</p>}
        <div className="assembly-actions">
          <button onClick={() => { if (members[0]) onFocus(members[0]) }}>{physical ? (en ? 'Show' : 'Показать') : (en ? 'Show on object' : 'Показать на предмете')}</button>
          {physical && <>
            <button onClick={() => onChange({ ...state, displayMode: 'isolate' })}>{en ? 'Isolate' : 'Изолировать'}</button>
            <button onClick={() => onChange({ ...state, displayMode: 'all' })}>{en ? 'Show in context' : 'Показать в составе'}</button>
            <button aria-pressed={displayMode === 'ghost'} onClick={() => onChange({ ...state, displayMode: displayMode === 'ghost' ? 'all' : 'ghost' })}>{en ? 'Ghost surroundings' : 'Полупрозрачное окружение'}</button>
          </>}
          {group?.drilldownLayoutId && <button onClick={() => onChange({ selection: null, displayMode: 'all', assemblyContext: { kind: 'layout', layoutId: group.drilldownLayoutId! } })}>{en ? 'Open assembly' : 'Раскрыть узел'}</button>}
        </div>
        {[{ title: en ? 'Research materials' : 'Исследовательские материалы', items: direct }, { title: en ? 'Related materials about the whole' : 'Связанные материалы о целом', items: related }].map(section => section.items.length > 0 && <div key={section.title}><h4>{section.title}</h4>{section.items.map(a => <details key={a.id} data-annotation-id={a.id}><summary>{a.label}</summary><p>{a.description}</p><p>{a.observationQuestion}</p>{a.evidenceIds.map(id => {
          const evidence = [...exhibit.reconstruction.known, ...exhibit.reconstruction.inferred, ...exhibit.reconstruction.uncertain, ...exhibit.reconstruction.unknown].find(e => e.id === id)
          return evidence && <p key={id} data-evidence-id={id}>{evidence.statement}{evidence.note && ` ${evidence.note}`}</p>
        })}</details>)}</div>)}
      </section>}
    </div>
  </details>
}
