import type { ExhibitCollection } from '../types'

export const ancientRusCollection: ExhibitCollection = {
  id: 'ancient-rus',
  title: 'Древняя Русь',
  period: 'IX–XIII века',
  defaultExhibitId: 'pokrov-na-nerli',
  entries: [
    { id: 'rus-axe-dev', title: 'Топор', category: 'weapon', status: 'draft', icon: 'axe' },
    { id: 'varangian-boat-dev', title: 'Ладья', category: 'transport', status: 'draft', icon: 'boat' },
    { id: 'pokrov-na-nerli', title: 'Покрова на Нерли', category: 'architecture', status: 'technical-review', exhibitId: 'pokrov-na-nerli', icon: 'church' },
    { id: 'ivan-iv-helmet', title: 'Шлем Ивана IV', category: 'armor', status: 'technical-review', exhibitId: 'ivan-iv-helmet', icon: 'helmet' },
    { id: 'enkolpion-dev', title: 'Энколпион', category: 'religion', status: 'draft', icon: 'cross' },
  ],
}
