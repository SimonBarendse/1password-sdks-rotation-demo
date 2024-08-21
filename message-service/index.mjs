import sdk from "@1password/sdk";
import twilio from "twilio";

export const handler = async (event) => {

  const opClient = await sdk.createClient({
    auth: process.env.OP_SERVICE_ACCOUNT_TOKEN,
    integrationName: "Simons Demo - Message Service",
    integrationVersion: "v0.1.0",
  });

  const sid = opClient.secrets.resolve("op://message-service/twilio/sid");
  const secret = opClient.secrets.resolve("op://message-service/twilio/secret");
  const accountSID = opClient.secrets.resolve("op://message-service/twilio/accountsid");

  const simonsPhoneNumber = opClient.secrets.resolve("op://message-service/simon/phone");

  const twilioClient = twilio(await sid, await secret, { accountSid: await accountSID });

  await twilioClient.messages.create({
    body: 'Hello from Lambda!',
    from: '+12513095325',
    to: await simonsPhoneNumber,
  });

  const response = {
    statusCode: 200,
    body: "",
  };
  return response;
};
