import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'manufacturing_production_knowledge_test_progress',
  answersStorageKey: 'manufacturing-production-knowledge-answers',
  subsetKey: 'manufacturing & production',
  storeKey: 'manufacturing-production-knowledge',
  filterNames: [
    'Production and Processing',
    'Food Production'
  ],
  translationKey: 'knowledgeTests.manufacturingProduction'
})
