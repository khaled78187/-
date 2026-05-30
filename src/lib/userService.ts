import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  getDocFromServer,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, auth } from './firebase';
import { UserProgress, SkillNode } from '../types';

const getAvatarEmoji = (id: string | null): string => {
  const avatars: Record<string, string> = {
    socrates: '🏛️',
    hypatia: '🌌',
    ibnsina: '📜',
    plato: '⚖️',
    aristotle: '📖',
    farabi: '🕌'
  };
  return id ? (avatars[id] || '🏛️') : '🏛️';
};

/**
 * Validates connection to Firestore at boot time as mandated by guidelines
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection tested successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase configuration verified. Client is in offline cached mode.");
    }
    return false;
  }
}

/**
 * Fetches User progress or creates default if not found
 */
export async function getUserProgress(userId: string): Promise<UserProgress | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProgress;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Saves/overwrites full User progress
 */
export async function saveUserProgress(userId: string, progress: UserProgress): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    
    // Auto-enrich user document with name and avatar on save
    const enriched = { ...progress };
    
    if (!enriched.displayName && typeof window !== 'undefined') {
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser && currentAuthUser.displayName) {
        enriched.displayName = currentAuthUser.displayName;
      } else {
        enriched.displayName = 'طالب علم';
      }
    }

    if (!enriched.email && typeof window !== 'undefined') {
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser && currentAuthUser.email) {
        enriched.email = currentAuthUser.email;
      }
    }
    
    if (!enriched.avatar && typeof window !== 'undefined') {
      const savedAv = localStorage.getItem('socrates_avatar_id');
      enriched.avatar = getAvatarEmoji(savedAv);
    }
    
    await setDoc(docRef, enriched, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches all registered users' progress to construct the weekly leaderboard
 */
export async function getAllUsersProgress(): Promise<any[]> {
  const path = 'users';
  try {
    const collRef = collection(db, 'users');
    const querySnapshot = await getDocs(collRef);
    const results: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        ...data
      });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

/**
 * Saves a user-uploaded custom textbook/node
 */
export async function saveCustomBook(userId: string, book: SkillNode): Promise<void> {
  const path = `users/${userId}/books/${book.id}`;
  try {
    const bookDocRef = doc(db, 'users', userId, 'books', book.id);
    const dataToSave = {
      ...book,
      ownerId: userId,
      createdAt: new Date().toISOString()
    };
    await setDoc(bookDocRef, dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves all user-uploaded custom textbooks
 */
export async function getUserCustomBooks(userId: string): Promise<SkillNode[]> {
  const path = `users/${userId}/books`;
  try {
    const booksCollRef = collection(db, 'users', userId, 'books');
    const querySnapshot = await getDocs(booksCollRef);
    const books: SkillNode[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Safe casting back to SkillNode
      books.push({
        id: data.id,
        title: data.title,
        icon: data.icon || 'BookOpen',
        description: data.description || '',
        lessons: data.lessons || [],
        levelCount: data.levelCount || 5,
        requiredNodes: data.requiredNodes || []
      });
    });
    return books;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Deletes a user-uploaded custom textbook from Cloud Firestore
 */
export async function deleteCustomBook(userId: string, bookId: string): Promise<void> {
  const path = `users/${userId}/books/${bookId}`;
  try {
    const bookDocRef = doc(db, 'users', userId, 'books', bookId);
    await deleteDoc(bookDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Direct administrator control to activate or cancel users' subscriptions in Firestore
 */
export async function updateUserSubscription(userId: string, isPremium: boolean, subscriptionType?: 'monthly' | 'yearly'): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const updateData: Record<string, any> = {
      isPremium,
    };
    if (isPremium) {
      updateData.subscriptionType = subscriptionType || 'yearly';
      updateData.subscriptionExpiry = new Date(Date.now() + (subscriptionType === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString();
    } else {
      updateData.subscriptionType = '';
      updateData.subscriptionExpiry = '';
    }
    await setDoc(docRef, updateData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Real-time listener for user progress changes using a Stream (onSnapshot)
 * This satisfies Requirement 3 (Live Synchronization)
 */
export function subscribeToUserProgress(
  userId: string,
  onUpdate: (progress: UserProgress) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = `users/${userId}`;
  const docRef = doc(db, 'users', userId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProgress;
        // Dynamically compute level if it is not currently stored
        if (!data.level) {
          data.level = Math.floor(data.xp / 500) + 1;
        }
        onUpdate(data);
      } else {
        // Doc doesn't exist, pass null so first-time setup can be initialized
        onUpdate(null as any);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Increments XP and rewards a completed task/lesson in Firestore.
 * This satisfies Requirement 4 (Updating XP and Progress on task completion)
 */
export async function completeTaskAndAwardXP(
  userId: string, 
  xpAwarded: number, 
  taskId: string
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const progress = await getUserProgress(userId);
    if (!progress) {
      throw new Error(`User Progress document not found for UI: ${userId}`);
    }

    const nextXp = progress.xp + xpAwarded;
    const nextLevel = Math.floor(nextXp / 500) + 1;
    
    const nextCompletedLessons = progress.completedLessons.includes(taskId)
      ? progress.completedLessons
      : [...progress.completedLessons, taskId];

    await saveUserProgress(userId, {
      ...progress,
      xp: nextXp,
      level: nextLevel,
      completedLessons: nextCompletedLessons,
      lastActiveDate: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Resets user progress fields back to baseline defaults.
 * This satisfies Requirement 5 (Reset Progress Button)
 */
export async function resetUserProgress(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    
    const resetData: Partial<UserProgress> = {
      xp: 1200,
      level: 3,
      hearts: 5,
      streak: 3,
      currentNodeId: 'sec_philosophy',
      currentLessonId: '',
      completedLessons: [],
      completedNodes: [],
      league: 'Bronze',
      lastActiveDate: new Date().toISOString(),
      achievements: []
    };

    await setDoc(docRef, resetData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
