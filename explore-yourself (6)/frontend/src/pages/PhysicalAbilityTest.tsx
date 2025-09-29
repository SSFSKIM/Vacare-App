import { createAbilityTestPage } from './ability-tests/createAbilityTestPage'

export default createAbilityTestPage({
  storageKey: 'physical-ability-answers',
  storeKey: 'physical-ability',
  apiSubset: 'physical',
  filterCategory: 'Physical',
  translationKey: 'abilityTests.physical'
})
