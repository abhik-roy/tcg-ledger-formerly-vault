// scripts/create-user.ts
// Usage: npx tsx scripts/create-user.ts --email <email> --password <password> --displayName <name>

import { prisma, prompt, hashPassword, parseArgs } from "./_lib"

async function main() {
  const args = parseArgs()
  const email = args.email || (await prompt("User email: "))
  const password = args.password || (await prompt("Password: "))
  const displayName = args.displayName || (await prompt("Display name: "))

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    console.error(`ERROR: User ${email} already exists.`)
    process.exit(1)
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: await hashPassword(password),
      displayName: displayName || null,
      role: "USER",
      permissions: {
        create: {
          inventoryUpdatePrices: false,
          addCardsAccess: true,
        },
      },
    },
    select: { id: true, email: true, displayName: true, role: true },
  })

  console.log(`Created user: ${user.email} (id=${user.id})`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
