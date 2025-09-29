import { createSkillTestPage } from './skill-tests/createSkillTestPage'

export default createSkillTestPage({
  filterNames: [
    'Active Learning',
    'Critical Thinking',
    'Learning Strategies',
    'Monitoring'
  ],
  storeKey: 'process',
  subsetKey: 'process',
  translationKey: 'skillTests.process'
})
