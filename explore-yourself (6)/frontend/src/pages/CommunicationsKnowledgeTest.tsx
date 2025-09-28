import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'communications_knowledge_test_progress',
  answersStorageKey: 'communications-knowledge-answers',
  subsetKey: 'communications',
  storeKey: 'communications-knowledge',
  filterNames: ['Telecommunications', 'Communications and Media'],
  translationKey: 'knowledgeTests.communications'
})
