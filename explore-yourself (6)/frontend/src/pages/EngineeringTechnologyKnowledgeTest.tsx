import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'engineering_technology_knowledge_test_progress',
  answersStorageKey: 'engineering-technology-knowledge-answers',
  subsetKey: 'engineering & technology',
  storeKey: 'engineering-technology-knowledge',
  filterNames: [
    'Design',
    'Computers and Electronics',
    'Building and Construction',
    'Engineering and Technology',
    'Mechanical'
  ],
  translationKey: 'knowledgeTests.engineeringTechnology'
})
