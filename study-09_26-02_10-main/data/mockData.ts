import { StudyData } from '../types';

export const mockStudyData: StudyData = {
  totalStudyTime: 128,
  dailyAverage: 2.5,
  streak: 15,
  motivation: "Continue firme, cada dia conta!",
  performance: [
    { id: '1', name: 'LEGISLAÇÃO EXTRAVAGANTE', studyTime: 86, correctAnswers: 86, incorrectAnswers: 25 },
    { id: '2', name: 'RLM', studyTime: 520, correctAnswers: 0, incorrectAnswers: 0 },
    { id: '3', name: 'DIREITO PENAL', studyTime: 327, correctAnswers: 37, incorrectAnswers: 13 },
    { id: '4', name: 'DIREITO ADMINISTRATIVO', studyTime: 324, correctAnswers: 47, incorrectAnswers: 34 },
    { id: '5', name: 'PORTUGUÊS', studyTime: 1243, correctAnswers: 0, incorrectAnswers: 0 },
    { id: '6', name: 'DIREITO PROCESSUAL PENAL', studyTime: 229, correctAnswers: 17, incorrectAnswers: 7 },
    { id: '7', name: 'DIREITOS HUMANOS', studyTime: 70, correctAnswers: 8, incorrectAnswers: 4 },
    { id: '8', name: 'INFORMÁTICA', studyTime: 65, correctAnswers: 0, incorrectAnswers: 0 },
    { id: '9', name: 'DIREITO CONSTITUCIONAL', studyTime: 126, correctAnswers: 23, incorrectAnswers: 8 },
  ],
  weeklyGoal: {
    timeGoal: 20,
    timeCompleted: 14,
    questionsDone: 350,
    correctAnswers: 290,
  },
  syllabus: {
    totalTopics: 150,
    completedTopics: 95,
  },
  recentActivities: [
    { id: 'act1', description: 'Estudo de Direito Constitucional', timestamp: 'Hoje' },
    { id: 'act2', description: 'Resolução de 50 questões de Português', timestamp: 'Hoje' },
    { id: 'act3', description: 'Revisão de Matemática', timestamp: 'Ontem' },
  ],
  scheduledReviews: [
    { id: 'rev1', subject: 'Direito Administrativo', date: 'Amanhã' },
    { id: 'rev2', subject: 'Português', date: '25/07/2024' },
    { id: 'rev3', subject: 'Matemática', date: '27/07/2024' },
  ],
  weeklyStudy: [
      { day: 'DOM', time: 0, questions: 0 },
      { day: 'SEG', time: 120, questions: 30 },
      { day: 'TER', time: 90, questions: 25 },
      { day: 'QUA', time: 150, questions: 50 },
      { day: 'QUI', time: 510, questions: 85 },
      { day: 'SEX', time: 60, questions: 20 },
      { day: 'SAB', time: 90, questions: 40 },
  ],
  dailyStudyTime: 135,
};