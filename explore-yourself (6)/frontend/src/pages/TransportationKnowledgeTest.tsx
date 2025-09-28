import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'transportation_knowledge_test_progress',
  answersStorageKey: 'transportation-knowledge-answers',
  subsetKey: 'transportation',
  storeKey: 'transportation-knowledge',
  filterNames: [
    'Transportation',
    'Aviation',
    'Maritime Transportation'
  ],
  translationKey: 'knowledgeTests.transportation',
  showRatingToast: true
})
