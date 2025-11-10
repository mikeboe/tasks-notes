
import Firecrawl from '@mendable/firecrawl-js';
import { tool } from "langchain";
import { z } from "zod";
import 'dotenv/config';

const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not set in environment variables');
}

export const webScraperToolFirecrawl = tool(
    async ({ url }: { url: string }): Promise<string> => {
        if (!url) {
            throw new Error('URL is required');
        }

        console.log('Fetching web scrape results for URL:', url);
        try {

            const app = new Firecrawl({
                apiKey
            })


            const res = await app.scrape(url, {
                formats: ['markdown'],

            })

            const scraped = {
                markdown: res.markdown,
                title: res.metadata?.title,
                url: res.metadata?.sourceURL,
                description: res.metadata?.description,
                language: res.metadata?.language,
            };

            // Format response as markdown like the Go version
            let formattedResponse = '';
            formattedResponse += '-----\n';
            formattedResponse += `# Title: ${scraped.title || 'N/A'}\n`;
            formattedResponse += `## URL: ${scraped.url || 'N/A'}\n`;
            formattedResponse += `## Description: ${scraped.description || 'N/A'}\n`;
            formattedResponse += `## Language: ${scraped.language || 'N/A'}\n`;
            formattedResponse += '-----\n\n';
            formattedResponse += scraped.markdown || '';

            return formattedResponse;
        } catch (error) {
            console.error('Error fetching web scrape results:', error);
            return `Error fetching web scrape results: ${JSON.stringify(error)}`;
        }
    },
    {
        name: "web_scraper",
        description: "This api gives you access to web scraping capabilities using FireCrawl. This tool allows you to scrape data from a website. You can specify the URL and you will receive the contents of that page.",
        schema: z.object({
            url: z.string().url(),
        }),
    }
)