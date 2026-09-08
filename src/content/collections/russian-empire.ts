import type { ExhibitCollection } from '../types'
export const russianEmpireCollection: ExhibitCollection = {
  id: 'russian-empire', title: 'Российская империя', period: 'Начало XIX века',
  defaultExhibitId: 'russian-shako-1808',
  entries: [
    { id: 'russian-shako-1808', title: 'Кивер 1808 года', category: 'uniform', status: 'historical-review', exhibitId: 'russian-shako-1808', icon: 'helmet' },
    { id: 'russian-musket-1808', title: 'Ружьё 1808 года', category: 'weapon', status: 'reconstruction', exhibitId: 'russian-musket-1808', icon: 'musket' },
    { id: 'russian-pistol-1798-1804', title: 'Пистолет 1798/1804 гг.', category: 'weapon', status: 'reconstruction', exhibitId: 'russian-pistol-1798-1804', icon: 'musket' },
  ],
}
