import bcrypt from 'bcryptjs'

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(plain: string, hashed: string) {
  // Fallback: If your DB currently has plain text passwords during dev, 
  // you can add a check here. But for PROD, always use bcrypt.compare.
  const match = await bcrypt.compare(plain, hashed)
  return match
}