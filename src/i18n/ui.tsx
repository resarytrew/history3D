/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from '../content/types'

const messages = {
  ru: {
    ancientRus: 'Древняя Русь', listen: 'Слушать', pause: 'Пауза', resume: 'Продолжить',
    research: 'Исследовать', sources: 'Источники', reconstruction: '3D-реконструкция',
    observationFirst: 'Сначала наблюдение', explanation: 'Показать объяснение', afterObservation: 'После наблюдения',
    closeResearch: 'Закрыть исследование', exhibits: 'Экспонаты коллекции', previous: 'Предыдущие экспонаты', next: 'Следующие экспонаты', soon: 'скоро',
    reconstructionPassport: 'Паспорт реконструкции', sourcesAccuracy: 'Источники и достоверность',
    interpretive: 'Интерпретационная реконструкция', technicalReview: 'Технический review • DEV_ONLY',
    confirmed: 'Подтверждено', inferred: 'Выведено', uncertain: 'Неопределённо', unknown: 'Неизвестно', openSource: 'Открыть источник ↗',
    sourceNeedsReview: 'Требуется уточнение прав и происхождения', environmentNote: 'Фон экспозиции создан для визуальной среды и не является историческим источником.',
    preparing: 'Готовим 3D-экспонат…', viewerLabel: '3D-сцена. Перетаскивайте для вращения, используйте колесо для масштаба.',
    compareScale: 'Сравнить масштаб', reset: 'Сбросить ракурс', fullscreen: 'На весь экран', exhibitMode: 'Режим экспоната', exterior: 'Архитектура • внешний осмотр',
    draftMessage: 'Этот экспонат находится в исследовательском черновике. Исторические данные ещё не опубликованы.',
  },
  en: {
    ancientRus: 'Ancient Rus', listen: 'Listen', pause: 'Pause', resume: 'Resume',
    research: 'Explore', sources: 'Sources', reconstruction: '3D reconstruction',
    observationFirst: 'Observe first', explanation: 'Show explanation', afterObservation: 'After observing',
    closeResearch: 'Close exploration', exhibits: 'Collection exhibits', previous: 'Previous exhibits', next: 'Next exhibits', soon: 'soon',
    reconstructionPassport: 'Reconstruction passport', sourcesAccuracy: 'Sources and confidence',
    interpretive: 'Interpretive reconstruction', technicalReview: 'Technical review • DEV_ONLY',
    confirmed: 'Supported', inferred: 'Inferred', uncertain: 'Uncertain', unknown: 'Unknown', openSource: 'Open source ↗',
    sourceNeedsReview: 'Rights and origin require review', environmentNote: 'The exhibit background is a visual environment, not a historical source.',
    preparing: 'Preparing the 3D exhibit…', viewerLabel: '3D stage. Drag to orbit and use the wheel to zoom.',
    compareScale: 'Compare scale', reset: 'Reset view', fullscreen: 'Fullscreen', exhibitMode: 'Exhibit mode', exterior: 'Architecture • exterior view',
    draftMessage: 'This exhibit is still a research draft. Historical content has not been published.',
  },
} as const

export type UiMessages = typeof messages.ru | typeof messages.en
const UiContext = createContext<UiMessages>(messages.ru)

export function UiProvider({ locale, children }: { readonly locale: Locale; readonly children: ReactNode }) {
  return <UiContext.Provider value={messages[locale]}>{children}</UiContext.Provider>
}

export const useUi = () => useContext(UiContext)
