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
  const rolledKeySID = getField(item, "rolledKeySID");
  twilioClient.keys(rolledKeySID).remove();

  const newAPIKey = await newAPIKeyRequest;

  setField(item, "rolledKeySID", getField(item, "sid"));
  setField(item, "sid", newAPIKey.sid);
  setField(item, "secret", newAPIKey.secret);

  await client.items.put(item);

  const response = {
    statusCode: 200,
  };

  return response;
};

// TODO: This needs to be a first-class method on the SDK itself
// (e.g. `item.setField(name, value)`), so you don't need to
// build this yourself as an integration author.
function setField(item, fieldName, value) {
  for (const i in item.fields) {
    const f = item.fields[i];
    if (f.title == fieldName) {
      f.value = value;
      return item;
    }
  }
  throw new Error("Field not found: " + fieldName);
}

// TODO: This needs to be a first-class method on the SDK itself
// (e.g. `item.getField(name)`), so you don't need to build
// this yourself as an integration author.
function getField(item, fieldName) {
  for (const i in item.fields) {
    const f = item.fields[i];
    if (f.title == fieldName) {
      return f.value;
    }
  }
  throw new Error("Field not found: " + fieldName);
}
