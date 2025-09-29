import { createAbilityTestPage } from './ability-tests/createAbilityTestPage'

export default createAbilityTestPage({
  storageKey: 'sensory-ability-answers',
  storeKey: 'sensory-ability',
  apiSubset: 'sensory',
  filterCategory: 'Sensory',
  translationKey: 'abilityTests.sensory'
})
