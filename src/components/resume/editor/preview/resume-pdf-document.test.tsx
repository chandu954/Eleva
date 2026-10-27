// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * @react-pdf/renderer needs a browser/canvas-like runtime that jsdom does not
 * provide. Render every primitive as a lightweight DOM stand-in instead, while
 * exposing the resolved style object so layout values can be asserted.
 */
vi.mock('@react-pdf/renderer', () => {
  type PdfProps = {
    children?: ReactNode;
    style?: Record<string, unknown>;
    size?: string;
    src?: string;
  };

  const View = ({ children, style }: PdfProps) => (
    <div data-pdf="view" data-style={style ? JSON.stringify(style) : undefined}>
      {children}
    </div>
  );

  const Text = ({ children, style }: PdfProps) => (
    <span
      data-testid="pdf-text"
      data-font-family={style?.fontFamily as string | undefined}
      data-font-size={style?.fontSize as number | undefined}
      data-margin-horizontal={style?.marginHorizontal as number | undefined}
      data-style={style ? JSON.stringify(style) : undefined}
    >
      {children}
    </span>
  );

  return {
    Document: ({ children }: PdfProps) => <div data-testid="pdf-document">{children}</div>,
    Page: ({ children, style, size }: PdfProps) => (
      <div data-testid="pdf-page" data-size={size} data-style={JSON.stringify(style)}>
        {children}
      </div>
    ),
    View,
    Text,
    Link: ({ children, src }: PdfProps) => <a href={src}>{children}</a>,
    Image: ({ src, style }: PdfProps) => (
      // eslint-disable-next-line @next/next/no-img-element -- test-only stand-in for the PDF primitive
      <img src={src} alt="" data-testid="pdf-image" data-width={style?.width as string | undefined} />
    ),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
  };
});

import { ResumePDFDocument } from './resume-pdf-document';
import type { DocumentSettings, Resume } from '@/lib/types';

const documentSettings: DocumentSettings = {
  document_font_size: 11,
  document_line_height: 1.4,
  document_margin_vertical: 50,
  document_margin_horizontal: 40,
  header_name_size: 30,
  header_name_bottom_spacing: 12,
  skills_margin_top: 3,
  skills_margin_bottom: 3,
  skills_margin_horizontal: 1,
  skills_item_spacing: 3,
  experience_margin_top: 4,
  experience_margin_bottom: 4,
  experience_margin_horizontal: 1,
  experience_item_spacing: 5,
  projects_margin_top: 6,
  projects_margin_bottom: 6,
  projects_margin_horizontal: 1,
  projects_item_spacing: 6,
  education_margin_top: 7,
  education_margin_bottom: 7,
  education_margin_horizontal: 1,
  education_item_spacing: 7,
  show_ubc_footer: true,
  footer_width: 60,
};

const populatedResume = {
  id: 'resume-1',
  user_id: 'user-1',
  name: 'Ada Lovelace Resume',
  target_role: 'Software Engineer',
  is_base_resume: true,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '555-0100',
  location: 'London, UK',
  website: 'ada.dev',
  linkedin_url: 'linkedin.com/in/ada',
  github_url: 'https://github.com/ada',
  work_experience: [
    {
      company: '**Acme**',
      position: 'Senior Engineer',
      location: 'Remote',
      date: '2024 - Present',
      description: ['Built **fast** systems', 'Shipped 3 products'],
    },
    {
      company: 'Beta Corp',
      position: 'Analyst',
      date: '2020 - 2022',
      description: ['Did analysis'],
    },
  ],
  education: [
    {
      school: '**State University**',
      degree: 'BSc',
      field: 'Computer Science',
      date: '2018 - 2022',
      achievements: ['Graduated with honors', 'Won **hackathon**'],
    },
    {
      school: 'Other College',
      degree: 'BA',
      field: 'History',
      date: '2012 - 2016',
    },
  ],
  skills: [
    { category: 'Languages', items: ['TypeScript', 'Go'] },
    { category: 'Tools', items: ['Git', 'Docker'] },
  ],
  projects: [
    {
      name: '**Scheduler**',
      description: ['Built a **scheduler**'],
      date: '2023',
      technologies: ['**Rust**', 'Postgres'],
      url: 'https://scheduler.dev',
      github_url: 'github.com/ada/scheduler',
    },
    {
      name: 'Tiny Tool',
      description: ['Just a tool'],
    },
  ],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  document_settings: documentSettings,
  has_cover_letter: false,
} as Resume;

const emptyResume = {
  ...populatedResume,
  first_name: 'Grace',
  last_name: 'Hopper',
  email: '',
  phone_number: undefined,
  location: undefined,
  website: undefined,
  linkedin_url: undefined,
  github_url: undefined,
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  document_settings: undefined,
  has_cover_letter: false,
} as Resume;

function pageStyle() {
  return JSON.parse(screen.getByTestId('pdf-page').getAttribute('data-style') ?? '{}');
}

describe('ResumePDFDocument', () => {
  it('renders every populated section, contact link, and the styled footer', () => {
    render(<ResumePDFDocument resume={populatedResume} />);

    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-size', 'LETTER');
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    // Contact details and protocol normalization.
    expect(screen.getByText('London, UK')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ada@example.com' })).toHaveAttribute(
      'href',
      'mailto:ada@example.com',
    );
    expect(screen.getByRole('link', { name: 'ada.dev' })).toHaveAttribute(
      'href',
      'https://ada.dev',
    );
    expect(screen.getByRole('link', { name: 'linkedin.com/in/ada' })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/ada',
    );
    expect(screen.getByRole('link', { name: 'https://github.com/ada' })).toHaveAttribute(
      'href',
      'https://github.com/ada',
    );

    // Five contact separators plus one before the experience location.
    expect(
      document.querySelectorAll('[data-margin-horizontal="2"]'),
    ).toHaveLength(6);

    // Skills.
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Languages:')).toBeInTheDocument();
    expect(screen.getByText('TypeScript, Go')).toBeInTheDocument();
    expect(screen.getByText('Tools:')).toBeInTheDocument();
    expect(screen.getByText('Git, Docker')).toBeInTheDocument();

    // Experience, including the entry without a location and markdown extraction.
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('2024 - Present')).toBeInTheDocument();
    expect(screen.getByText('Beta Corp')).toBeInTheDocument();
    expect(screen.getByText('Analyst')).toBeInTheDocument();
    expect(screen.getByText('2020 - 2022')).toBeInTheDocument();
    const boldFast = screen.getByText('fast');
    expect(boldFast).toHaveAttribute('data-font-family', 'Helvetica-Bold');
    expect(screen.getByText('Shipped 3 products')).toBeInTheDocument();

    // Projects, links, technologies and the entry without optional fields.
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Scheduler')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Rust, Postgres')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://scheduler.dev' })).toHaveAttribute(
      'href',
      'https://scheduler.dev',
    );
    expect(
      screen.getByRole('link', { name: 'github.com/ada/scheduler' }),
    ).toHaveAttribute('href', 'https://github.com/ada/scheduler');
    expect(screen.getByText('Tiny Tool')).toBeInTheDocument();
    expect(screen.getByText('Just a tool')).toBeInTheDocument();

    // Education, with and without achievements.
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('State University')).toBeInTheDocument();
    expect(screen.getByText('BSc Computer Science')).toBeInTheDocument();
    expect(screen.getByText('2018 - 2022')).toBeInTheDocument();
    expect(screen.getByText('Graduated with honors')).toBeInTheDocument();
    expect(screen.getByText('hackathon')).toHaveAttribute(
      'data-font-family',
      'Helvetica-Bold',
    );
    expect(screen.getByText('Other College')).toBeInTheDocument();
    expect(screen.getByText('BA History')).toBeInTheDocument();

    // Footer image uses the configured width.
    const footer = screen.getByTestId('pdf-image');
    expect(footer).toHaveAttribute('src', '/images/ubc-science-footer.png');
    expect(footer).toHaveAttribute('data-width', '60%');
  });

  it('applies custom document settings to the page and header', () => {
    render(<ResumePDFDocument resume={populatedResume} />);

    expect(pageStyle()).toMatchObject({
      paddingTop: 50,
      paddingBottom: 78,
      paddingLeft: 40,
      paddingRight: 40,
      fontSize: 11,
      lineHeight: 1.4,
    });
    const name = screen.getByText('Ada Lovelace');
    expect(name).toHaveAttribute('data-font-size', '30');
    expect(name).toHaveAttribute('data-font-family', 'Helvetica-Bold');
  });

  it('uses default styling and hides the footer when no settings are provided', () => {
    render(<ResumePDFDocument resume={emptyResume} />);

    expect(pageStyle()).toMatchObject({
      paddingTop: 36,
      paddingBottom: 64,
      paddingLeft: 36,
      paddingRight: 36,
      fontSize: 10,
      lineHeight: 1.5,
    });
    expect(screen.getByText('Grace Hopper')).toHaveAttribute('data-font-size', '24');
    expect(screen.queryByTestId('pdf-image')).not.toBeInTheDocument();
  });

  it('renders an empty resume without section headings or contact links', () => {
    render(<ResumePDFDocument resume={emptyResume} />);

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
    expect(screen.queryByText('Experience')).not.toBeInTheDocument();
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    expect(screen.queryByText('Education')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(document.querySelectorAll('[data-margin-horizontal="2"]')).toHaveLength(0);
  });

  it('renders partial contact details without stray separators', () => {
    const resume = {
      ...emptyResume,
      location: 'Arlington',
      phone_number: '555-0199',
    } as Resume;

    render(<ResumePDFDocument resume={resume} />);

    expect(screen.getByText('Arlington')).toBeInTheDocument();
    expect(screen.getByText('555-0199')).toBeInTheDocument();
    // Only the location emits a separator; the phone is last in the row.
    expect(document.querySelectorAll('[data-margin-horizontal="2"]')).toHaveLength(1);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('honors show_ubc_footer false and the default footer width', () => {
    const hidden = {
      ...populatedResume,
      document_settings: { ...documentSettings, show_ubc_footer: false },
    } as Resume;
    const { rerender } = render(<ResumePDFDocument resume={hidden} />);
    expect(screen.queryByTestId('pdf-image')).not.toBeInTheDocument();

    const defaultWidth = {
      ...populatedResume,
      document_settings: {
        ...documentSettings,
        show_ubc_footer: true,
        footer_width: undefined,
      },
    } as Resume;
    rerender(<ResumePDFDocument resume={defaultWidth} />);

    expect(screen.getByTestId('pdf-image')).toHaveAttribute('data-width', '95%');
  });

  it('re-renders only when the resume or variant changes', () => {
    const { rerender } = render(<ResumePDFDocument resume={populatedResume} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    // Same resume reference: the custom memo comparator skips the render.
    rerender(<ResumePDFDocument resume={populatedResume} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    // A different variant is a comparator hit.
    rerender(<ResumePDFDocument resume={populatedResume} variant="tailored" />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    // A new resume object re-renders with new content and styles.
    const updated = {
      ...populatedResume,
      first_name: 'Grace',
      document_settings: { ...documentSettings, header_name_size: 18 },
    } as Resume;
    rerender(<ResumePDFDocument resume={updated} variant="tailored" />);

    const name = screen.getByText('Grace Lovelace');
    expect(name).toHaveAttribute('data-font-size', '18');
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });
});
