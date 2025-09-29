import { createSkillTestPage } from './skill-tests/createSkillTestPage'

export default createSkillTestPage({
  filterNames: [
    'Judgment and Decision Making',
    'Systems Analysis',
    'Systems Evaluation'
  ],
  storeKey: 'systems',
  subsetKey: 'systems',
  translationKey: 'skillTests.systems',
  storageKey: 'systems_skills_test_progress'
})
