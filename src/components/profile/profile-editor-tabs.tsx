'use client';

import type { Profile } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, FolderGit2, GraduationCap, User, Wrench } from 'lucide-react';

import { ProfileBasicInfoForm } from '@/components/profile/profile-basic-info-form';
import { ProfileWorkExperienceForm } from '@/components/profile/profile-work-experience-form';
import { ProfileProjectsForm } from '@/components/profile/profile-projects-form';
import { ProfileEducationForm } from '@/components/profile/profile-education-form';
import { ProfileSkillsForm } from '@/components/profile/profile-skills-form';

interface ProfileEditorTabsProps {
  profile: Profile;
  onFieldChange: (field: keyof Profile, value: unknown) => void;
}

/**
 * The five profile sections, each wrapped in its own animated card. Kept
 * separate from the editor shell so the save/reset/import logic stays small.
 */
export function ProfileEditorTabs({ profile, onFieldChange }: ProfileEditorTabsProps) {
  return (
    <Tabs defaultValue="basic" className="w-full ">
      <TabsList className=" h-full relative bg-white/80  backdrop-blur-xl border border-white/40 rounded-xl overflow-x-auto flex whitespace-nowrap gap-2 shadow-lg">
        <TabsTrigger
          value="basic"
          className=" group flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium relative transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500/10 data-[state=active]:to-cyan-500/10
            data-[state=active]:border-teal-500/20 data-[state=active]:shadow-lg hover:bg-white/60
            data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900"
        >
          <div className="p-1.5 rounded-full bg-teal-100/80 transition-transform duration-300 group-data-[state=active]:scale-110 group-data-[state=active]:bg-teal-100">
            <User className="h-4 w-4 text-teal-600 transition-colors group-data-[state=inactive]:text-teal-500/70" />
          </div>
          <span className="relative">
            Basic Info
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-teal-500 scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100"></div>
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="experience"
          className="group flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium relative transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/10 data-[state=active]:to-blue-500/10
            data-[state=active]:border-cyan-500/20 data-[state=active]:shadow-lg hover:bg-white/60
            data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900"
        >
          <div className="p-1.5 rounded-full bg-cyan-100/80 transition-transform duration-300 group-data-[state=active]:scale-110 group-data-[state=active]:bg-cyan-100">
            <Briefcase className="h-4 w-4 text-cyan-600 transition-colors group-data-[state=inactive]:text-cyan-500/70" />
          </div>
          <span className="relative">
            Work Experience
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-cyan-500 scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100"></div>
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="projects"
          className="group flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium relative transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/10 data-[state=active]:to-purple-500/10
            data-[state=active]:border-violet-500/20 data-[state=active]:shadow-lg hover:bg-white/60
            data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900"
        >
          <div className="p-1.5 rounded-full bg-violet-100/80 transition-transform duration-300 group-data-[state=active]:scale-110 group-data-[state=active]:bg-violet-100">
            <FolderGit2 className="h-4 w-4 text-violet-600 transition-colors group-data-[state=inactive]:text-violet-500/70" />
          </div>
          <span className="relative">
            Projects
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-violet-500 scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100"></div>
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="education"
          className="group flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium relative transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/10 data-[state=active]:to-blue-500/10
            data-[state=active]:border-indigo-500/20 data-[state=active]:shadow-lg hover:bg-white/60
            data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900"
        >
          <div className="p-1.5 rounded-full bg-indigo-100/80 transition-transform duration-300 group-data-[state=active]:scale-110 group-data-[state=active]:bg-indigo-100">
            <GraduationCap className="h-4 w-4 text-indigo-600 transition-colors group-data-[state=inactive]:text-indigo-500/70" />
          </div>
          <span className="relative">
            Education
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-indigo-500 scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100"></div>
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="skills"
          className="group flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium relative transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500/10 data-[state=active]:to-pink-500/10
            data-[state=active]:border-rose-500/20 data-[state=active]:shadow-lg hover:bg-white/60
            data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900"
        >
          <div className="p-1.5 rounded-full bg-rose-100/80 transition-transform duration-300 group-data-[state=active]:scale-110 group-data-[state=active]:bg-rose-100">
            <Wrench className="h-4 w-4 text-rose-600 transition-colors group-data-[state=inactive]:text-rose-500/70" />
          </div>
          <span className="relative">
            Skills
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-rose-500 scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100"></div>
          </span>
        </TabsTrigger>
      </TabsList>
      <div className="relative">
        {/* Content gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/10 to-white/20 pointer-events-none rounded-2xl"></div>

        {/* Tab content with consistent card styling */}
        <div className="relative space-y-6">
          <TabsContent
            value="basic"
            className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
          >
            <Card className="bg-gradient-to-br from-white/50 via-white/40 to-white/50 backdrop-blur-xl border-white/40 shadow-xl transition-all duration-500 hover:shadow-2xl rounded-xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative p-6">
                <ProfileBasicInfoForm
                  profile={profile}
                  onChange={(field, value) => {
                    if (field in profile) {
                      onFieldChange(field as keyof Profile, value);
                    }
                  }}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent
            value="experience"
            className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
          >
            <Card className="bg-gradient-to-br from-white/50 via-white/40 to-white/50 backdrop-blur-xl border-white/40 shadow-2xl transition-all duration-500 hover:shadow-3xl rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative p-8">
                <ProfileWorkExperienceForm
                  experiences={profile.work_experience}
                  onChange={(experiences) => onFieldChange('work_experience', experiences)}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent
            value="projects"
            className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
          >
            <Card className="bg-gradient-to-br from-white/50 via-white/40 to-white/50 backdrop-blur-xl border-white/40 shadow-2xl transition-all duration-500 hover:shadow-3xl rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative p-8">
                <ProfileProjectsForm
                  projects={profile.projects}
                  onChange={(projects) => onFieldChange('projects', projects)}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent
            value="education"
            className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
          >
            <Card className="bg-gradient-to-br from-white/50 via-white/40 to-white/50 backdrop-blur-xl border-white/40 shadow-2xl transition-all duration-500 hover:shadow-3xl rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative p-8">
                <ProfileEducationForm
                  education={profile.education}
                  onChange={(education) => onFieldChange('education', education)}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent
            value="skills"
            className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
          >
            <Card className="bg-gradient-to-br from-white/50 via-white/40 to-white/50 backdrop-blur-xl border-white/40 shadow-2xl transition-all duration-500 hover:shadow-3xl rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative p-8">
                <ProfileSkillsForm
                  skills={profile.skills}
                  onChange={(skills) => onFieldChange('skills', skills)}
                />
              </div>
            </Card>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
