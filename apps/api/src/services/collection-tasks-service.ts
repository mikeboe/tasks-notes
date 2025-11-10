import { db } from "../db";
import { collectionTasks, collections } from "../schema/collections-schema";
import { notes } from "../schema/notes-schema";
import { eq } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { searchCollectionByVector } from "./embeddings-service";

// Platform-wide LLM (user will be billed later)
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Execute a collection task (async, no queue)
 */
export async function executeCollectionTask(taskId: string): Promise<void> {
  const task = await db.select()
    .from(collectionTasks)
    .where(eq(collectionTasks.id, taskId))
    .limit(1);

  if (!task || task.length === 0) {
    throw new Error('Task not found');
  }

  const taskData = task[0];

  try {
    // Update status to running
    await db.update(collectionTasks)
      .set({
        status: 'running',
        startedAt: new Date(),
        progress: 10,
      })
      .where(eq(collectionTasks.id, taskId));

    let result: any;

    switch (taskData.taskType) {
      case 'summary':
        result = await generateCollectionSummary(taskData.collectionId, taskId);
        break;
      case 'common_themes':
        result = await findCommonThemes(taskData.collectionId, taskId);
        break;
      case 'research':
        result = await conductResearch(taskData.collectionId, taskData.input, taskId);
        break;
      case 'podcast':
        result = await generatePodcastScript(taskData.collectionId, taskId);
        break;
      case 'outline':
        result = await generateOutline(taskData.collectionId, taskId);
        break;
      default:
        throw new Error(`Unknown task type: ${taskData.taskType}`);
    }

    // Get collection to determine userId and teamId
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, taskData.collectionId))
      .limit(1);

    const collectionData = collection[0];

    // Save result as a note
    const [resultNote] = await db.insert(notes).values({
      title: `${taskData.title} - Result`,
      content: result.content,
      searchableContent: result.content,
      userId: collectionData.userId,
      teamId: collectionData.teamId,
      isHiddenContent: false, // Task results are visible
    }).returning();

    // Update task with result
    await db.update(collectionTasks)
      .set({
        status: 'completed',
        result: JSON.stringify(result),
        resultNoteId: resultNote.id,
        completedAt: new Date(),
        progress: 100,
      })
      .where(eq(collectionTasks.id, taskId));

  } catch (error) {
    console.error('Task execution error:', error);

    await db.update(collectionTasks)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(collectionTasks.id, taskId));

    throw error;
  }
}

/**
 * Update task progress
 */
async function updateProgress(taskId: string, progress: number): Promise<void> {
  await db.update(collectionTasks)
    .set({ progress })
    .where(eq(collectionTasks.id, taskId));
}

async function generateCollectionSummary(
  collectionId: string,
  taskId: string
): Promise<any> {
  await updateProgress(taskId, 20);

  // Gather relevant content using vector search
  const queries = [
    "main topics and themes",
    "key findings and conclusions",
    "important details and context",
  ];

  const allContent: string[] = [];

  for (const query of queries) {
    const results = await searchCollectionByVector(collectionId, query, 5);
    allContent.push(...results.map(r => r.content));
  }

  await updateProgress(taskId, 60);

  // Generate summary using LLM
  const prompt = `Generate a comprehensive summary of the following content from a collection:

${allContent.join('\n\n---\n\n')}

Provide a well-structured summary covering:
1. Main topics and themes
2. Key findings and insights
3. Important details and context

Format as markdown.`;

  const response = await llm.invoke(prompt);

  await updateProgress(taskId, 90);

  return {
    type: 'summary',
    content: response.content as string,
    generatedAt: new Date().toISOString(),
  };
}

async function findCommonThemes(
  collectionId: string,
  taskId: string
): Promise<any> {
  await updateProgress(taskId, 20);

  const results = await searchCollectionByVector(
    collectionId,
    "themes patterns topics concepts ideas",
    10
  );

  await updateProgress(taskId, 50);

  const prompt = `Analyze the following content and identify common themes, patterns, and recurring topics:

${results.map(r => r.content).join('\n\n---\n\n')}

List the main themes with:
- Theme name
- Description
- Key examples from the content

Format as markdown.`;

  const response = await llm.invoke(prompt);

  await updateProgress(taskId, 90);

  return {
    type: 'common_themes',
    content: response.content as string,
    generatedAt: new Date().toISOString(),
  };
}

async function generatePodcastScript(
  collectionId: string,
  taskId: string
): Promise<any> {
  await updateProgress(taskId, 20);

  const results = await searchCollectionByVector(
    collectionId,
    "interesting insights key points stories examples",
    10
  );

  await updateProgress(taskId, 50);

  const prompt = `Create an engaging podcast script based on this content:

${results.map(r => r.content).join('\n\n---\n\n')}

Format as a conversational dialogue between two hosts discussing the content.
Include:
- Opening hook
- Main discussion points
- Interesting insights and examples
- Closing summary

Format as markdown with speaker labels.`;

  const response = await llm.invoke(prompt);

  await updateProgress(taskId, 90);

  return {
    type: 'podcast',
    content: response.content as string,
    generatedAt: new Date().toISOString(),
  };
}

async function conductResearch(
  collectionId: string,
  input: string | null,
  taskId: string
): Promise<any> {
  await updateProgress(taskId, 20);

  const researchQuery = input ? JSON.parse(input).query : "research findings insights";

  const results = await searchCollectionByVector(collectionId, researchQuery, 10);

  await updateProgress(taskId, 60);

  const prompt = `Conduct research analysis on: ${researchQuery}

Based on this content:
${results.map(r => r.content).join('\n\n---\n\n')}

Provide:
1. Research findings
2. Analysis and insights
3. Supporting evidence
4. Conclusions

Format as markdown.`;

  const response = await llm.invoke(prompt);

  await updateProgress(taskId, 90);

  return {
    type: 'research',
    query: researchQuery,
    content: response.content as string,
    generatedAt: new Date().toISOString(),
  };
}

async function generateOutline(
  collectionId: string,
  taskId: string
): Promise<any> {
  await updateProgress(taskId, 20);

  const results = await searchCollectionByVector(
    collectionId,
    "structure organization topics sections",
    10
  );

  await updateProgress(taskId, 60);

  const prompt = `Create a structured outline from this content:

${results.map(r => r.content).join('\n\n---\n\n')}

Generate a hierarchical outline with:
- Main sections
- Subsections
- Key points under each

Format as markdown with proper heading levels.`;

  const response = await llm.invoke(prompt);

  await updateProgress(taskId, 90);

  return {
    type: 'outline',
    content: response.content as string,
    generatedAt: new Date().toISOString(),
  };
}
