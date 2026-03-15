import { integrationStorage } from './integration-storage';

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  updated_at: string;
  private: boolean;
  stargazers_count: number;
}

export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  download_url: string | null;
}

class GitHubAPI {
  private getToken(): string | null {
    const data = integrationStorage.load('github');
    return data?.apiKey || null;
  }

  private getHeaders(): HeadersInit {
    const token = this.getToken();
    if (!token) throw new Error('GitHub غير متصل. يرجى ربط حسابك أولاً.');
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  isConnected(): boolean {
    return integrationStorage.getStatus('github') === 'connected';
  }

  async getUser(): Promise<GitHubUser> {
    const res = await fetch('https://api.github.com/user', { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  }

  async getRepos(page = 1, perPage = 30): Promise<GitHubRepo[]> {
    const settings = integrationStorage.load('github')?.settings || {};
    const includePrivate = settings.includePrivate ? '' : '&type=public';
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated${includePrivate}`,
      { headers: this.getHeaders() }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  }

  async getRepoContents(owner: string, repo: string, path = ''): Promise<GitHubFile[]> {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: this.getHeaders() }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [data];
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: this.getHeaders() }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();

    if (data.encoding === 'base64' && data.content) {
      return atob(data.content.replace(/\n/g, ''));
    }
    if (data.download_url) {
      const fileRes = await fetch(data.download_url);
      return fileRes.text();
    }
    throw new Error('لا يمكن قراءة محتوى الملف');
  }
}

export const githubAPI = new GitHubAPI();
