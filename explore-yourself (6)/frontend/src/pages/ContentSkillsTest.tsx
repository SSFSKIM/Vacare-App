import { createSkillTestPage } from './skill-tests/createSkillTestPage'

export default createSkillTestPage({
  filterNames: [
    'Active Listening',
    'Mathematics',
    'Reading Comprehension',
    'Science',
    'Speaking',
    'Writing'
  ],
  storeKey: 'content',
  subsetKey: 'content',
  translationKey: 'skillTests.content'
})
