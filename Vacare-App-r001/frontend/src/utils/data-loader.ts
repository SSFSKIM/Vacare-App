import { doc, getDoc } from 'firebase/firestore';
import { assessmentsCollection } from './firestore';

/**
 * Calculates the delay for the next retry attempt using exponential backoff with jitter.
 * This prevents overwhelming the server and avoids the "thundering herd" problem.
 * @param attempt The current retry attempt number (0-indexed).
 * @returns The calculated delay in milliseconds.
 */
function calculateDelay(attempt: number): number {
  const baseDelay = 500; // Start with 500ms
  const maxDelay = 16000; // Cap at 16 seconds
  const backoffMultiplier = 2;
  const jitterFactor = 0.2; // Add randomness

  const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter to prevent clients from retrying simultaneously
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
}

/**
 * A simple sleep utility.
 * @param ms The number of milliseconds to wait.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Attempts to fetch a user's assessment document from Firestore with a robust
 * retry mechanism using exponential backoff.
 * @param userId The ID of the user whose assessment is to be fetched.
 * @param maxRetries The maximum number of retry attempts.
 * @returns A promise that resolves with the AssessmentData if found, or null if not.
 * @throws An error if all retry attempts fail.
 */
export async function getAssessmentWithRetry(userId: string, maxRetries = 5) {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries + 1} to load user assessment...`);
      const assessmentRef = doc(assessmentsCollection, userId);
      const docSnapshot = await getDoc(assessmentRef);
      
      if (docSnapshot.exists()) {
        console.log('✅ User assessment data loaded successfully.');
        return docSnapshot.data();
      } else {
        // Document doesn't exist, which is a valid success case (new user).
        console.log('ℹ️ No existing assessment document found for user.');
        return null;
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        break; // Don't wait after the last attempt
      }
      
      const delay = calculateDelay(attempt);
      console.log(`⏳ Waiting ${delay.toFixed(0)}ms before retry...`);
      await sleep(delay);
    }
  }
  
  // If the loop completes without success, all retries have been exhausted.
  console.error('🚨 All retry attempts to fetch assessment data have been exhausted.');
  throw new Error(`Failed to connect to the database after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}
