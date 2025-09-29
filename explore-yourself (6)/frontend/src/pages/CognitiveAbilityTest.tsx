import { createAbilityTestPage } from './ability-tests/createAbilityTestPage'

export default createAbilityTestPage({
  storageKey: 'cognitive-ability-answers',
  storeKey: 'cognitive-ability',
  apiSubset: 'cognitive-ability',
  filterCategory: 'Cognitive',
  translationKey: 'abilityTests.cognitive'
})
