import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  getDocFromServer
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
      console.error("Please check your Firebase configuration. Client is offline.");
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
