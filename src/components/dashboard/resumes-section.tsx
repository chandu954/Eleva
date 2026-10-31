'use client';

import { FileText, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ResumeSortControls, type SortOption, type SortDirection } from '@/components/resume/management/resume-sort-controls';
import type { Profile, ResumeSummary } from '@/lib/types';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { ResumeItemCard } from './resume-item-card';
import type { OptimisticResume } from './resumes-section-types';
import { useState } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { useResumeActions } from './use-resume-actions';
import { CreateResumeCard } from './_components/create-resume-card';
import { LimitReachedCard } from './_components/limit-reached-card';

interface ResumesSectionProps {
  type: 'base' | 'tailored';
  resumes: ResumeSummary[];
  profile: Profile;
  sortParam: string;
  directionParam: string;
  currentSort: SortOption;
  currentDirection: SortDirection;
  baseResumes?: ResumeSummary[]; // Only needed for tailored type
  canCreateMore?: boolean;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
}

export function ResumesSection({ 
  type,
  resumes,
  profile,
  sortParam,
  directionParam,
  currentSort,
  currentDirection,
  baseResumes = [],
  canCreateMore
}: ResumesSectionProps) {
  const {
    optimisticResumes,
    deletingResumes,
    copyingResumes,
    startTransition,
    handleDeleteResume,
    handleCopyResume,
  } = useResumeActions(resumes as OptimisticResume[]);

  const config = {
    base: {
      gradient: 'from-purple-600 to-indigo-600',
      border: 'border-purple-300',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      icon: FileText,
      accent: {
        bg: 'purple-100',
        hover: 'purple-100/50'
      }
    },
    tailored: {
      gradient: 'from-pink-600 to-rose-600',
      border: 'border-pink-300',
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      icon: Sparkles,
      accent: {
        bg: 'pink-100',
        hover: 'pink-100/50'
      }
    }
  }[type];

  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 7
  });

  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const paginatedResumes = optimisticResumes.slice(startIndex, endIndex);

  function handlePageChange(page: number) {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  }

  function renderResumeCard(resume: OptimisticResume) {
    return (
      <ResumeItemCard
        key={resume.id}
        resume={resume}
        type={type}
        isDeleting={deletingResumes.has(resume.id)}
        isCopying={copyingResumes.has(resume.originalId || resume.id)}
        canCreateMore={canCreateMore}
        onCopy={(item) => startTransition(async () => { await handleCopyResume(item); })}
        onDelete={(id, name) => startTransition(async () => { await handleDeleteResume(id, name); })}
      />
    );
  }

  return (
    <div className="relative ">
      <div className="flex flex-col gap-4 w-full">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className={`text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
            {type === 'base' ? 'Base' : 'Tailored'} Resumes
          </h2>
          <div className="flex items-center gap-2 mb-4">
            <ResumeSortControls 
              sortParam={sortParam}
              directionParam={directionParam}
              currentSort={currentSort}
              currentDirection={currentDirection}
            />
          </div>
        </div>

        {/* Desktop Pagination (hidden on mobile) */}
        {optimisticResumes.length > pagination.itemsPerPage && (
          <div className="hidden md:flex w-full items-start justify-start -mt-4">
            <Pagination className="flex justify-end">
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                
                {Array.from({ length: Math.ceil(optimisticResumes.length / pagination.itemsPerPage) }).map((_, index) => {
                  const pageNumber = index + 1;
                  const totalPages = Math.ceil(optimisticResumes.length / pagination.itemsPerPage);
                  
                  if (
                    pageNumber === 1 || 
                    pageNumber === totalPages || 
                    (pageNumber >= pagination.currentPage - 1 && pageNumber <= pagination.currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={index}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          className={cn(
                            "h-8 w-8 p-0",
                            "text-muted-foreground hover:text-foreground",
                            pagination.currentPage === pageNumber && "font-medium text-foreground"
                          )}
                        >
                          {pageNumber}
                        </Button>
                      </PaginationItem>
                    );
                  }

                  if (
                    pageNumber === 2 && pagination.currentPage > 3 ||
                    pageNumber === totalPages - 1 && pagination.currentPage < totalPages - 2
                  ) {
                    return (
                      <PaginationItem key={index}>
                        <span className="text-muted-foreground px-2">...</span>
                      </PaginationItem>
                    );
                  }

                  return null;
                })}

                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === Math.ceil(optimisticResumes.length / pagination.itemsPerPage)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <div className="relative pb-6">
        {/* Mobile View */}
        <div className="md:hidden w-full space-y-6">
          {/* Mobile Create Resume Button Row */}
          {canCreateMore ? (
            <div className="px-2 w-full  flex">
              <CreateResumeCard type={type} profile={profile} baseResumes={baseResumes} />
            </div>
          ) : (
            <div className="px-4 w-full">
              <LimitReachedCard type={type} />
            </div>
          )}

          {/* Mobile Resumes Carousel */}
          {paginatedResumes.length > 0 && (
            <div className="w-full">
              <Carousel className="w-full">
                <CarouselContent>
                  {paginatedResumes.map((resume) => (
                    <CarouselItem key={resume.id} className="basis-[85%] pl-4">
                      {renderResumeCard(resume)}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden sm:block">
                  <CarouselPrevious className="absolute -left-12 top-1/2" />
                  <CarouselNext className="absolute -right-12 top-1/2" />
                </div>
              </Carousel>
            </div>
          )}
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {canCreateMore ? (
            <CreateResumeCard type={type} profile={profile} baseResumes={baseResumes} />
          ) : (
            <LimitReachedCard type={type} />
          )}

          {paginatedResumes.map((resume) => renderResumeCard(resume))}
          {optimisticResumes.length === 0 && optimisticResumes.length + 1 < 4 && (
            <div className="col-span-2 md:col-span-1" />
          )}
        </div>
      </div>
    </div>
  );
} 
