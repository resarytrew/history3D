import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { AssemblyControls } from '../src/features/exhibit-viewer/AssemblyControls'
import { assembledState, type SemanticState } from '../src/content/assembly'
import { russianPistol1798 } from '../src/content/exhibits/russian-pistol-1798-1804/exhibit'
import { UiProvider } from '../src/i18n/ui'

it('keeps roving keyboard focus separate from selection and uses semantic tree ownership', () => {
  const change = vi.fn(), focus = vi.fn()
  function Harness() {
    const [state, setState] = useState<SemanticState>(assembledState)
    return <AssemblyControls exhibit={russianPistol1798} state={state} onChange={next => { change(next); setState(next) }} onFocus={focus} onReference={() => {}} />
  }
  render(<Harness />)
  const tree = screen.getByRole('tree'), root = within(tree).getByRole('treeitem', { name: 'Пистолет' })
  expect(root.querySelector('[role="group"]')).not.toBeNull()
  root.focus(); fireEvent.keyDown(root, { key: 'ArrowDown' })
  const stock = within(tree).getByRole('treeitem', { name: 'Ложа' })
  expect(stock).toHaveFocus(); expect(change).not.toHaveBeenCalled()
  fireEvent.keyDown(stock, { key: 'Enter' }); expect(change.mock.lastCall?.[0].selection).toEqual({ kind: 'entity', entityId: 'stock' }); expect(focus).not.toHaveBeenCalled()
  fireEvent.keyDown(stock, { key: 'ArrowRight' }); expect(within(tree).getByRole('treeitem', { name: 'Рукоять' })).toBeVisible()
  fireEvent.keyDown(stock, { key: 'End' }); expect(within(tree).getByRole('treeitem', { name: 'Накладка рукояти' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'Home' }); expect(root).toHaveFocus()
  fireEvent.keyDown(root, { key: 'Escape' }); expect(change.mock.lastCall?.[0].selection).toBeNull()
  expect(tree.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
})

it('shows virtual groups outside part-of and forbids physical actions for a feature', () => {
  const onChange = vi.fn()
  const props = { exhibit: russianPistol1798, onChange, onFocus: vi.fn(), onReference: vi.fn() }
  const { rerender } = render(<AssemblyControls {...props} state={{ selection: { kind: 'layout-group', layoutId: 'overview', groupId: 'trigger-group' }, displayMode: 'all', assemblyContext: { kind: 'layout', layoutId: 'overview' } }} />)
  expect(screen.getByText('Группа схемы')).toBeVisible()
  expect(within(screen.getByRole('tree')).queryByRole('treeitem', { name: 'Спусковой узел' })).toBeNull()
  expect(screen.getByRole('tree').querySelectorAll('[data-group-member="true"]')).toHaveLength(2)
  rerender(<UiProvider locale="en"><AssemblyControls {...props} state={{ selection: { kind: 'entity', entityId: 'marking.tula-1803' }, displayMode: 'all', assemblyContext: { kind: 'layout', layoutId: 'lock' } }} /></UiProvider>)
  expect(screen.getByRole('button', { name: 'Show on object' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Isolate' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Open assembly' })).toBeNull()
})
