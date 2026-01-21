/**
 * ScalingTips Component Tests
 */

import { render } from '@testing-library/react';
import ScalingTips from './ScalingTips';

describe('ScalingTips', () => {
  it('is expanded by default for non-AI tips', () => {
    const { container } = render(
      <ScalingTips tips={['Tip 1']} isAIPowered={false} />
    );

    const details = container.querySelector('details') as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details!.open).toBe(true);
  });

  it('is collapsed by default for AI tips', () => {
    const { container } = render(
      <ScalingTips tips={['AI tip']} isAIPowered={true} />
    );

    const details = container.querySelector('details') as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
  });

  it('stays collapsed by default when new AI tips arrive', () => {
    const { container, rerender } = render(
      <ScalingTips tips={['AI tip 1']} isAIPowered={true} />
    );

    rerender(<ScalingTips tips={['AI tip 2']} isAIPowered={true} />);

    const details = container.querySelector('details') as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
  });
});

