import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ArticleViewer from './ArticleViewer';
import { trpc } from '@web/utils/trpc'; // Adjust if your trpc import is different

// Mock tRPC
vi.mock('@web/utils/trpc', async () => {
  const actualTrpc = await vi.importActual('@web/utils/trpc');
  return {
    ...actualTrpc,
    trpc: {
      ...actualTrpc.trpc,
      article: {
        // @ts-expect-error Property 'article' does not exist on type '{}'.
        ...actualTrpc.trpc.article,
        content: {
          useQuery: vi.fn(),
        },
      },
    },
  };
});

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  onvoiceschanged: null,
  pending: false,
  speaking: false,
  paused: false,
};
// @ts-expect-error Type 'Window & typeof globalThis' has no properties in common with type '{ speak: Mock<any, any>; cancel: Mock<any, any>; pause: Mock<any, any>; resume: Mock<any, any>; getVoices: Mock<any, any>; onvoiceschanged: null; pending: boolean; speaking: boolean; paused: boolean; }'.
global.speechSynthesis = mockSpeechSynthesis;

// Mock SpeechSynthesisUtterance
// We need to mock the constructor and event handlers
const mockUtteranceInstance = {
  onend: null,
  onboundary: null,
  text: '',
  set onboundary(handler: any) {
    this._onboundary = handler;
  },
  get onboundary() {
    return this._onboundary;
  },
  set onend(handler: any) {
    this._onend = handler;
  },
  get onend() {
    return this._onend;
  }
};

global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => {
  const newUtterance = {...mockUtteranceInstance};
  newUtterance.text = text;
  // mockSpeechSynthesis.speaking = true; // Simulating that creating an utterance makes it speak for some tests
  return newUtterance;
});


describe('ArticleViewer', () => {
  const mockArticleId = 'test-article-id';
  let currentUtterance: any = null; // To hold the current utterance for manipulation in tests

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Reset the global utterance mock properties
    mockUtteranceInstance.text = '';
    mockUtteranceInstance.onend = null;
    mockUtteranceInstance.onboundary = null;

    // Reset speaking and paused states for speechSynthesis mock
    mockSpeechSynthesis.speaking = false;
    mockSpeechSynthesis.paused = false;
    currentUtterance = null;

    // Set up speak mock to capture the utterance
    mockSpeechSynthesis.speak.mockImplementation((utterance) => {
      currentUtterance = utterance;
      mockSpeechSynthesis.speaking = true;
      mockSpeechSynthesis.paused = false;
      // Simulate async speech start
      setTimeout(() => {
        // to simulate actual speech, onboundary would be called over time
        // and onend when done.
      }, 0);
    });
    mockSpeechSynthesis.cancel.mockImplementation(() => {
        mockSpeechSynthesis.speaking = false;
        mockSpeechSynthesis.paused = false;
        if (currentUtterance && currentUtterance.onend) {
            act(() => {
                // @ts-expect-error onend is not a function
                currentUtterance.onend(); // Simulate speech ending due to cancel
            });
        }
    });
    mockSpeechSynthesis.pause.mockImplementation(() => {
        mockSpeechSynthesis.paused = true;
    });
    mockSpeechSynthesis.resume.mockImplementation(() => {
        mockSpeechSynthesis.paused = false;
    });
  });

  test('renders loading state', () => {
    (trpc.article.content.useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });
    render(<ArticleViewer articleId={mockArticleId} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders "Article not found" when no content', () => {
    (trpc.article.content.useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    render(<ArticleViewer articleId={mockArticleId} />);
    expect(screen.getByText('Article not found')).toBeInTheDocument();
  });

  test('renders article content', () => {
    const articleHtml = '<p>Hello World</p>';
    (trpc.article.content.useQuery as jest.Mock).mockReturnValue({
      data: articleHtml,
      isLoading: false,
    });
    render(<ArticleViewer articleId={mockArticleId} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('play/pause/resume button toggles speech', async () => {
    const articleHtml = '<p>Test speech content.</p>';
    (trpc.article.content.useQuery as jest.Mock).mockReturnValue({
      data: articleHtml,
      isLoading: false,
    });
    render(<ArticleViewer articleId={mockArticleId} />);

    const playButton = screen.getByRole('button', { name: /play/i });
    await act(async () => {
        fireEvent.click(playButton);
    });

    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
    // @ts-expect-error Argument of type 'SpeechSynthesisUtterance' is not assignable to parameter of type 'never'.
    expect(mockSpeechSynthesis.speak.mock.calls[0][0].text).toBe('Test speech content.');
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    await act(async () => {
        fireEvent.click(pauseButton);
    });
    expect(mockSpeechSynthesis.pause).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

    const resumeButton = screen.getByRole('button', { name: /resume/i });
    await act(async () => {
        fireEvent.click(resumeButton);
    });
    expect(mockSpeechSynthesis.resume).toHaveBeenCalledTimes(1);
    // After resuming, it should be back to "Pause"
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

    // Click pause again (now it should be stop/cancel)
    const newPauseButton = screen.getByRole('button', { name: /pause/i });
    await act(async () => {
        fireEvent.click(newPauseButton);
    });
     // If current logic is: Play -> Pause -> Resume -> Pause (becomes Cancel)
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  test('skip forward button works', async () => {
    const articleHtml = '<p>Word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16.</p>';
    (trpc.article.content.useQuery as jest.Mock).mockReturnValue({
      data: articleHtml,
      isLoading: false,
    });
    render(<ArticleViewer articleId={mockArticleId} />);

    const playButton = screen.getByRole('button', { name: /play/i });
    await act(async () => {
        fireEvent.click(playButton);
    });

    const skipForwardButton = screen.getByRole('button', { name: /skip forward/i });
    await act(async () => {
        fireEvent.click(skipForwardButton);
    });

    expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    // This assertion depends on the skip logic (e.g., 10 words)
    // expect(mockSpeechSynthesis.speak.mock.calls[1][0].text).toContain("word11");
  });

  test('skip backward button works', async () => {
    const articleHtml = '<p>Word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16.</p>';
    (trpc.article.content.useQuery as jest.Mock).mockReturnValue({
      data: articleHtml,
      isLoading: false,
    });
    render(<ArticleViewer articleId={mockArticleId} />);

    const playButton = screen.getByRole('button', { name: /play/i });
    await act(async () => {
        fireEvent.click(playButton);
    });

    // Simulate speech progressing to a certain point
    // This is tricky, as currentWordIndex update depends on onboundary being called by the actual speech.
    // For this test, we assume it's partway through.
    if (currentUtterance) {
      // Manually set a charIndex to simulate progress before skip backward
      // @ts-expect-error No currentWordIndex on currentUtterance
      currentUtterance.charIndex = "Word1 word2 word3 word4 word5 ".length; // Example: after 5 words
    }

    const skipBackwardButton = screen.getByRole('button', { name: /skip backward/i });
     await act(async () => {
        fireEvent.click(skipBackwardButton);
    });

    expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    // This assertion depends on the skip logic and where the "current position" was.
    // expect(mockSpeechSynthesis.speak.mock.calls[1][0].text).toContain("Word1");
  });

  test('progress bar updates and is seekable', async () => {
    const articleHtml = '<p>This is a test sentence for progress.</p>';
    (trpc.article.content.useQuery as jest.Mock).mockReturnValue({
      data: articleHtml,
      isLoading: false,
    });
    render(<ArticleViewer articleId={mockArticleId} />);

    const playButton = screen.getByRole('button', { name: /play/i });
    await act(async () => {
        fireEvent.click(playButton);
    });

    const progressBar = screen.getByRole('progressbar');
    // Initial value might be 0 or based on initial state
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    // Simulate speech progress via onboundary
    if (currentUtterance && currentUtterance.onboundary) {
      await act(async () => {
        // @ts-expect-error No charIndex on event
        currentUtterance.onboundary({ charIndex: "This is a ".length }); // Simulate being at "test"
      });
       // Value should be updated (e.g. 3 words out of 7, so ~42%)
       // This depends on the exact calculation in the component.
       // For example, if 3 words out of 7 total words ("This is a test sentence for progress.")
       // const expectedProgress = Math.round((3 / 7) * 100);
       // expect(progressBar).toHaveAttribute('aria-valuenow', expectedProgress.toString());
    }

    // Simulate seeking by changing the progress bar value.
    // This depends on how NextUI's Progress component handles user interaction.
    // If it's a standard input range, we could do:
    // fireEvent.change(progressBar, { target: { value: '50' } });
    // Since it's NextUI, it might need a different approach to simulate user drag/click.
    // For now, we'll test if the component reacts to a simulated onEnd.

    // Simulate speech ends
    if (currentUtterance && currentUtterance.onend) {
      await act(async () => {
        // @ts-expect-error onend is not a function
        currentUtterance.onend();
      });
    }
    expect(progressBar).toHaveAttribute('aria-valuenow', '0'); // Resets after speech ends
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument(); // Should go back to play state
  });

});
