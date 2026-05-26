import { Question } from '../types';

/**
 * Persistently stores a question that the user answered incorrectly for a specific chapter/node.
 */
export function addFailedQuestion(nodeId: string, question: Question): void {
  try {
    const key = `socrates_failed_questions_${nodeId}`;
    const saved = localStorage.getItem(key);
    let questions: Question[] = saved ? JSON.parse(saved) : [];

    // Avoid duplicates by checking the question ID
    if (!questions.some(q => q.id === question.id)) {
      questions.push(question);
      localStorage.setItem(key, JSON.stringify(questions));
    }
  } catch (error) {
    console.error('Failed to add incorrect question to storage:', error);
  }
}

/**
 * Retrieves the list of persistently stored incorrect questions for a specific chapter/node.
 */
export function getFailedQuestions(nodeId: string): Question[] {
  try {
    const key = `socrates_failed_questions_${nodeId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to retrieve incorrect questions:', error);
    return [];
  }
}

/**
 * Clears the file list of failed questions for a specific chapter/node after successful review completion.
 */
export function clearFailedQuestions(nodeId: string): void {
  try {
    const key = `socrates_failed_questions_${nodeId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear incorrect questions database:', error);
  }
}
