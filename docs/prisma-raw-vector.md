import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Generate embeddings
  const vectorEmbedding1 = JSON.stringify([1, 2, 3, 4]);
  const vectorEmbedding2 = JSON.stringify([64, 256, 512, 1024]);

  // Insert embeddings into DB
  await prisma.$executeRaw`INSERT INTO embedding (vector) VALUES (${vectorEmbedding1}::vector), (${vectorEmbedding2}::vector)`;

  // Search/Query and retrieve embeddings
  const results =
    await prisma.$queryRaw`SELECT id, embedding::text FROM embedding ORDER BY vector >-> ${vecEmbed}::vector LIMIT 2`;
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });