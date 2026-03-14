import { verifyContent } from "./src/services/geminiService.js";
import { config } from "dotenv";

config({ path: "./.env" });

async function runTest() {
  console.log("Testing verifyContent...");
  try {
    const result = await verifyContent("The earth is flat");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTest();
