import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'education_training_knowledge_test_progress',
  answersStorageKey: 'education-training-knowledge-answers',
  subsetKey: 'education & training',
  storeKey: 'education-training-knowledge',
  filterNames: [
    'Education and Training',
    'Therapy and Counseling'
  ],
  translationKey: 'knowledgeTests.educationTraining'
})
