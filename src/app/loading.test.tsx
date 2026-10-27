import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Loading from './loading';

describe('app loading skeleton', () => {
  it('renders the dashboard skeleton shell', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('main')).not.toBeNull();
    expect(container.querySelector('header')).not.toBeNull();
    // Profile, base-resume and tailored-resume skeleton cards.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(20);
  });
});
