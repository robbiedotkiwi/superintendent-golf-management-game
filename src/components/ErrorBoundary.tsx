import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearSave } from '../engine/save.ts';

type Props = { children?: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-[var(--paint,#e8e4da)]">
        <h1 className="font-condensed text-5xl font-bold">Greenkeeper hit a snag</h1>
        <p className="mt-4 text-lg text-[var(--sand,#d8c9a8)]">{this.state.error.message || 'The game stopped.'}</p>
        <button
          type="button"
          className="mt-8 bg-[var(--machine-orange,#d9541e)] px-5 py-3 text-left text-lg font-semibold"
          onClick={() => {
            clearSave();
            window.location.reload();
          }}
        >
          New game
        </button>
      </main>
    );
  }
}
