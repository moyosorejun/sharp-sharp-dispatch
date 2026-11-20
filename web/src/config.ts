const env = import.meta.env;

export const config = {
  apiUrl: (env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3001',
  vapiPublicKey: (env.VITE_VAPI_PUBLIC_KEY as string | undefined) || '',
  vapiAssistantId: (env.VITE_VAPI_ASSISTANT_ID as string | undefined) || '',
  githubUrl: (env.VITE_GITHUB_URL as string | undefined) || 'https://github.com/moyosorejun',
  linkedinUrl: (env.VITE_LINKEDIN_URL as string | undefined) || 'https://www.linkedin.com/in/moyosore-junaid-60a13b285',
};
