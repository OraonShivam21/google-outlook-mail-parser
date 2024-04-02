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
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI!;

// Outlook OAuth credentials
const outlookClientId = process.env.OUTLOOK_CLIENT_ID!;
const outlookClientSecret = process.env.OUTLOOK_CLIENT_SECRET!;
const outlookRedirectUri = process.env.OUTLOOK_REDIRECT_URI!;

// Setting up google oauth client
const oAuth2Client = new google.auth.OAuth2(
  googleClientId,
  googleClientSecret,
  googleRedirectUri
);

// Setting up bullmq queue and scheduler
const queueName = "emailTasks";
const bullQueue = new Worker(queueName, async (job) => {
  const emailContent: string = job.data.emailContent;
  const label = await categorizeEmail(emailContent);
  console.log(`Categorized email with: ${label}`);

  return label;
});

const scheduler = new QueueScheduler(queueName);

app.get("/", (req: Request, res: Response) => {
  res
    .status(200)
    .json({ message: "Welcome to the Google and Outlook mail parser API!" });
});

// Google OAuth routes
app.get("/auth/google", (req: Request, res: Response) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://mail.google.com"],
  });
  res.redirect(authUrl);
});

app.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code as string);
    // Storing token securely and accessing GMail API using token
    res.status(200).json({
      message: "Authentication successfull! You can now access Gmail",
      token: tokens,
    });
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    res.status(500).send("Error occurred during authentication");
  }
});

// Outlook OAuth routes
app.get("/auth/outlook", async (req: Request, res: Response) => {
  const { code } = req.query;
  try {
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      {
        client_id: outlookClientId,
        client_secret: outlookClientSecret,
        code,
        redirect_uri: outlookRedirectUri,
        grant_type: "authorization-code",
      }
    );
    const accessToken = tokenResponse.data.access_token;
    res.status(200).json({
      message: "Authentication successfull! Now you can access Outlook",
      token: accessToken,
    });
  } catch (error) {
    console.error("Error authenticating with Outlook:", error);
    res.status(500).send("Error occurred during authentication");
  }
});

// Email processing route
app.get("/process-email", async (req: Request, res: Response) => {
  const { email, subject, body } = req.body;
  await bullQueue.add({ body });
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

async function categorizeEmail(emailContent: string): Promise<string> {
  try {
    const analyzedContent = await analyzeEmailContent(emailContent);
    if (analyzedContent.includes("interested")) return "Interested";
    else if (analyzedContent.includes("not interested"))
      return "Not Interested";
    else return "More Information";
  } catch (error) {
    console.error("Error categorizing email", error);
    throw error;
  }
}

const PORT: number = parseInt(process.env.PORT || "3000");

app.listen(PORT, () => {
  console.log("listening on port", PORT);
});
