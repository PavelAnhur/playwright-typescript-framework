export interface Account {
  email: string,
  password: string
}

export interface User {
  id: number;
  email: string;
  role: 'buyer' | 'seller';
  name?: string;
}
