export type Resume = {
  id?: string;
  userId?: string;
  orgId?: string;
  jobInfo?: JobInfo | null;
  resumeText: string;
  instructions: string;
  createdAt?: number;
  updatedAt?: number;
  updatedText?: string;
};

export type ResumeData = {
  resumeText: string;
  instructions: string;
};

export type JobInfo = {
  jobTitle: string;
  jobUrl: string;
  jobDescription: string;
};

export type ResumeTemplate = 'professional' | 'modern';

export type TemplateOption = {
  id: ResumeTemplate;
  name: string;
  description: string;
  preview: string;
};
