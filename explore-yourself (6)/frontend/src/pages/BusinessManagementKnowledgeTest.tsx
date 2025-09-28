import { createKnowledgeTestPage } from './knowledge-tests/createKnowledgeTestPage'

export default createKnowledgeTestPage({
  storageKey: 'business_management_knowledge_test_progress',
  answersStorageKey: 'business-management-knowledge-answers',
  subsetKey: 'business & management',
  storeKey: 'business-management-knowledge',
  filterNames: [
    'Customer and Personal Service',
    'Administrative',
    'Sales and Marketing',
    'Administration and Management',
    'Personnel and Human Resources',
    'Economics and Accounting'
  ],
  translationKey: 'knowledgeTests.businessManagement',
  showRatingToast: true
})
