import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'math_science_knowledge_test_progress',
  answersStorageKey: 'math-science-knowledge-answers',
  subsetKey: 'math & science',
  storeKey: 'math-science-knowledge',
  filterNames: [
    'Chemistry',
    'Mathematics',
    'Biology',
    'Physics',
    'Geography'
  ],
  translationKey: 'knowledgeTests.mathScience',
  showRatingToast: true
})
