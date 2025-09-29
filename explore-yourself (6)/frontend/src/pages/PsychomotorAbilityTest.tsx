import { createAbilityTestPage } from './ability-tests/createAbilityTestPage'

export default createAbilityTestPage({
  storageKey: 'psychomotor-ability-answers',
  storeKey: 'psychomotor-ability',
  apiSubset: 'psychomotor',
  filterCategory: 'Psychomotor',
  translationKey: 'abilityTests.psychomotor'
})
