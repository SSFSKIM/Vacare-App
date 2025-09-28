import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'law_safety_knowledge_test_progress',
  answersStorageKey: 'law-safety-knowledge-answers',
  subsetKey: 'law & safety',
  storeKey: 'law-safety-knowledge',
  filterNames: [
    'Public Safety and Security',
    'Law and Government'
  ],
  translationKey: 'knowledgeTests.lawSafety'
})
