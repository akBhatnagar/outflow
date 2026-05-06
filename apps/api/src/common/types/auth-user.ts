export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerifiedAt: Date | null;
}
