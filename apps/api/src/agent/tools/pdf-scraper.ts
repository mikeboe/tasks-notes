
import { tool } from "langchain";
import { z } from "zod";
import dotenv from "dotenv"
import { Mistral } from "@mistralai/mistralai";

dotenv.config();

const key = process.env.MISTRAL_API_KEY;

export const pdfScraperTool = tool(
    async ({ url }: { url: string }): Promise<string> => {
        if (!url) {
            throw new Error('URL is required');
        }
        console.log('Fetching PDF scrape results for URL:', url);

        try {

            const client = new Mistral({
                apiKey: key || "",
            });

            const result = await client.ocr.process({
                model: 'mistral-ocr-latest',
                document: {
                    documentUrl: url,
                    type: "document_url",
                },
            })

            let pageContent = "";

            if (result && result.pages) {
                for (const page of result.pages) {
                    pageContent += page.markdown + "\n\n";
                }
            }

            return pageContent || "No content extracted from the PDF.";
        } catch (error) {
            console.error('Error fetching PDF scrape results:', error);
            return `Error fetching PDF scrape results: ${JSON.stringify(error)}`;
        }
    },
    {
        name: "pdf_scraper",
        description: "This API provides access to PDF scraping capabilities. You can extract text from a PDF document by providing its URL.",
        schema: z.object({
            url: z.string().url(),
        }),
    }
)