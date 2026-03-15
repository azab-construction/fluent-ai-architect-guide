import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Github, Folder, FileText, ArrowLeft, Loader2, Star } from 'lucide-react';
import { githubAPI, GitHubRepo, GitHubFile } from '@/lib/github-api';
import { useToast } from '@/hooks/use-toast';

interface GitHubBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (content: string, fileName: string, repoName: string) => void;
}

export const GitHubBrowser = ({ open, onOpenChange, onFileSelected }: GitHubBrowserProps) => {
  const { toast } = useToast();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  useEffect(() => {
    if (open && repos.length === 0) loadRepos();
  }, [open]);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const data = await githubAPI.getRepos();
      setRepos(data);
    } catch (error) {
      toast({ title: 'خطأ', description: error instanceof Error ? error.message : 'فشل تحميل المستودعات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openRepo = async (fullName: string) => {
    setLoading(true);
    setSelectedRepo(fullName);
    setCurrentPath('');
    setPathHistory([]);
    try {
      const [owner, repo] = fullName.split('/');
      const data = await githubAPI.getRepoContents(owner, repo);
      setFiles(data);
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل تحميل محتويات المستودع', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openFolder = async (path: string) => {
    if (!selectedRepo) return;
    setLoading(true);
    setPathHistory(prev => [...prev, currentPath]);
    setCurrentPath(path);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const data = await githubAPI.getRepoContents(owner, repo, path);
      setFiles(data);
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل تحميل المجلد', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectFile = async (path: string, name: string) => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const content = await githubAPI.getFileContent(owner, repo, path);
      onFileSelected(content, name, selectedRepo);
      onOpenChange(false);
      toast({ title: 'تم إرفاق الملف', description: `${name} من ${selectedRepo}` });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل قراءة الملف', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (!selectedRepo) return;
    if (pathHistory.length === 0) {
      setSelectedRepo(null);
      setFiles([]);
      return;
    }
    const prev = pathHistory[pathHistory.length - 1];
    setPathHistory(h => h.slice(0, -1));
    setCurrentPath(prev);
    const [owner, repo] = selectedRepo.split('/');
    setLoading(true);
    githubAPI.getRepoContents(owner, repo, prev).then(setFiles).finally(() => setLoading(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            {selectedRepo ? (
              <span className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                {selectedRepo}{currentPath && ` / ${currentPath}`}
              </span>
            ) : (
              'تصفح مستودعات GitHub'
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedRepo ? (
            <div className="space-y-2">
              {repos.map(repo => (
                <Card
                  key={repo.id}
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => openRepo(repo.full_name)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{repo.name}</p>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{repo.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {repo.language && <Badge variant="secondary" className="text-xs">{repo.language}</Badge>}
                      {repo.private && <Badge variant="outline" className="text-xs">خاص</Badge>}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3" />{repo.stargazers_count}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
              {repos.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد مستودعات</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {files
                .sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1))
                .map(file => (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => file.type === 'dir' ? openFolder(file.path) : selectFile(file.path, file.name)}
                  >
                    {file.type === 'dir' ? (
                      <Folder className="w-4 h-4 text-primary" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{file.name}</span>
                    {file.type === 'file' && file.size > 0 && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
