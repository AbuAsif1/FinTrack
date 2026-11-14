/**
 * TC-UI-008 — Open a modal, press Tab repeatedly, then Escape.
 * Expected: Escape fires onClose; modal content is rendered when open.
 *
 * Note: jsdom does not implement the native <dialog> showModal() / focus trap.
 * We test the React-layer keyboard handler (Escape → onClose) and the
 * rendering guard (open=false → null) which are the behaviours the app owns.
 * Browser-native focus-trap inside <dialog> is a platform concern tested
 * in E2E (TC-UI-008 E2E extension) rather than a component test.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

// jsdom does not implement <dialog> showModal/close — polyfill minimally.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

describe('TC-UI-008 Modal keyboard and rendering behaviour', () => {
  it('renders title and children when open=true', () => {
    render(
      <Modal open title="Add Income" onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByRole('heading', { name: 'Add Income' })).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders nothing when open=false', () => {
    const { container } = render(
      <Modal open={false} title="Add Income" onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('Escape keydown fires onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Delete Entry" onClose={onClose}>
        <p>Are you sure?</p>
      </Modal>,
    );
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('non-Escape keydown does not fire onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Some Modal" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
