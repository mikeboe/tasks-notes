/**
 * Course API Client Library
 * Provides a clean interface to interact with the course management API
 */

import { authenticatedRequest } from "./auth-api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const COURSE_API_BASE = `${API_BASE_URL}/courses`;

// Types based on the course schema
export interface Course {
  id: string;
  title: string;
  description?: string;
  level?: string; // UUID - for form submissions
  category?: string; // UUID - for form submissions
  levelName?: string; // Display name - populated by backend joins
  categoryName?: string; // Display name - populated by backend joins
  createdAt: string;
  updatedAt: string;
  published: boolean;
  publishedAt?: string;
  authorId: string;
  thumbnail?: string;
  instructor?: string;
}

export interface Level {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  publishedAt?: string;
  authorId: string;
  thumbnail?: string;
  content: string;
  duration: number;
}

export interface ChapterVideo {
  id: string;
  chapterId: string;
  videoUrl: string;
  transcript?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterQuiz {
  id: string;
  chapterId: string;
  title: string;
  description?: string;
  passingScore: number;
  randomizeQuestions: boolean;
  questionsPerQuiz: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  explanation?: string;
  order: number;
  options: QuestionOption[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect?: boolean; // Only included in admin API
  order: number;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  passed: boolean;
  answers: string; // JSON string
  questionsUsed: string; // JSON string
  completedAt: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  chapterId: string;
  contentCompleted: boolean;
  videoCompleted: boolean;
  quizCompleted: boolean;
  quizScore?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Request types
export interface CreateCourseRequest {
  title: string;
  description?: string;
  level?: string;
  category?: string;
  published?: boolean;
  authorId: string;
  thumbnail?: string;
  instructor?: string;
}

export interface UpdateCourseRequest {
  id: string;
  title?: string;
  description?: string;
  level?: string;
  category?: string;
  published?: boolean;
  thumbnail?: string;
  instructor?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  id: string;
  name?: string;
  description?: string;
}

export interface CreateLevelRequest {
  name: string;
}

export interface UpdateLevelRequest {
  id: string;
  name?: string;
}

export interface CreateChapterRequest {
  courseId: string;
  title: string;
  description?: string;
  position: number;
  published?: boolean;
  authorId: string;
  thumbnail?: string;
  content: string;
  duration: number;
}

export interface UpdateChapterRequest {
  id: string;
  courseId: string;
  title?: string;
  description?: string;
  position?: number;
  published?: boolean;
  thumbnail?: string;
  content?: string;
  duration?: number;
}

export interface CourseSearchParams {
  query?: string;
  category?: string;
  level?: string;
  authorId?: string;
  published?: boolean;
  page?: number;
  limit?: number;
}

// Video request types
export interface CreateVideoRequest {
  chapterId: string;
  videoUrl: string;
  transcript?: string;
}

export interface UpdateVideoRequest {
  id: string;
  videoUrl?: string;
  transcript?: string;
}

// Quiz request types
export interface CreateQuizRequest {
  chapterId: string;
  title: string;
  description?: string;
  passingScore?: number;
  randomizeQuestions?: boolean;
  questionsPerQuiz?: number;
}

export interface UpdateQuizRequest {
  id: string;
  title?: string;
  description?: string;
  passingScore?: number;
  randomizeQuestions?: boolean;
  questionsPerQuiz?: number;
}

export interface CreateQuestionRequest {
  quizId: string;
  question: string;
  explanation?: string;
  order: number;
  options: {
    text: string;
    isCorrect: boolean;
    order: number;
  }[];
}

export interface UpdateQuestionRequest {
  id: string;
  question?: string;
  explanation?: string;
  order?: number;
  options?: {
    id?: string; // For existing options
    text: string;
    isCorrect: boolean;
    order: number;
  }[];
}

export interface SubmitQuizRequest {
  quizId: string;
  answers: {
    questionId: string;
    selectedOptionId: string;
  }[];
}

export interface UpdateProgressRequest {
  chapterId: string;
  contentCompleted?: boolean;
  videoCompleted?: boolean;
}

export interface Statistics {
  totalCourses: number;
  totalChapters: number;
  publishedCourses: number;
}

// Response types
export type CourseResponse = Course;

export interface CoursesResponse {
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type CategoryResponse = Category;

export type CategoriesResponse = Category[];

export type LevelResponse = Level;

export type LevelsResponse = Level[];

export type ChapterResponse = Chapter;

export type ChaptersResponse = Chapter[];

export interface ErrorResponse {
  message: string;
  errors?: any[];
}

/**
 * Makes HTTP requests with proper error handling and authentication
 */
async function courseApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${COURSE_API_BASE}${endpoint}`;

  const response = await authenticatedRequest(url, options);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorData: any = {};

    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  // For 204 No Content responses, return empty object
  if (response.status === 204) {
    return {} as T;
  }

  const apiResponse = await response.json();
  return apiResponse;
}

/**
 * Course API Client
 */
export class CourseApi {
  // ========== COURSE OPERATIONS ==========

  /**
   * Get all courses with optional filtering
   */
  static async getCourses(
    params?: CourseSearchParams
  ): Promise<CoursesResponse> {
    const searchParams = new URLSearchParams();

    if (params?.query) searchParams.append("query", params.query);
    if (params?.category) searchParams.append("category", params.category);
    if (params?.level) searchParams.append("level", params.level);
    if (params?.authorId) searchParams.append("authorId", params.authorId);
    if (params?.published !== undefined)
      searchParams.append("published", params.published.toString());
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const endpoint = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";
    return courseApiRequest<CoursesResponse>(endpoint);
  }

  /**
   * Get a specific course by ID
   */
  static async getCourseById(id: string): Promise<CourseResponse> {
    return courseApiRequest<CourseResponse>(`/${id}`);
  }

  /**
   * Create a new course
   */
  static async createCourse(
    courseData: CreateCourseRequest
  ): Promise<CourseResponse> {
    return courseApiRequest<CourseResponse>("", {
      method: "POST",
      body: JSON.stringify(courseData),
    });
  }

  /**
   * Update an existing course
   */
  static async updateCourse(
    courseData: UpdateCourseRequest
  ): Promise<CourseResponse> {
    return courseApiRequest<CourseResponse>(`/${courseData.id}`, {
      method: "PUT",
      body: JSON.stringify(courseData),
    });
  }

  /**
   * Delete a course
   */
  static async deleteCourse(id: string): Promise<void> {
    await courseApiRequest(`/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Publish/unpublish a course
   */
  static async toggleCoursePublication(
    id: string,
    published: boolean
  ): Promise<CourseResponse> {
    return courseApiRequest<CourseResponse>(`/${id}/publish`, {
      method: "PATCH",
      body: JSON.stringify({ published }),
    });
  }

  // ========== CHAPTER OPERATIONS ==========

  /**
   * Get chapters for a specific course
   */
  static async getChaptersByCourse(
    courseId: string
  ): Promise<ChaptersResponse> {
    return courseApiRequest<ChaptersResponse>(`/${courseId}/chapters`);
  }

  /**
   * Get a specific chapter by ID
   */
  static async getChapterById(chapterId: string): Promise<ChapterResponse> {
    return courseApiRequest<ChapterResponse>(`/chapters/${chapterId}`);
  }

  /**
   * Create a new chapter
   */
  static async createChapter(
    chapterData: CreateChapterRequest
  ): Promise<ChapterResponse> {
    return courseApiRequest<ChapterResponse>(
      `/${chapterData.courseId}/chapters`,
      {
        method: "POST",
        body: JSON.stringify(chapterData),
      }
    );
  }

  /**
   * Update an existing chapter
   */
  static async updateChapter(
    chapterData: UpdateChapterRequest
  ): Promise<ChapterResponse> {
    return courseApiRequest<ChapterResponse>(`/chapters/${chapterData.id}`, {
      method: "PUT",
      body: JSON.stringify(chapterData),
    });
  }

  /**
   * Delete a chapter
   */
  static async deleteChapter(
    courseId: string,
    chapterId: string
  ): Promise<void> {
    await courseApiRequest(`/${courseId}/chapters/${chapterId}`, {
      method: "DELETE",
    });
  }

  /**
   * Reorder chapters
   */
  static async reorderChapters(
    courseId: string,
    chapterIds: string[]
  ): Promise<ChaptersResponse> {
    return courseApiRequest<ChaptersResponse>(`/${courseId}/chapters/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ chapterIds }),
    });
  }

  /**
   * Publish/unpublish a chapter
   */
  static async toggleChapterPublication(
    courseId: string,
    chapterId: string,
    published: boolean
  ): Promise<ChapterResponse> {
    return courseApiRequest<ChapterResponse>(
      `/${courseId}/chapters/${chapterId}/publish`,
      {
        method: "PATCH",
        body: JSON.stringify({ published }),
      }
    );
  }

  // ========== CATEGORY OPERATIONS ==========

  /**
   * Get all categories
   */
  static async getCategories(): Promise<CategoriesResponse> {
    return courseApiRequest<CategoriesResponse>("/categories");
  }

  /**
   * Get a specific category by ID
   */
  static async getCategoryById(id: string): Promise<CategoryResponse> {
    return courseApiRequest<CategoryResponse>(`/categories/${id}`);
  }

  /**
   * Create a new category
   */
  static async createCategory(
    categoryData: CreateCategoryRequest
  ): Promise<CategoryResponse> {
    return courseApiRequest<CategoryResponse>("/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    });
  }

  /**
   * Update an existing category
   */
  static async updateCategory(
    categoryData: UpdateCategoryRequest
  ): Promise<CategoryResponse> {
    return courseApiRequest<CategoryResponse>(
      `/categories/${categoryData.id}`,
      {
        method: "PUT",
        body: JSON.stringify(categoryData),
      }
    );
  }

  /**
   * Delete a category
   */
  static async deleteCategory(id: string): Promise<void> {
    await courseApiRequest(`/categories/${id}`, {
      method: "DELETE",
    });
  }

  // ========== LEVEL OPERATIONS ==========

  /**
   * Get all levels
   */
  static async getLevels(): Promise<LevelsResponse> {
    return courseApiRequest<LevelsResponse>("/levels");
  }

  /**
   * Get a specific level by ID
   */
  static async getLevelById(id: string): Promise<LevelResponse> {
    return courseApiRequest<LevelResponse>(`/levels/${id}`);
  }

  /**
   * Create a new level
   */
  static async createLevel(
    levelData: CreateLevelRequest
  ): Promise<LevelResponse> {
    return courseApiRequest<LevelResponse>("/levels", {
      method: "POST",
      body: JSON.stringify(levelData),
    });
  }

  /**
   * Update an existing level
   */
  static async updateLevel(
    levelData: UpdateLevelRequest
  ): Promise<LevelResponse> {
    return courseApiRequest<LevelResponse>(`/levels/${levelData.id}`, {
      method: "PUT",
      body: JSON.stringify(levelData),
    });
  }

  /**
   * Delete a level
   */
  static async deleteLevel(id: string): Promise<void> {
    await courseApiRequest(`/levels/${id}`, {
      method: "DELETE",
    });
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get courses by author
   */
  static async getCoursesByAuthor(
    authorId: string,
    published?: boolean
  ): Promise<CoursesResponse> {
    return this.getCourses({ authorId, published });
  }

  /**
   * Search courses by title or description
   */
  static async searchCourses(
    query: string,
    filters?: Omit<CourseSearchParams, "query">
  ): Promise<CoursesResponse> {
    return this.getCourses({ query, ...filters });
  }

  /**
   * Get published courses only
   */
  static async getPublishedCourses(
    filters?: Omit<CourseSearchParams, "published">
  ): Promise<CoursesResponse> {
    return this.getCourses({ published: true, ...filters });
  }

  /**
   * Get draft courses only
   */
  static async getDraftCourses(
    filters?: Omit<CourseSearchParams, "published">
  ): Promise<CoursesResponse> {
    return this.getCourses({ published: false, ...filters });
  }

  // ========== VIDEO OPERATIONS ==========

  /**
   * Create a chapter video
   */
  static async createChapterVideo(
    videoData: CreateVideoRequest
  ): Promise<ChapterVideo> {
    return courseApiRequest<ChapterVideo>(
      `/chapters/${videoData.chapterId}/video`,
      {
        method: "POST",
        body: JSON.stringify(videoData),
      }
    );
  }

  /**
   * Get chapter video
   */
  static async getChapterVideo(chapterId: string): Promise<ChapterVideo> {
    return courseApiRequest<ChapterVideo>(`/chapters/${chapterId}/video`);
  }

  /**
   * Update chapter video
   */
  static async updateChapterVideo(
    videoData: UpdateVideoRequest
  ): Promise<ChapterVideo> {
    return courseApiRequest<ChapterVideo>(`/videos/${videoData.id}`, {
      method: "PUT",
      body: JSON.stringify(videoData),
    });
  }

  /**
   * Delete chapter video
   */
  static async deleteChapterVideo(videoId: string): Promise<void> {
    await courseApiRequest(`/videos/${videoId}`, {
      method: "DELETE",
    });
  }

  // ========== QUIZ OPERATIONS ==========

  /**
   * Create a chapter quiz
   */
  static async createChapterQuiz(
    quizData: CreateQuizRequest
  ): Promise<ChapterQuiz> {
    return courseApiRequest<ChapterQuiz>(
      `/chapters/${quizData.chapterId}/quiz`,
      {
        method: "POST",
        body: JSON.stringify(quizData),
      }
    );
  }

  /**
   * Get chapter quiz
   */
  static async getChapterQuiz(chapterId: string): Promise<ChapterQuiz> {
    return courseApiRequest<ChapterQuiz>(`/chapters/${chapterId}/quiz`);
  }

  /**
   * Get quiz questions for taking the quiz
   */
  static async getQuizQuestions(
    quizId: string
  ): Promise<{ quiz: ChapterQuiz; questions: QuizQuestion[] }> {
    return courseApiRequest<{ quiz: ChapterQuiz; questions: QuizQuestion[] }>(
      `/quizzes/${quizId}/questions`
    );
  }

  /**
   * Create a quiz question (admin)
   */
  static async createQuizQuestion(
    questionData: CreateQuestionRequest
  ): Promise<QuizQuestion> {
    return courseApiRequest<QuizQuestion>(
      `/quizzes/${questionData.quizId}/questions`,
      {
        method: "POST",
        body: JSON.stringify(questionData),
      }
    );
  }

  /**
   * Submit quiz answers
   */
  static async submitQuiz(submitData: SubmitQuizRequest): Promise<{
    attemptId: string;
    score: number;
    passed: boolean;
    correctCount: number;
    totalQuestions: number;
    passingScore: number;
    detailedAnswers: {
      questionId: string;
      selectedOptionId: string;
      correctOptionId: string;
      isCorrect: boolean;
    }[];
  }> {
    return courseApiRequest(`/quizzes/${submitData.quizId}/submit`, {
      method: "POST",
      body: JSON.stringify(submitData),
    });
  }

  // ========== PROGRESS OPERATIONS ==========

  /**
   * Update user progress
   */
  static async updateUserProgress(
    progressData: UpdateProgressRequest
  ): Promise<UserProgress> {
    return courseApiRequest<UserProgress>("/progress", {
      method: "POST",
      body: JSON.stringify(progressData),
    });
  }

  /**
   * Get user progress for a chapter
   */
  static async getUserProgress(chapterId: string): Promise<UserProgress> {
    return courseApiRequest<UserProgress>(`/chapters/${chapterId}/progress`);
  }

  // ========== STATISTICS OPERATIONS ==========

  /**
   * Get platform statistics
   */
  static async getStatistics(): Promise<Statistics> {
    return courseApiRequest<Statistics>("/statistics");
  }
}

export default CourseApi;
