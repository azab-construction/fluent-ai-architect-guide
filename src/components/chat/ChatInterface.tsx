import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, FileText, Github, HardDrive, Settings, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AzureOpenAIService, configManager } from '@/lib/azure-openai';
import { ApiKeyModal } from './ApiKeyModal';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: Array<{
    type: 'github' | 'drive' | 'document';
    name: string;
    url?: string;
  }>;
}

export const ChatInterface = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'مرحباً! أنا مساعدك الذكي. يمكنني مساعدتك في تحليل ملفاتك من Google Drive وأكوادك من GitHub. كيف يمكنني مساعدتك اليوم؟',
      role: 'assistant',
      timestamp: new Date(),
      sources: []
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [openAIService, setOpenAIService] = useState<AzureOpenAIService | null>(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = () => {
    const configured = configManager.isConfigured();
    setIsConfigured(configured);
    if (configured) {
      const config = configManager.load();
      if (config) {
        setOpenAIService(new AzureOpenAIService(config));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!isConfigured || !openAIService) {
      setShowApiModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = newMessage;
    setNewMessage('');
    setIsLoading(true);

    try {
      const chatHistory = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await openAIService.sendMessage([
        ...chatHistory,
        { role: 'user', content: currentMessage }
      ]);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        sources: []
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "خطأ في الدردشة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'عذراً، حدث خطأ في الاتصال. يرجى التحقق من إعدادات API والمحاولة مرة أخرى.',
        role: 'assistant',
        timestamp: new Date(),
        sources: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'github': return <Github className="w-3 h-3" />;
      case 'drive': return <HardDrive className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-ai-primary to-ai-accent flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">منصة الدردشة الذكية</h1>
              <p className="text-sm text-muted-foreground">مساعدك الذكي للملفات والأكواد</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApiModal(true)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            {isConfigured ? 'تعديل الإعدادات' : 'إعداد API'}
          </Button>
        </div>
        
        {!isConfigured && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              يرجى إعداد Azure OpenAI API للبدء في استخدام المساعد الذكي
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-gradient-to-r from-ai-primary to-ai-accent text-white'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                
                <Card className={`p-4 ${
                  message.role === 'user' 
                    ? 'bg-chat-user border-primary/20' 
                    : 'bg-chat-ai border-ai-primary/20'
                }`}>
                  <p className="text-sm leading-relaxed" dir="auto">
                    {message.content}
                  </p>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      {message.sources.map((source, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {getSourceIcon(source.type)}
                          <span className="ml-1">{source.name}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {message.timestamp.toLocaleTimeString('ar-SA')}
                  </p>
                </Card>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-ai-primary to-ai-accent flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <Card className="p-4 bg-chat-ai border-ai-primary/20">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ai-primary"></div>
                  <p className="text-sm text-muted-foreground">جاري الكتابة...</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="pr-12"
                dir="auto"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="bg-gradient-to-r from-ai-primary to-ai-accent hover:opacity-90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <ApiKeyModal
        open={showApiModal}
        onOpenChange={setShowApiModal}
        onConfigSaved={checkConfiguration}
      />
    </div>
  );
};