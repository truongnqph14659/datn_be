import * as bcrypt from 'bcrypt';

export async function hasPassword(password: string): Promise<string> {
  const salt = parseInt(process.env.HASH_SALT || '10', 10);
  const hasPassword = await bcrypt.hash(password, salt);
  return hasPassword;
}

export async function verifyPassword(password: string, hashPassword: string): Promise<boolean> {
  const hasPassword = await bcrypt.compare(password, hashPassword);
  return hasPassword;
}
