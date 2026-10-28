import { Resume } from "@/lib/types";
import { Document as PDFDocument, Page as PDFPage, Text, View, Link, Image } from '@react-pdf/renderer';
import { createResumeStyles } from './resume-pdf-styles';
import { memo, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';

// Create a cache outside of components to persist between renders
const textProcessingCache = new Map<string, ReactNode[]>();

// Memoized text processing function
function useTextProcessor() {
  const processText = useCallback((text: string, ignoreMarkdown = false) => {
    // Check cache first
    const cacheKey = `${text}-${ignoreMarkdown}`;
    if (textProcessingCache.has(cacheKey)) {
      return textProcessingCache.get(cacheKey);
    }

    // If ignoring markdown, extract content between asterisks or return plain text
    if (ignoreMarkdown) {
      const content = text.match(/\*\*(.*?)\*\*/)?.[1] || text;
      const processed = [<Text key={0}>{content}</Text>];
      textProcessingCache.set(cacheKey, processed);
      return processed;
    }

    // Process text if not in cache
    const parts = text.split(/(\*\*.*?\*\*)/g);
    const processed = parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={index} style={{ fontFamily: 'Helvetica-Bold' }}>{part.slice(2, -2)}</Text>;
      }
      return <Text key={index}>{part}</Text>;
    });

    // Store in cache
    textProcessingCache.set(cacheKey, processed);
    return processed;
  }, []);

  return processText;
}

// Memoized section components
const HeaderSection = memo(function HeaderSection({ 
  resume, 
  styles 
}: { 
  resume: Resume; 
  styles: ReturnType<typeof createResumeStyles>;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.name}>{resume.first_name} {resume.last_name}</Text>
      <View style={styles.contactInfo}>
        {resume.location && (
          <>
            <Text>{resume.location}</Text>
            {(resume.email || resume.phone_number || resume.website || resume.linkedin_url || resume.github_url) && (
              <Text style={styles.bulletSeparator}>•</Text>
            )}
          </>
        )}
        {resume.email && (
          <>
            <Link src={`mailto:${resume.email}`}><Text style={styles.link}>{resume.email}</Text></Link>
            {(resume.phone_number || resume.website || resume.linkedin_url || resume.github_url) && (
              <Text style={styles.bulletSeparator}>•</Text>
            )}
          </>
        )}
        {resume.phone_number && (
          <>
            <Text>{resume.phone_number}</Text>
            {(resume.website || resume.linkedin_url || resume.github_url) && (
              <Text style={styles.bulletSeparator}>•</Text>
            )}
          </>
        )}
        {resume.website && (
          <>
            <Link src={resume.website.startsWith('http') ? resume.website : `https://${resume.website}`}>
              <Text style={styles.link}>{resume.website}</Text>
            </Link>
            {(resume.linkedin_url || resume.github_url) && (
              <Text style={styles.bulletSeparator}>•</Text>
            )}
          </>
        )}
        {resume.linkedin_url && (
          <>
            <Link src={resume.linkedin_url.startsWith('http') ? resume.linkedin_url : `https://${resume.linkedin_url}`}>
              <Text style={styles.link}>{resume.linkedin_url}</Text>
            </Link>
            {resume.github_url && <Text style={styles.bulletSeparator}>•</Text>}
          </>
        )}
        {resume.github_url && (
          <Link src={resume.github_url.startsWith('http') ? resume.github_url : `https://${resume.github_url}`}>
            <Text style={styles.link}>{resume.github_url}</Text>
          </Link>
        )}
      </View>
    </View>
  );
});

const SkillsSection = memo(function SkillsSection({ 
  skills, 
  styles 
}: { 
  skills: Resume['skills']; 
  styles: ReturnType<typeof createResumeStyles>;
}) {
  if (!skills?.length) return null;
  
  return (
    <View style={styles.skillsSection}>
      <Text style={styles.sectionTitle}>Skills</Text>
      <View style={styles.skillsGrid}>
        {skills.map((skillCategory, index) => (
          <View key={index} style={styles.skillCategory}>
            <Text style={styles.skillCategoryTitle}>{skillCategory.category}:</Text>
            <Text style={styles.skillItem}>{skillCategory.items.join(', ')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const ExperienceSection = memo(function ExperienceSection({ 
  experiences, 
  styles 
}: { 
  experiences: Resume['work_experience']; 
  styles: ReturnType<typeof createResumeStyles>;
}) {
  const processText = useTextProcessor();
  if (!experiences?.length) return null;

  return (
    <View style={styles.experienceSection}>
      <Text style={styles.sectionTitle}>Experience</Text>
      {experiences.map((experience, index) => (
        <View key={index} style={styles.experienceItem}>
          <View style={styles.experienceHeader}>
            <View>
              <Text style={styles.companyName}>{processText(experience.position, true)}</Text>
              <View style={styles.companyLocationRow}>
                <Text style={styles.jobTitle}>{processText(experience.company, true)}</Text>
                {experience.location && (
                  <>
                    <Text style={styles.bulletSeparator}>•</Text>
                    <Text style={styles.locationText}>{experience.location}</Text>
                  </>
                )}
              </View>
            </View>
            <Text style={styles.dateRange}>{experience.date}</Text>
          </View>
          {experience.description.map((bullet, bulletIndex) => (
            <View key={bulletIndex} style={styles.bulletPoint}>
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletText}>
                <Text style={styles.bulletTextContent}>
                  {processText(bullet)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

const ProjectsSection = memo(function ProjectsSection({ 
  projects, 
  styles 
}: { 
  projects: Resume['projects']; 
  styles: ReturnType<typeof createResumeStyles>;
}) {
  const processText = useTextProcessor();
  if (!projects?.length) return null;

  return (
    <View style={styles.projectsSection}>
      <Text style={styles.sectionTitle}>Projects</Text>
      {projects.map((project, index) => (
        <View key={index} style={styles.projectItem}>
          <View style={styles.projectHeader}>
            <View style={styles.projectHeaderTop}>
              <Text style={styles.projectTitle}>{processText(project.name, true)}</Text>
              <View style={styles.projectHeaderRight}>
                {project.date && <Text style={styles.dateRange}>{project.date}</Text>}
                {(project.url || project.github_url) && (
                  <Text style={styles.projectLinks}>
                    {project.url && (
                      <Link src={project.url.startsWith('http') ? project.url : `https://${project.url}`}>
                        <Text style={styles.link}>{project.url}</Text>
                      </Link>
                    )}
                    {project.url && project.github_url && ' | '}
                    {project.github_url && (
                      <Link src={project.github_url.startsWith('http') ? project.github_url : `https://${project.github_url}`}>
                        <Text style={styles.link}>{project.github_url}</Text>
                      </Link>
                    )}
                  </Text>
                )}
              </View>
            </View>
            {project.technologies && (
              <Text style={styles.projectTechnologies}>
                {project.technologies.map(tech => tech.replace(/\*\*/g, '')).join(', ')}
              </Text>
            )}
          </View>
          
          {project.description.map((bullet, bulletIndex) => (
            <View key={bulletIndex} style={styles.bulletPoint}>
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletText}>
                <Text style={styles.bulletTextContent}>
                  {processText(bullet)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

const EducationSection = memo(function EducationSection({ 
  education, 
  styles 
}: { 
  education: Resume['education']; 
  styles: ReturnType<typeof createResumeStyles>;
}) {
  const processText = useTextProcessor();
  if (!education?.length) return null;

  return (
    <View style={styles.educationSection}>
      <Text style={styles.sectionTitle}>Education</Text>
      {education.map((edu, index) => (
        <View key={index} style={styles.educationItem}>
          <View style={styles.educationHeader}>
            <View>
              <Text style={styles.schoolName}>{processText(edu.school, true)}</Text>
              <Text style={styles.degree}>{processText(`${edu.degree} ${edu.field}`)}</Text>
            </View>
            <Text style={styles.dateRange}>{edu.date}</Text>
          </View>
          {edu.achievements && edu.achievements.map((achievement, bulletIndex) => (
            <View key={bulletIndex} style={styles.bulletPoint}>
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletText}>
                {processText(achievement)}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

interface ResumePDFDocumentProps {
  resume: Resume;
  variant?: 'base' | 'tailored';
}

export const ResumePDFDocument = memo(function ResumePDFDocument({ resume }: ResumePDFDocumentProps) {
  // Memoize styles based on document settings
  const styles = useMemo(() => createResumeStyles(resume.document_settings), [resume.document_settings]);

  return (
    <PDFDocument>
      <PDFPage size="LETTER" style={styles.page}>
        <HeaderSection resume={resume} styles={styles} />
        <SkillsSection skills={resume.skills} styles={styles} />
        <ExperienceSection experiences={resume.work_experience} styles={styles} />
        <ProjectsSection projects={resume.projects} styles={styles} />
        <EducationSection education={resume.education} styles={styles} />
        
        {resume.document_settings?.show_ubc_footer && (
          <View style={styles.footer}>
            {/* React PDF Image does not support alt text, so disable lint here */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image 
              src="/images/ubc-science-footer.png"
              style={styles.footerImage}
            />
          </View>
        )}
      </PDFPage>
    </PDFDocument>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.resume === nextProps.resume &&
    prevProps.variant === nextProps.variant
  );
}); 
