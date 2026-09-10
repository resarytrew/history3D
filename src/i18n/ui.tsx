/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from '../content/types'

const messages = {
  ru: {
    historicalReconstruction: 'Историческая реконструкция', pendingHistoricalReview: 'Статус: исследование продолжается', researchContinues: 'Исследование продолжается',
    ancientRus: 'Древняя Русь', listen: 'Слушать', pause: 'Пауза', resume: 'Продолжить',
    research: 'Исследовать', sources: 'Источники', reconstruction: '3D-реконструкция',
    observationFirst: 'Сначала наблюдение', explanation: 'Сверить с историками', afterObservation: 'Как это объясняют историки',
    closeResearch: 'Закрыть исследование', exhibits: 'Экспонаты коллекции', previous: 'Предыдущие экспонаты', next: 'Следующие экспонаты', soon: 'скоро',
    reconstructionPassport: 'Паспорт исторической реконструкции', sourcesAccuracy: 'Как восстановлена модель?', reconstructionSources: 'На чём основана реконструкция?',
    interpretive: 'Интерпретационная реконструкция', technicalReview: 'Технический review • DEV_ONLY',
    confirmed: 'Подтверждено источником', inferred: 'Восстановлено', reconstructedDetail: 'Эта деталь является частью реконструкции', uncertain: 'Требует уточнения', unknown: 'Пока неизвестно', openSource: 'Открыть источник ↗',
    sourceNeedsReview: 'Требуется уточнение прав и происхождения', environmentNote: 'Фон экспозиции создан для визуальной среды и не является историческим источником.',
    preparing: 'Готовим 3D-экспонат…', viewerLabel: '3D-сцена. Перетаскивайте для вращения, используйте колесо для масштаба.',
    viewerUnavailable: 'Не удалось загрузить 3D-экспонат. Попробуйте перезагрузить страницу.',
    assemblyUnavailable: 'Схема не помещается в доступную область. Предыдущий вид сохранён.',
    compareScale: 'Сравнить масштаб', reset: 'Сбросить ракурс', fullscreen: 'На весь экран', exhibitMode: 'Режим экспоната', exterior: 'Архитектура • внешний осмотр',
    draftMessage: 'Этот экспонат находится в исследовательском черновике. Исторические данные ещё не опубликованы.',
  },
  en: {
    historicalReconstruction: 'Historical reconstruction', pendingHistoricalReview: 'Status: research continues', researchContinues: 'Research continues',
    ancientRus: 'Ancient Rus', listen: 'Listen', pause: 'Pause', resume: 'Resume',
    research: 'Explore', sources: 'Sources', reconstruction: '3D reconstruction',
    observationFirst: 'Observe first', explanation: 'Compare with historians', afterObservation: 'How historians explain it',
    closeResearch: 'Close exploration', exhibits: 'Collection exhibits', previous: 'Previous exhibits', next: 'Next exhibits', soon: 'soon',
    reconstructionPassport: 'Historical reconstruction passport', sourcesAccuracy: 'How was the model reconstructed?', reconstructionSources: 'What supports the reconstruction?',
    interpretive: 'Interpretive reconstruction', technicalReview: 'Technical review • DEV_ONLY',
    confirmed: 'Confirmed by source', inferred: 'Reconstructed', reconstructedDetail: 'This detail is part of the reconstruction', uncertain: 'Needs clarification', unknown: 'Not known yet', openSource: 'Open source ↗',
    sourceNeedsReview: 'Rights and origin require review', environmentNote: 'The exhibit background is a visual environment, not a historical source.',
    preparing: 'Preparing the 3D exhibit…', viewerLabel: '3D stage. Drag to orbit and use the wheel to zoom.',
    viewerUnavailable: 'The 3D exhibit could not be loaded. Please reload the page.',
    assemblyUnavailable: 'This diagram does not fit the available space. The previous view has been preserved.',
    compareScale: 'Compare scale', reset: 'Reset view', fullscreen: 'Fullscreen', exhibitMode: 'Exhibit mode', exterior: 'Architecture • exterior view',
    draftMessage: 'This exhibit is still a research draft. Historical content has not been published.',
  },
} as const

export type UiMessages = typeof messages.ru | typeof messages.en
const UiContext = createContext<UiMessages>(messages.ru)
const LocaleContext = createContext<Locale>('ru')

export function UiProvider({ locale, children }: { readonly locale: Locale; readonly children: ReactNode }) {
  return <LocaleContext.Provider value={locale}><UiContext.Provider value={messages[locale]}>{children}</UiContext.Provider></LocaleContext.Provider>
}

export const useUi = () => useContext(UiContext)
export const useLocale = () => useContext(LocaleContext)
