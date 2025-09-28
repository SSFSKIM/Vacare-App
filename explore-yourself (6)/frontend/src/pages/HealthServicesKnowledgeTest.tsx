import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'health_services_knowledge_test_progress',
  answersStorageKey: 'health-services-knowledge-answers',
  subsetKey: 'health services',
  storeKey: 'health-services-knowledge',
  filterNames: [
    'Medicine and Dentistry',
    'Psychology'
  ],
  translationKey: 'knowledgeTests.healthServices'
})
