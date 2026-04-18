// scripts/reset-password.ts
// Usage: npx tsx scripts/reset-password.ts --email <email> [--password <newPassword>]

import { prisma, prompt, hashPassword, parseArgs } from "./_lib"

async function main() {
  const args = parseArgs()
  const email = args.email || (await prompt("User email: "))
  const password = args.password || (await prompt("New password: "))

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) {
    console.error(`ERROR: No user with email ${email}`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(password) },
  })

  console.log(`Password reset for ${email}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
