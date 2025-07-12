import { AzureOpenAI } from "openai";

const apiKey = process.env.AZURE_KEY;
const apiVersion = "2024-04-01-preview";
const endpoint = "https://clu3.openai.azure.com/";
const modelName = "gpt-4.1";
const deployment = "gpt-4.1";
const options = { endpoint, apiKey, deployment, apiVersion };

const client = new AzureOpenAI(options);

export { client };
