import { MongoClient } from "mongodb";

const uri = "mongodb+srv://alexandersagenonso:5t4yQ4tPgAGclM3R@test.i4uui.mongodb.net/test"; // Replace with your credentials
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected to database");

    const database = client.db("test");
    const collection = database.collection("user");

    const result = await collection.updateMany(
      { telegramId: { $type: "double" } }, // Match documents where telegramId is a number
      [
        {
          $set: {
            telegramId: { $toString: "$telegramId" }
          }
        }
      ]
    );

    console.log(`Updated ${result.modifiedCount} documents`);
  } catch (error) {
    console.error("Error updating documents:", error);
  } finally {
    await client.close();
  }
}

run();
