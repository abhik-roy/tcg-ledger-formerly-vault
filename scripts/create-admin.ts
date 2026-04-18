// scripts/create-admin.ts
// Usage: npx tsx scripts/create-admin.ts --email <email> --password <password> --displayName <name>

import { prisma, prompt, hashPassword, parseArgs } from "./_lib"

async function main() {
  const args = parseArgs()
  const email = args.email || (await prompt("Admin email: "))
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
      role: "ADMIN",
      permissions: {
        create: {
          inventoryUpdatePrices: true,
          addCardsAccess: true,
        },
      },
    },
    select: { id: true, email: true, displayName: true, role: true },
  })

  console.log(`Created admin: ${user.email} (id=${user.id})`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
