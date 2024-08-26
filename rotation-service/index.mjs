import sdk from "@1password/sdk";
import twilio from "twilio";

export const handler = async (event) => {

  const client = await sdk.createClient({
    auth: process.env.OP_SERVICE_ACCOUNT_TOKEN,
    integrationName: "Simons Demo - Rotation Service - Twilio",
    integrationVersion: "v0.1.0",
  });

  const twilioAccountSID = client.secrets.resolve("op://rotation-service/twilio/account-sid");
  const twilioAuthToken = client.secrets.resolve("op://rotation-service/twilio/auth-token");

  // Fetch Twilio API Key from the message-service vault.
  const itemRequest = client.items.get("syatozojhabsggshzzacxn7m5u", "nx4rwfhmh6q3yyflykqtzrixz4");

  const twilioClient = twilio(await twilioAccountSID, await twilioAuthToken);
  const newAPIKeyRequest = twilioClient.newKeys.create({
    friendlyName: "Message Service API Key",
  });

  // To enable zero downtime deployments, we'll leave the current key
  // active until the next rotation.
  // This gives services using the API Key the chance to load the new API Key first.
  // We then revoke the API Key that was rolled in the previous invocation.

  const item = await itemRequest;
  const rolledKeySID = item.fields.find(f => f.title == "rolledKeySID").value;
  twilioClient.keys(rolledKeySID).remove();

  const newAPIKey = await newAPIKeyRequest;

  let newItem = {
    ...item,
    fields: item.fields.map((f) => {
      if (f.title == "rolledKeySID") {
        return { ...f, value: item.fields.find(f => f.title == "sid").value};
      } else if (f.title == "sid") {
        return { ...f, value: newAPIKey.sid};
      } else if (f.title == "secret") {
        return { ...f, value: newAPIKey.secret};
      } else {
        return f;
      }
    }),
  };

  await client.items.put(newItem);

  const response = {
    statusCode: 200,
  };

  return response;
};