import express, { Router, Request, Response } from "express";
import axios from "axios";
import { google } from "googleapis";
import { Worker, QueueScheduler } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// Google OAuth credentials
const googleClientId = process.env.GOOGLE_CLIENT_ID!;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!;

// Outlook OAuth credentials
const outlookClientId = process.env.OUTLOOK_CLIENT_ID!;
const outlookClientSecret = process.env.OUTLOOK_CLIENT_SECRET!;

// Setting up google oauth client
const oAuth2Client = new google.auth.OAuth2(googleClientId, googleClientSecret);

// Setting up bullmq queue and scheduler
const queueName = "emailTasks";
const queue = new Worker(queueName, async job => {
  const emailContent: string = job.data.emailContent;
  const label = await categorizeEmail(emailContent);
  
})

app.get("/", (req: Request, res: Response) => {
  res
    .status(200)
    .json({ message: "Welcome to the Google and Outlook mail parser API!" });
});

async function analyzeEmailContent(emailContent: string): Promise<string> {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "text-davinci-003",
        prompt: emailContent,
        max_tokens: 50,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error("Error analyzing email content", error);
    throw error;
  }
}

const PORT: number = parseInt(process.env.PORT || "3000");

app.listen(PORT, () => {
  console.log("listening on port", PORT);
});
