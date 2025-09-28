import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'arts_humanities_knowledge_test_progress',
  answersStorageKey: 'arts-humanities-knowledge-answers',
  subsetKey: 'arts & humanities',
  storeKey: 'arts-humanities-knowledge',
  filterNames: [
    'Philosophy and Theology',
    'Foreign Language',
    'English Language',
    'History and Archeology',
    'Fine Arts'
  ],
  translationKey: 'knowledgeTests.artsHumanities',
  showRatingToast: true
})
