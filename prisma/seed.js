const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const now = Date.now();
const hoursFromNow = (h) => new Date(now + h * 3600 * 1000);
const hoursAgo = (h) => new Date(now - h * 3600 * 1000);

async function main() {
  const count = await prisma.match.count();
  if (count > 0) {
    console.log(`Skipping seed — ${count} match(es) already in the database.`);
    return;
  }

  await prisma.match.createMany({
    data: [
      {
        title: "Rivers United vs Enyimba",
        competition: "NPFL",
        kickoffAt: hoursFromNow(30),
        tier: 1,
        pick: "Home win",
        featured: true,
      },
      {
        title: "Man City vs Brighton",
        competition: "EPL",
        kickoffAt: hoursAgo(140),
        tier: 1,
        pick: "Home win",
        settled: true,
        result: "win",
      },
      {
        title: "3-Leg EPL Accumulator",
        subtitle: "Arsenal, Liverpool & Spurs all to win",
        competition: "EPL",
        kickoffAt: hoursFromNow(26),
        tier: 2,
        pick: "3/3 legs win",
      },
      {
        title: "Real Madrid vs Real Betis",
        competition: "La Liga",
        kickoffAt: hoursAgo(70),
        tier: 3,
        pick: "Home win",
        settled: true,
        result: "win",
      },
      {
        title: "Al Ahly vs Zamalek",
        competition: "Egyptian Premier League",
        kickoffAt: hoursFromNow(48),
        tier: 3,
        pick: "Away win",
      },
      {
        title: "Napoli vs Cagliari",
        competition: "Serie A",
        kickoffAt: hoursAgo(145),
        tier: 4,
        pick: "2-0",
        settled: true,
        result: "loss",
      },
      {
        title: "Boca Juniors vs River Plate",
        competition: "Argentine Primera",
        kickoffAt: hoursAgo(120),
        tier: 4,
        pick: "1-1",
        settled: true,
        result: "win",
      },
      {
        title: "Napoli vs Inter Milan",
        competition: "Serie A",
        kickoffAt: hoursFromNow(30),
        tier: 4,
        pick: "2-1",
      },
    ],
  });

  console.log("Seeded 8 matches.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
