import { cleanup, render, screen } from '@testing-library/react';
import Icon from './Icon';

describe('Icon sprite', () => {
  afterEach(() => {
    cleanup();
    document.getElementById('ketcher-icon-sprite')?.remove();
  });

  it('inserts one shared sprite and references the requested symbols', () => {
    const { rerender } = render(
      <Icon name="about" dataTestId="test-icon" title="About" />,
    );

    expect(document.querySelectorAll('#ketcher-icon-sprite')).toHaveLength(1);
    expect(screen.getByTestId('test-icon')).toHaveAttribute(
      'viewBox',
      '0 0 24 24',
    );
    expect(
      screen.getByTestId('test-icon').querySelector('use'),
    ).toHaveAttribute('href', '#ketcher-icon-about');
    expect(screen.getByTitle('About')).toBeInTheDocument();

    rerender(<Icon name="search" dataTestId="test-icon" />);

    expect(document.querySelectorAll('#ketcher-icon-sprite')).toHaveLength(1);
    expect(
      screen.getByTestId('test-icon').querySelector('use'),
    ).toHaveAttribute('href', '#ketcher-icon-search');
  });
});
