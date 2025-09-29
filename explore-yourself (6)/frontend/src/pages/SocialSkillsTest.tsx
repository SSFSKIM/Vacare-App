import { createSkillTestPage } from './skill-tests/createSkillTestPage'

export default createSkillTestPage({
  filterNames: [
    'Coordination',
    'Instructing',
    'Negotiation',
    'Persuasion',
    'Service Orientation',
    'Social Perceptiveness'
  ],
  storeKey: 'social',
  subsetKey: 'social',
  translationKey: 'skillTests.social'
})
