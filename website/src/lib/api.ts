import { apiFetch } from './http';

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export async function submitContactForm(payload: ContactPayload): Promise<void> {
  await apiFetch('/api/public/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
