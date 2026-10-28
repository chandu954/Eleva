import { StyleSheet } from '@react-pdf/renderer';
import type { Resume } from '@/lib/types';

// Base styles that don't depend on resume settings
export const baseStyles = {
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
  bulletSeparator: {
    color: '#4b5563',
    marginHorizontal: 2,
  },
  bulletDot: {
    width: 8,
    marginRight: 4,
  },
} as const;

// Style factory function
export function createResumeStyles(settings: Resume['document_settings'] = {
  document_font_size: 10,
  document_line_height: 1.5,
  document_margin_vertical: 36,
  document_margin_horizontal: 36,
  header_name_size: 24,
  header_name_bottom_spacing: 24,
  skills_margin_top: 2,
  skills_margin_bottom: 2,
  skills_margin_horizontal: 0,
  skills_item_spacing: 2,
  experience_margin_top: 2,
  experience_margin_bottom: 2,
  experience_margin_horizontal: 0,
  experience_item_spacing: 4,
  projects_margin_top: 2,
  projects_margin_bottom: 2,
  projects_margin_horizontal: 0,
  projects_item_spacing: 4,
  education_margin_top: 2,
  education_margin_bottom: 2,
  education_margin_horizontal: 0,
  education_item_spacing: 4,
  footer_width: 80,
}) {
  const {
    document_font_size = 10,
    document_line_height = 1.5,
    document_margin_vertical = 36,
    document_margin_horizontal = 36,
    header_name_size = 24,
    header_name_bottom_spacing = 24,
    skills_margin_top = 2,
    skills_margin_bottom = 2,
    skills_margin_horizontal = 0,
    skills_item_spacing = 2,
    experience_margin_top = 2,
    experience_margin_bottom = 2,
    experience_margin_horizontal = 0,
    experience_item_spacing = 4,
    projects_margin_top = 2,
    projects_margin_bottom = 2,
    projects_margin_horizontal = 0,
    projects_item_spacing = 4,
    education_margin_top = 2,
    education_margin_bottom = 2,
    education_margin_horizontal = 0,
    education_item_spacing = 4,
    footer_width = 95,
  } = settings;

  return StyleSheet.create({
    ...baseStyles,
    // Base page configuration
    page: {
      paddingTop: document_margin_vertical,
      paddingBottom: document_margin_vertical + 28,
      paddingLeft: document_margin_horizontal,
      paddingRight: document_margin_horizontal,
      fontFamily: 'Helvetica',
      color: '#111827',
      fontSize: document_font_size,
      lineHeight: document_line_height,
      position: 'relative',
      // backgroundColor: '#32a852',  // Bright green color that should be very visible for testing
    },
    header: {
      alignItems: 'center',
    },
    name: {
      fontSize: header_name_size,
      fontFamily: 'Helvetica-Bold',
      marginBottom: header_name_bottom_spacing,
      color: '#111827',
      textAlign: 'center',
    },
    contactInfo: {
      fontSize: document_font_size,
      color: '#374151',
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    sectionTitle: {
      fontSize: document_font_size,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 4,
      color: '#111827',
      textTransform: 'uppercase',
      borderBottom: '0.5pt solid #e5e7eb',
      paddingBottom: 0,
    },
    // Skills section
    skillsSection: {
      marginTop: skills_margin_top,
      marginBottom: skills_margin_bottom,
      marginLeft: skills_margin_horizontal,
      marginRight: skills_margin_horizontal,
    },
    skillsGrid: {
      flexDirection: 'column',
      gap: skills_item_spacing,
    },
    skillCategory: {
      marginBottom: skills_item_spacing,
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100%',
    },
    skillCategoryTitle: {
      fontSize: document_font_size,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      marginRight: 4,
      width: 'auto',
    },
    skillItem: {
      fontSize: document_font_size,
      color: '#374151',
      flexGrow: 1,
      flexBasis: 0,
      flexWrap: 'wrap',
    },
    // Experience section
    experienceSection: {
      marginTop: experience_margin_top,
      marginBottom: experience_margin_bottom,
      marginLeft: experience_margin_horizontal,
      marginRight: experience_margin_horizontal,
    },
    experienceItem: {
      marginBottom: experience_item_spacing,
    },
    experienceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    companyName: {
      fontSize: document_font_size,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    jobTitle: {
      fontSize: document_font_size,
      color: '#111827',
    },
    companyLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      fontSize: document_font_size,
      color: '#374151',
    },
    dateRange: {
      fontSize: document_font_size,
      color: '#111827',
      textAlign: 'right',
    },
    bulletPoint: {
      fontSize: document_font_size,
      marginBottom: experience_item_spacing,
      color: '#111827',
      marginLeft: 8,
      paddingLeft: 8,
      flexDirection: 'row',
    },
    bulletText: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      display: 'flex',
    },
    bulletTextContent: {
      flex: 1,
    },
    // Projects section
    projectsSection: {
      marginTop: projects_margin_top,
      marginBottom: projects_margin_bottom,
      marginLeft: projects_margin_horizontal,
      marginRight: projects_margin_horizontal,
    },
    projectItem: {
      marginBottom: projects_item_spacing,
    },
    projectHeader: {
      flexDirection: 'column',
      marginBottom: 4,
    },
    projectHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 2,
    },
    projectHeaderRight: {
      flexDirection: 'row',
      gap: 8,
    },
    projectTitle: {
      fontSize: document_font_size,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    projectTechnologies: {
      fontSize: document_font_size,
      color: '#374151',
      fontFamily: 'Helvetica-Bold',
      marginBottom: 0,
    },
    projectDescription: {
      fontSize: document_font_size,
      color: '#111827',
    },
    projectLinks: {
      fontSize: document_font_size,
      color: '#374151',
      textAlign: 'right',
    },
    // Education section
    educationSection: {
      marginTop: education_margin_top,
      marginBottom: education_margin_bottom,
      marginLeft: education_margin_horizontal,
      marginRight: education_margin_horizontal,
    },
    educationItem: {
      marginBottom: education_item_spacing,
    },
    educationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    schoolName: {
      fontSize: document_font_size,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    degree: {
      fontSize: document_font_size,
      color: '#111827',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 0,
      right: 0,
      height: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerImage: {
      width: `${footer_width}%`,
      height: 'auto',
    },
  });
}
