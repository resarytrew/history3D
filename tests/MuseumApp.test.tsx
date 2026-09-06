import { forwardRef, useImperativeHandle } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MuseumApp } from '../src/app/MuseumApp'

vi.mock('../src/features/exhibit-viewer/ExhibitViewer', () => ({
  ExhibitViewer: forwardRef(function MockViewer(_props, ref) {
    useImperativeHandle(ref, () => ({ reset: vi.fn(), focusHotspot: vi.fn(), setScaleComparison: vi.fn() }))
    return <div aria-label="mock-3d-viewer" />
  }),
}))

describe('MuseumApp', () => {
  it('switches collections without losing the ancient Rus carousel', async () => {
    const user = userEvent.setup()
    render(<MuseumApp />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Коллекция' }), 'russian-empire')
    expect(screen.getByRole('heading', { name: 'Пехотный кивер' })).toBeInTheDocument()
    expect(screen.getByText('Историческая 3D-реконструкция')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Шлем Ивана IV' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Коллекция' }), 'ancient-rus')
    expect(screen.getByRole('button', { name: 'Шлем Ивана IV' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Покрова на Нерли' })).toBeInTheDocument()
  })
  it('opens the observation-first research flow', async () => {
    const user = userEvent.setup()
    render(<MuseumApp />)
    expect(screen.getByRole('heading', { name: 'Покрова на Нерли' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Исследовать/i }))
    expect(screen.getByText('Сначала наблюдение')).toBeInTheDocument()
    expect(screen.queryByText(/Впечатление создаёт/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Показать объяснение' }))
    expect(screen.getByText(/Впечатление создаёт/)).toBeInTheDocument()
  })

  it('opens the sources and confidence drawer', async () => {
    const user = userEvent.setup()
    render(<MuseumApp />)
    await user.click(screen.getByRole('button', { name: 'Источники' }))
    expect(screen.getByRole('dialog', { name: 'Источники и достоверность' })).toBeInTheDocument()
    expect(screen.getByText('White Monuments of Vladimir and Suzdal')).toBeInTheDocument()
  })

  it('shows a restrained message for a draft exhibit', async () => {
    const user = userEvent.setup()
    render(<MuseumApp />)
    await user.click(screen.getByRole('button', { name: /Топор/ }))
    expect(screen.getByRole('status')).toHaveTextContent('исследовательском черновике')
  })

  it('switches to the Ivan IV helmet scene from the carousel', async () => {
    const user = userEvent.setup()
    render(<MuseumApp />)
    await user.click(screen.getByRole('button', { name: 'Шлем Ивана IV' }))
    expect(screen.getByRole('heading', { name: 'Шлем Ивана IV' })).toBeInTheDocument()
    expect(screen.getByText(/Какие детали превращают защитный предмет/)).toBeInTheDocument()
    expect(screen.getByText('3D-СКАН • CC BY 4.0')).toBeInTheDocument()
  })
})
