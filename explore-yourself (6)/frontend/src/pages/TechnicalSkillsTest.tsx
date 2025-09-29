import { createSkillTestPage } from './skill-tests/createSkillTestPage'

export default createSkillTestPage({
  filterNames: [
    'Equipment Maintenance',
    'Equipment Selection',
    'Installation',
    'Operation and Control',
    'Operation Monitoring',
    'Programming',
    'Quality Control Analysis',
    'Repairing',
    'Technology Design',
    'Troubleshooting'
  ],
  storeKey: 'technical',
  subsetKey: 'technical',
  translationKey: 'skillTests.technical'
})
