import { askGemini } from "./src/gemini";
import prisma from "./src/prisma";

async function test() {
  const products = await prisma.product.findMany();
  const context = products.map(p => `- ${p.name}: سعره ${p.price} ج.م والمخزون ${p.stock}`).join("\n");
  console.log("Context:\n", context);

  const reply = await askGemini("مساء الخير، عندكم لابتوبات كويسة في حدود 30 إلى 35 ألف؟", context);
  console.log("\nGemini Reply:\n", reply);
}

test().catch(console.error).finally(() => prisma.$disconnect());
