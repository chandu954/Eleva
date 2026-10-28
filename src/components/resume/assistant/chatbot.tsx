'use client';


import React, { useCallback, useState } from 'react';
import { useChat } from 'ai/react';
import { Card } from "@/components/ui/card";
import { ChatMessageList } from './chat-message-list';
import { Bot, ChevronDown, RefreshCw } from "lucide-react";
import { Education, Project, Resume, Skill, WorkExperience, Job } from '@/lib/types';
import { cn, withBasePath } from '@/lib/utils';
import ChatInput from './chat-input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ApiKeyErrorAlert } from '@/components/ui/api-key-error-alert';
import { useApiKeys, useDefaultModel } from '@/hooks/use-api-keys';
import { useCustomPrompts } from '@/hooks/use-custom-prompts';
import type { RewriteMode } from '@/app/eleva/api/tool/rewrite/rewrite-utils';

interface ChatBotProps {
  resume: Resume;
  onResumeChange: (field: keyof Resume, value: Resume[typeof field]) => void;
  job?: Job | null;
}

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    !isAtBottom && (
      <button
        className={cn(
          "absolute z-50 rounded-full p-2",
          "bg-white/80 hover:bg-white",
          "border border-purple-200/60 hover:border-purple-300/60",
          "shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10",
          "transition-all duration-300",
          "left-[50%] translate-x-[-50%] bottom-4"
        )}
        onClick={() => scrollToBottom()}
      >
        <ChevronDown className="h-4 w-4 text-purple-600" />
      </button>
    )
  );
}

export default function ChatBot({ resume, onResumeChange, job }: ChatBotProps) {
  const router = useRouter();
  const [accordionValue, setAccordionValue] = React.useState<string>("");
  
  // Use synchronized hooks for instant updates when settings change
  const { apiKeys } = useApiKeys();
  const { defaultModel } = useDefaultModel();
  const { customPrompts } = useCustomPrompts();
  
  const [originalResume, setOriginalResume] = React.useState<Resume | null>(null);
  const [isInitialLoading, setIsInitialLoading] = React.useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);

  const config = {
    model: defaultModel,
    apiKeys,
    customPrompts: Object.keys(customPrompts).length > 0 ? customPrompts : undefined,
  };
  
  const { messages, error, append, isLoading, addToolResult, stop, setMessages } = useChat({
    api: withBasePath('/api/chat'),
    body: {
      target_role: resume.target_role,
      resume: resume,
      config,
      job: job,
    },
    maxSteps: 5,
    onResponse() {
 
      setIsInitialLoading(false);
    },
    onError() {
      setIsInitialLoading(false);
    },
    async onToolCall({ toolCall }) {
      // setIsStreaming(false);
      
      if (toolCall.toolName === 'getResume') {
        const params = toolCall.args as { sections: string[] };
        
        const personalInfo = {
          first_name: resume.first_name,
          last_name: resume.last_name,
          email: resume.email,
          phone_number: resume.phone_number,
          location: resume.location,
          website: resume.website,
          linkedin_url: resume.linkedin_url,
          github_url: resume.github_url,
        };

        const sectionMap = {
          personal_info: personalInfo,
          work_experience: resume.work_experience,
          education: resume.education,
          skills: resume.skills,
          projects: resume.projects,
        };

        const result = params.sections.includes('all')
          ? { ...sectionMap, target_role: resume.target_role }
          : params.sections.reduce((acc, section) => ({
              ...acc,
              [section]: sectionMap[section as keyof typeof sectionMap]
            }), {});
        
        addToolResult({ toolCallId: toolCall.toolCallId, result });
        return result;
      }

      if (toolCall.toolName === 'suggest_work_experience_improvement') {
        return toolCall.args;
      }

      if (toolCall.toolName === 'suggest_project_improvement') {
        return toolCall.args;
      }

      if (toolCall.toolName === 'suggest_skill_improvement') {
        return toolCall.args;
      }

      if (toolCall.toolName === 'suggest_education_improvement') {
        return toolCall.args;
      }

      if (toolCall.toolName === 'modifyWholeResume') {
        const updates = toolCall.args as {
          basic_info?: Partial<{
            first_name: string;
            last_name: string;
            email: string;
            phone_number: string;
            location: string;
            website: string;
            linkedin_url: string;
            github_url: string;
          }>;
          work_experience?: WorkExperience[];
          education?: Education[];
          skills?: Skill[];
          projects?: Project[];
        };
        
        // Store the current resume state before applying updates
        setOriginalResume({ ...resume });
        
        // Apply updates as before
        if (updates.basic_info) {
          Object.entries(updates.basic_info).forEach(([key, value]) => {
            if (value !== undefined) {
              onResumeChange(key as keyof Resume, value);
            }
          });
        }

        const sections = {
          work_experience: updates.work_experience,
          education: updates.education,
          skills: updates.skills,
          projects: updates.projects,
        };

        Object.entries(sections).forEach(([key, value]) => {
          if (value !== undefined) {
            onResumeChange(key as keyof Resume, value);
          }
        });

        // Add a simple, serializable result for the tool call
        const result = { success: true };
        addToolResult({ toolCallId: toolCall.toolCallId, result });
        return result;
      }
    },
    onFinish() {
      setIsInitialLoading(false);
    },
    // onResponse(response) {
    //   setIsStreaming(true);
    // },
  });

  // Memoize the submit handler
  const handleSubmit = useCallback((message: string) => {
  
    
    setIsInitialLoading(true);
    append({ 
      content: message.replace(/\s+$/, ''), // Extra safety: trim trailing whitespace
      role: 'user' 
    });
    
    
    setAccordionValue("chat");
  }, [append]);

  const handleModeRewrite = useCallback((toolName: string, args: unknown, mode: RewriteMode) => {
    const instruction = (() => {
      if (toolName === 'suggest_work_experience_improvement') {
        const payload = args as { index?: number; improved_experience?: WorkExperience };
        return `Rewrite the current work experience suggestion in ${mode} mode.\n\nTool: suggest_work_experience_improvement\nIndex: ${payload.index ?? 0}\nCurrent suggestion:\n${JSON.stringify(payload.improved_experience ?? {}, null, 2)}\n\nKeep company, position, and date unchanged. Improve the description bullets according to the mode.`;
      }

      if (toolName === 'suggest_project_improvement') {
        const payload = args as { index?: number; improved_project?: Project };
        return `Rewrite the current project suggestion in ${mode} mode.\n\nTool: suggest_project_improvement\nIndex: ${payload.index ?? 0}\nCurrent suggestion:\n${JSON.stringify(payload.improved_project ?? {}, null, 2)}\n\nKeep the project name unchanged unless the mode needs a lighter wording change. Improve the description bullets according to the mode.`;
      }

      if (toolName === 'suggest_skill_improvement') {
        const payload = args as { index?: number; improved_skill?: Skill };
        return `Rewrite the current skill suggestion in ${mode} mode.\n\nTool: suggest_skill_improvement\nIndex: ${payload.index ?? 0}\nCurrent suggestion:\n${JSON.stringify(payload.improved_skill ?? {}, null, 2)}\n\nKeep the skill category structure stable and adjust ordering or wording according to the mode.`;
      }

      if (toolName === 'suggest_education_improvement') {
        const payload = args as { index?: number; improved_education?: Education };
        return `Rewrite the current education suggestion in ${mode} mode.\n\nTool: suggest_education_improvement\nIndex: ${payload.index ?? 0}\nCurrent suggestion:\n${JSON.stringify(payload.improved_education ?? {}, null, 2)}\n\nKeep the school, degree, field, and date truthful. Improve phrasing according to the mode.`;
      }

      return `Rewrite this suggestion in ${mode} mode while preserving the original facts.`;
    })();

    handleSubmit(instruction);
  }, [handleSubmit]);

  // Add delete handler
  const handleDelete = (id: string) => {
    setMessages(messages.filter(message => message.id !== id));
  };

  // Add edit handler
  const handleEdit = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditContent(content);
  };

  // Add save handler
  const handleSaveEdit = (id: string) => {
    setMessages(messages.map(message => 
      message.id === id 
        ? { ...message, content: editContent }
        : message
    ));
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setOriginalResume(null);
    setEditingMessageId(null);
    setEditContent("");
  }, [setMessages]);

  return (
    <Card className={cn(
      "flex flex-col w-full l mx-auto",
      "bg-gradient-to-br from-purple-400/20 via-purple-400/50 to-indigo-400/50",
      "border-2 border-purple-200/60",
      "shadow-lg shadow-purple-500/5",
      "transition-all duration-500",
      "hover:shadow-xl hover:shadow-purple-500/10",
      "overflow-hidden",
      "relative",
      "data-[state=closed]:shadow-md data-[state=closed]:border data-[state=closed]:border-purple-200/40 "
    )}>
      

      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={setAccordionValue}
        className="relative z-10 "
      >
        <AccordionItem value="chat" className="border-none py-0 my-0">

          {/* Accordion Trigger */}
          <div className="relative">
            <AccordionTrigger className={cn(
              "px-2 py-2",
              "hover:no-underline",
              "group",
              "transition-all duration-300",
              "data-[state=open]:border-b border-purple-200/60",
              "data-[state=closed]:opacity-80 data-[state=closed]:hover:opacity-100",
              "data-[state=closed]:py-1"
            )}>
              <div className={cn(
                "flex items-center w-full",
                "transition-transform duration-300",
                "group-hover:scale-[0.99]",
                "group-data-[state=closed]:scale-95"
              )}>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "p-1 rounded-lg",
                    "bg-purple-100/80 text-purple-600",
                    "group-hover:bg-purple-200/80",
                    "transition-colors duration-300",
                    "group-data-[state=closed]:bg-white/60",
                    "group-data-[state=closed]:p-0.5"
                  )}>
                    <Bot className="h-3 w-3" />
                  </div>
                  <Logo className="text-xs" asLink={false} />
                </div>
              </div>
            </AccordionTrigger>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  className={cn(
                    "absolute right-8 top-1/2 -translate-y-1/2",
                    "px-3 py-1 rounded-lg",
                    "bg-purple-100/40 text-purple-500/80 border border-purple-500",
                    "hover:bg-purple-200/60 hover:text-purple-600",
                    "transition-all duration-300",
                    "focus:outline-none focus:ring-2 focus:ring-purple-400/40",
                    "disabled:opacity-50",
                    "flex items-center gap-2",
                    (accordionValue !== "chat" || isAlertOpen) && "hidden",
                    
                
                  )}
                  disabled={messages.length === 0}
                  aria-label="Clear chat history"
                  variant="ghost"
                  size="sm"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="text-xs font-medium">Clear Chat History</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className={cn(
                "bg-white/95 backdrop-blur-xl",
                "border-purple-200/60",
                "shadow-lg shadow-purple-500/5"
              )}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all messages and reset the chat. This action can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className={cn(
                    "border-purple-200/60",
                    "hover:bg-purple-50/50",
                    "hover:text-purple-700"
                  )}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearChat}
                    className={cn(
                      "bg-purple-500 text-white",
                      "hover:bg-purple-600",
                      "focus:ring-purple-400"
                    )}
                  >
                    Clear Chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Accordion Content */}
          <AccordionContent className="space-y-4">
            <StickToBottom className="h-[60vh] px-4 relative custom-scrollbar" resize="smooth" initial="smooth">
              <StickToBottom.Content className="flex flex-col custom-scrollbar">
                <ChatMessageList
                  messages={messages}
                  resume={resume}
                  onResumeChange={onResumeChange}
                  editingMessageId={editingMessageId}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  handleDelete={handleDelete}
                  handleEdit={handleEdit}
                  handleSaveEdit={handleSaveEdit}
                  originalResume={originalResume}
                  setOriginalResume={setOriginalResume}
                  handleModeRewrite={handleModeRewrite}
                  isInitialLoading={isInitialLoading}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                />

                {error && (
                  error.message === "Rate limit exceeded. Try again later." ? (
                    <div className={cn(
                      "rounded-lg p-4 text-sm",
                      "bg-pink-50 border border-pink-200",
                      "text-pink-700"
                    )}>
                      <p>You&apos;ve used all your available messages. Please try again after:</p>
                      <p className="font-medium mt-2">
                        {new Date(Date.now() + 5 * 60 * 60 * 1000).toLocaleString()} {/* 5 hours from now */}
                      </p>
                    </div>
                  ) : (
                    <ApiKeyErrorAlert 
                      error={error} 
                      router={router} 
                    />
                  )
                )}
              </StickToBottom.Content>

              <ScrollToBottom />
            </StickToBottom>
            
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Input Bar */}
      <ChatInput
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onStop={stop}
      />
    </Card>
  );
}
