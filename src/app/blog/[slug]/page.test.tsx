// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const blogMock = vi.hoisted(() => ({
  getAllPosts: vi.fn(),
  getPostBySlug: vi.fn(),
}));

const compileMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());

vi.mock('next-mdx-remote/rsc', () => ({
  compileMDX: compileMock,
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/lib/blog', () => blogMock);

vi.mock('@/lib/html-safety', () => ({
  toSafeJsonScript: (value: unknown) => JSON.stringify(value),
}));

vi.mock('@/components/blog/mdx-components', () => ({
  mdxComponents: {},
}));

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({
      href,
      children,
      ...rest
    }: {
      href?: string;
      children?: React.ReactNode;
    } & Record<string, unknown>) => React.createElement('a', { href, ...rest }, children),
  };
});

import BlogPostPage, {
  generateMetadata,
  generateStaticParams,
} from './page';

const post = {
  slug: 'tailor-your-resume',
  content: 'word '.repeat(450).trim(),
  frontMatter: {
    title: 'Tailor your resume',
    description: 'A practical guide to tailoring your resume for every role.',
    date: '2026-01-15',
  },
};

const params = Promise.resolve({ slug: post.slug });

describe('blog post page', () => {
  beforeEach(() => {
    blogMock.getAllPosts.mockReset();
    blogMock.getPostBySlug.mockReset();
    compileMock.mockReset();
    notFoundMock.mockReset();
    compileMock.mockResolvedValue({ content: <div data-testid="mdx-content">compiled mdx</div> });
  });

  it('lists every post slug for static params', async () => {
    blogMock.getAllPosts.mockReturnValue([
      { slug: 'one' },
      { slug: 'two' },
    ]);

    expect(await generateStaticParams()).toEqual([{ slug: 'one' }, { slug: 'two' }]);
  });

  it('builds article metadata for an existing post', async () => {
    blogMock.getPostBySlug.mockReturnValue(post);

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe('Tailor your resume');
    expect(metadata.description).toBe(post.frontMatter.description);
    expect(metadata.alternates).toEqual({ canonical: 'https://eleva.app/blog/tailor-your-resume' });
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2026-01-15T00:00:00.000Z',
      authors: ['Eleva Team'],
      images: [expect.objectContaining({ url: '/og.webp' })],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', creator: '@eleva' });
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { 'max-image-preview': 'large' },
    });
  });

  it('returns empty metadata when the post is missing', async () => {
    blogMock.getPostBySlug.mockReturnValue(null);

    expect(await generateMetadata({ params })).toEqual({});
  });

  it('renders the article, reading time and structured data', async () => {
    blogMock.getPostBySlug.mockReturnValue(post);

    const { container } = render(await BlogPostPage({ params }));

    expect(blogMock.getPostBySlug).toHaveBeenCalledWith('tailor-your-resume');
    expect(compileMock).toHaveBeenCalledWith({
      source: post.content,
      components: {},
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Tailor your resume' })).toBeInTheDocument();
    expect(screen.getByText(post.frontMatter.description)).toBeInTheDocument();
    expect(screen.getByText('January 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('3 min read')).toBeInTheDocument();
    expect(screen.getByTestId('mdx-content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to blog/i })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: /Get Started Free/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Read More Articles/i })).toHaveAttribute(
      'href',
      '/blog',
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const structured = JSON.parse(script!.textContent ?? '{}');
    expect(structured).toMatchObject({
      '@type': 'Article',
      headline: 'Tailor your resume',
      wordCount: 450,
      timeRequired: 'PT3M',
      mainEntityOfPage: { '@id': 'https://eleva.app/blog/tailor-your-resume' },
    });
  });

  it('calls notFound when the slug cannot be resolved', async () => {
    const error = new Error('NEXT_NOT_FOUND');
    blogMock.getPostBySlug.mockImplementation(() => {
      throw error;
    });
    notFoundMock.mockImplementation(() => {
      throw error;
    });

    await expect(BlogPostPage({ params })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
