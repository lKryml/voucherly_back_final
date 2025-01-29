import axios from 'axios';
import bodyParser from 'body-parser';
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const codeLength = 6;
const codeLifetimeInMinutes = 5;

const wabaID = "529181543612845";
const accessToken = "EAAL0eSXLI1wBOxhuhD64CbqZC2vOFguh5SQajnKaMADPcpan0pdZCN2beKumtPuBkoUR5FZAtIpBHi4NBA8G1ZB8UnvZCqNCHpXhyejxOjhZCoGOZBZBP76s2ludiKbDzPYFQ7M1H5KbFcw14G1PypvFfcX8jYfBCwTgeflmaxMyVJZC0GhnzbLFrZBFCSS90Wh2hDUAZDZD";
const phoneNumberID = "537236529472818";
const templateID = "1789381825233357";

interface ActiveCode {
  code: string;
  expirationTimestamp: Date;
}

let activeCodes: Record<string, ActiveCode> = {};

function generateCode(): string {
  const rawCode = Math.floor(Math.random() * (10 ** codeLength));
  return rawCode.toString().padStart(codeLength, '0');
}

async function fetchTemplate(): Promise<any> {
  let templatesURL = `https://graph.facebook.com/v16.0/${wabaID}/message_templates?access_token=${accessToken}`;
  let template = null;

  do {
    try {
      const templatesResponse = await axios.get(templatesURL);
      templatesResponse.data?.data?.forEach((element: any) => {
        if (element.id === templateID) {
          template = element;
        }
      });

      templatesURL = templatesResponse?.data?.paging?.next || null;
    } catch (error: any) {
      console.error(`Error fetching templates: ${error.message}`);
      throw error;
    }
  } while (!template && templatesURL);

  return template;
}

export async function initializeOTPService(app: express.Application) {
  const template = await fetchTemplate();

  if (!template) {
    console.log(`Could not find template with ID ${templateID} for WABA ${wabaID}.`);
    process.exit(1);
  } else if (template?.status !== 'APPROVED') {
    console.log(`Please wait until the template with ID ${templateID} is approved before running this script.`);
    process.exit(1);
  }

  const templateName = template?.name;
  console.log(`Verified OTP template '${templateName}' with ID ${templateID} is approved and ready to send.`);

  // Middleware
  app.use(bodyParser.json());

  // Middleware that gets executed at the end of every request
  app.use((_req: Request, res: Response, next: NextFunction) => {
    console.log("Current time: ", new Date());
    res.on('finish', () => {
      console.log(`Response (${res.statusCode}): ${res.statusMessage}`);
      console.log("Active codes state:");
      console.table(activeCodes);
      console.log();
    });

    next();
  });

  app.get('/otp/:phone_number', async (req: Request, res: Response) => {
    const phone = req.params.phone_number;
    console.log(`OTP requested for phone # ${phone}`);

    const code = generateCode();
    const expirationTimestamp = new Date();
    expirationTimestamp.setMinutes(expirationTimestamp.getMinutes() + codeLifetimeInMinutes);

    const sendMessageURL = `https://graph.facebook.com/v16.0/${phoneNumberID}/messages`;
    const config = {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    };
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en_US"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: code
              }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: code
              }
            ]
          }
        ]
      }
    };

    try {
      await axios.post(sendMessageURL, payload, config);
      activeCodes[phone] = { code, expirationTimestamp };
      res.send();
    } catch (error: any) {
      const errorCode = error.response?.status;
      const errorText = error.response?.data?.error?.error_data?.details;
      console.log(`Error (${errorCode}) from calling send message API: ${errorText}`);
      res.status(500).send('Error calling send message API. Check server logs.');
    }
  });

  app.post('/otp/:phone_number', (req: Request, res: Response) => {
    const phone = req.params.phone_number;
    console.log(`OTP validation request for phone # ${phone}`);

    const { code: expectedCode, expirationTimestamp } = activeCodes[phone] || {};
    if (!expectedCode) {
      res.status(404).send(`No active code for phone # ${phone}`);
      return;
    }

    const actualCode = req.body?.code;
    if (!actualCode) {
      res.status(400).send("No code provided.");
      return;
    } else if (expirationTimestamp < new Date()) {
      delete activeCodes[phone];
      res.status(401).send("Code has expired, please request another.");
      return;
    } else if (actualCode !== expectedCode) {
      res.status(401).send("Incorrect code.");
      return;
    }

    delete activeCodes[phone];
    res.send();
  });
}
