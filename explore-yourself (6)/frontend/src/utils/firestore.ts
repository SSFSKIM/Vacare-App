import { firebaseApp } from "app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { User } from "firebase/auth";
import {
  Answer,
  AbilityAnswer,
  AssessmentResult,
  KnowledgeSubsetResult,
  AbilitySubsetResult,
  SkillSubsetResult,
  CareerRecommendations,
  UserProfile,
  ProfileData,
  AssessmentData,
} from "../types";

// Initialize Firestore
const db = getFirestore(firebaseApp);

// Collection references
const usersCollection = collection(db, "users");
const assessmentsCollection = collection(db, "assessments");

// Helper functions
export const createUserProfile = async (user: User): Promise<void> => {
  if (!user.uid) return;

  const userProfile: UserProfile = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    createdAt: Date.now(),
    lastLogin: Date.now(),
  };

  try {
    await setDoc(doc(usersCollection, user.uid), userProfile);
    console.log('User profile created successfully');
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserLogin = async (user: User): Promise<void> => {
  if (!user.uid) return;

  try {
    await updateDoc(doc(usersCollection, user.uid), {
      lastLogin: Date.now(),
    });
  } catch (error) {
    console.error('Error updating user login:', error);
    // If the document doesn't exist, create it
    if ((error as any).code === 'not-found') {
      await createUserProfile(user);
    } else {
      throw error;
    }
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(usersCollection, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const subscribeToUserProfile = (
  userId: string,
  callback: (profile: UserProfile | null) => void
) => {
  const unsubscribe = onSnapshot(
    doc(usersCollection, userId),
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback(docSnapshot.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to user profile:', error);
      callback(null);
    }
  );

  return unsubscribe;
};

export const saveProfileData = async (
  userId: string,
  profileData: ProfileData,
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      profile: profileData,
      lastUpdated: Date.now(),
    });
  } catch (error) {
    console.error("Error saving profile data:", error);
    throw error;
  }
};

// Assessment operations
export const saveAssessment = async (assessment: AssessmentData): Promise<void> => {
  if (!assessment.userId) return;

  try {
    await setDoc(doc(assessmentsCollection, assessment.userId), {
      ...assessment,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error saving assessment:', error);
    throw error;
  }
};

export const getAssessment = async (userId: string): Promise<AssessmentData | null> => {
  try {
    const docRef = doc(assessmentsCollection, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as AssessmentData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting assessment:', error);
    throw error;
  }
};

export const subscribeToAssessment = (
  userId: string,
  callback: (assessment: AssessmentData | null) => void
) => {
  const unsubscribe = onSnapshot(
    doc(assessmentsCollection, userId),
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback(docSnapshot.data() as AssessmentData);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to assessment:', error);
      callback(null);
    }
  );

  return unsubscribe;
};

// Specific assessment update operations
export const updateInterestAnswers = async (
  userId: string,
  answers: Answer[],
  currentQuestionIndex: number
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'interest.answers': answers,
      'interest.currentQuestionIndex': currentQuestionIndex,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating interest answers:', error);
    throw error;
  }
};

export const updateInterestResults = async (
  userId: string,
  results: AssessmentResult[]
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'interest.results': results,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating interest results:', error);
    throw error;
  }
};

export const updateAbilityAnswers = async (
  userId: string,
  answers: AbilityAnswer[],
  currentQuestionIndex: number
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'ability.answers': answers,
      'ability.currentQuestionIndex': currentQuestionIndex,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating ability answers:', error);
    throw error;
  }
};

export const updateAbilityResults = async (
  userId: string,
  results: AbilitySubsetResult[]
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'ability.results': results,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating ability results:', error);
    throw error;
  }
};

export const updateKnowledgeAnswers = async (
  userId: string,
  answers: Answer[]
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'knowledge.answers': answers,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating knowledge answers:', error);
    throw error;
  }
};

export const updateKnowledgeResults = async (
  userId: string,
  results: KnowledgeSubsetResult[]
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'knowledge.results': results,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating knowledge results:', error);
    throw error;
  }
};

export const updateSkillAnswers = async (
  userId: string,
  answers: Answer[]
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'skills.answers': answers,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating skill answers:', error);
    throw error;
  }
};

export const updateSkillResults = async (
  userId: string,
  results: SkillSubsetResult[]
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      'skills.results': results,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating skill results:', error);
    throw error;
  }
};

export const updateCareerRecommendations = async (
  userId: string,
  recommendations: CareerRecommendations
): Promise<void> => {
  try {
    const assessmentRef = doc(assessmentsCollection, userId);
    await updateDoc(assessmentRef, {
      careerRecommendations: recommendations,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating career recommendations:', error);
    throw error;
  }
};

// Initialize a new assessment for a user
export const initializeAssessment = async (userId: string): Promise<void> => {
  const emptyAssessment: AssessmentData = {
    userId,
    interest: {
      answers: [],
      currentQuestionIndex: 0,
      results: []
    },
    ability: {
      answers: [],
      currentQuestionIndex: 0,
      results: []
    },
    knowledge: {
      answers: [],
      results: []
    },
    skills: {
      answers: [],
      results: []
    },
    careerRecommendations: null,
    lastUpdated: Date.now()
  };

  try {
    await setDoc(doc(assessmentsCollection, userId), emptyAssessment);
  } catch (error) {
    console.error('Error initializing assessment:', error);
    throw error;
  }
};
